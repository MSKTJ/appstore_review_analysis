const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * レビューの感情分析を実行
   * @param {Array} reviews - レビューデータの配列
   * @returns {Promise<Array>} 感情分析結果付きのレビューデータ
   */
  async analyzeSentiment(reviews) {
    try {
      console.log(`Starting sentiment analysis for ${reviews.length} reviews`);
      
      const batchSize = 20; // バッチサイズを増やして効率化
      const results = [];
      
      for (let i = 0; i < reviews.length; i += batchSize) {
        const batch = reviews.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(reviews.length/batchSize)}`);
        
        try {
          const batchResults = await this.analyzeSentimentInBatch(batch);
          results.push(...batchResults);
        } catch (error) {
          console.error(`Error processing batch: ${error.message}. Falling back to single review analysis for this batch.`);
          // バッチ処理に失敗した場合、個別にフォールバック処理を行う
          for (const review of batch) {
            const fallbackAnalysis = this.fallbackSentimentAnalysis(review);
            results.push({
              ...review,
              analysis: {
                ...fallbackAnalysis,
                analyzedAt: new Date().toISOString(),
                error: error.message,
                fallback: true
              }
            });
          }
        }
        
        // API制限を避けるため少し待機
        if (i + batchSize < reviews.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`Sentiment analysis completed. ${results.length} reviews processed`);
      return results;
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      throw new Error(`Sentiment analysis failed: ${error.message}`);
    }
  }

  /**
   * 複数レビューの感情分析（バッチ処理）
   * @param {Array} reviews - レビューデータの配列
   * @returns {Promise<Array>} 感情分析結果付きレビュー
   */
  async analyzeSentimentInBatch(reviews) {
    const prompt = `
以下のApp Storeレビューを詳細に分析してください。各レビューに対して、星評価と内容の両方を考慮して感情を判定し、指定されたJSON形式の配列で回答してください。

レビューデータ:
${JSON.stringify(reviews.map(r => ({id: r.id, title: r.title, content: r.content, rating: r.rating})), null, 2)}

以下の形式のJSON配列で回答してください：
[
  {
    "id": "レビューID",
    "sentiment": "positive" | "negative" | "neutral",
    "sentimentScore": 0.0から1.0の数値（1.0が最もポジティブ）,
    "keywords": ["キーワード1", "キーワード2", ...],
    "topics": ["トピック1", "トピック2", ...],
    "issues": ["問題点1", "問題点2", ...],
    "praises": ["称賛点1", "称賛点2", ...],
    "summary": "レビューの要約（50文字以内）"
  },
  ...
]

感情分析の詳細基準：
- positive: 星4-5で内容が肯定的。「良い」「素晴らしい」「満足」など。
- negative: 星1-2で内容が否定的。「悪い」「使えない」「バグ」など。
- neutral: 星3、または内容が中立的。

sentimentScore算出基準：
- 星1: 0.0-0.2, 星2: 0.2-0.4, 星3: 0.4-0.6, 星4: 0.6-0.8, 星5: 0.8-1.0
- 内容の感情表現でスコアを微調整。

必ずレビューIDを含め、全てのレビューに対して分析結果を返してください。
`;

    try {
      console.log('Sending prompt to Gemini (Sentiment Analysis):', prompt);
      const timeout = new Promise((resolve, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out after 10 minutes')), 600000)
      );
      const result = await Promise.race([this.model.generateContent(prompt), timeout]);
      const response = await result.response;
      const text = response.text();
      console.log('Raw response from Gemini (Sentiment Analysis):', text);
      
      let analysisResults;
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('No JSON array found in response');
        }
        analysisResults = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn('Failed to parse JSON array from response:', parseError.message);
        console.warn('Raw response:', text);
        throw new Error('Failed to parse analysis results.');
      }

      // 元のレビューと分析結果をマッピング
      return reviews.map(review => {
        const analysis = analysisResults.find(res => res.id === review.id);
        if (analysis) {
          // 必須フィールドの検証と補完
          if (!analysis.sentiment || !['positive', 'negative', 'neutral'].includes(analysis.sentiment)) {
            const fallback = this.fallbackSentimentAnalysis(review);
            analysis.sentiment = fallback.sentiment;
            analysis.sentimentScore = fallback.sentimentScore;
          }
          return {
            ...review,
            analysis: {
              ...analysis,
              analyzedAt: new Date().toISOString()
            }
          };
        }
        // 分析結果が見つからない場合はフォールバック
        return {
          ...review,
          analysis: {
            ...this.fallbackSentimentAnalysis(review),
            analyzedAt: new Date().toISOString(),
            error: 'Analysis result not found in batch response.',
            fallback: true
          }
        };
      });

    } catch (error) {
      console.error('Error in batch sentiment analysis:', error);
      throw error; // エラーを呼び出し元に伝播させる
    }
  }

  /**
   * フォールバック感情分析（星評価とキーワードベース）
   * @param {Object} review - レビューデータ
   * @returns {Object} 基本的な感情分析結果
   */
  fallbackSentimentAnalysis(review) {
    const rating = review.rating || 3;
    const title = (review.title || '').toLowerCase();
    const content = (review.content || '').toLowerCase();
    const fullText = title + ' ' + content;
    
    // 基本的な感情判定（星評価ベース）
    let sentiment = 'neutral';
    let sentimentScore = 0.5;
    
    if (rating >= 4) {
      sentiment = 'positive';
      sentimentScore = rating === 5 ? 0.9 : 0.7;
    } else if (rating <= 2) {
      sentiment = 'negative';
      sentimentScore = rating === 1 ? 0.1 : 0.3;
    } else {
      sentiment = 'neutral';
      sentimentScore = 0.5;
    }
    
    // 詳細なキーワード辞書
    const positiveKeywords = {
      '良い': 0.3, '素晴らしい': 0.4, 'おすすめ': 0.3, '満足': 0.3, '便利': 0.2,
      '使いやすい': 0.3, '快適': 0.3, '最高': 0.4, '完璧': 0.4, '感謝': 0.2,
      '気に入': 0.2, '愛用': 0.3, '重宝': 0.3, '助かる': 0.2, 'すごい': 0.2,
      '優秀': 0.3, '安定': 0.2, 'スムーズ': 0.2, '簡単': 0.2, '分かりやすい': 0.2,
      'good': 0.2, 'great': 0.3, 'excellent': 0.4, 'amazing': 0.4, 'perfect': 0.4,
      'love': 0.3, 'like': 0.2, 'awesome': 0.3, 'fantastic': 0.4, 'wonderful': 0.4
    };
    
    const negativeKeywords = {
      '悪い': 0.3, '最悪': 0.4, '使えない': 0.4, '不便': 0.3, 'バグ': 0.3,
      'エラー': 0.3, '落ちる': 0.4, '重い': 0.2, '遅い': 0.2, '不満': 0.3,
      'ダメ': 0.3, 'クソ': 0.4, 'ゴミ': 0.4, '最低': 0.4, 'ひどい': 0.3,
      '困る': 0.2, '問題': 0.2, '不具合': 0.3, 'フリーズ': 0.3, 'クラッシュ': 0.4,
      '使いにくい': 0.3, '分からない': 0.2, '面倒': 0.2, 'うざい': 0.3, 'イライラ': 0.3,
      'bad': 0.3, 'terrible': 0.4, 'awful': 0.4, 'horrible': 0.4, 'worst': 0.4,
      'hate': 0.4, 'sucks': 0.4, 'useless': 0.4, 'broken': 0.4, 'annoying': 0.3
    };
    
    const functionalKeywords = {
      'アプリ': 'app', '機能': 'feature', 'UI': 'interface', 'UX': 'experience',
      '更新': 'update', 'バージョン': 'version', 'デザイン': 'design', '操作': 'operation',
      '画面': 'screen', 'ボタン': 'button', 'メニュー': 'menu', '設定': 'settings',
      '通知': 'notification', 'ログイン': 'login', '同期': 'sync', 'データ': 'data',
      '速度': 'speed', 'パフォーマンス': 'performance', 'セキュリティ': 'security'
    };
    
    // キーワードベースでスコア調整
    let positiveScore = 0;
    let negativeScore = 0;
    const foundKeywords = [];
    const foundTopics = [];
    
    // ポジティブキーワードの検出
    Object.entries(positiveKeywords).forEach(([keyword, weight]) => {
      if (fullText.includes(keyword)) {
        positiveScore += weight;
        foundKeywords.push(keyword);
      }
    });
    
    // ネガティブキーワードの検出
    Object.entries(negativeKeywords).forEach(([keyword, weight]) => {
      if (fullText.includes(keyword)) {
        negativeScore += weight;
        foundKeywords.push(keyword);
      }
    });
    
    // 機能関連キーワードの検出
    Object.entries(functionalKeywords).forEach(([keyword, topic]) => {
      if (fullText.includes(keyword)) {
        foundKeywords.push(keyword);
        if (!foundTopics.includes(topic)) {
          foundTopics.push(topic);
        }
      }
    });
    
    // 感情スコアの最終調整
    const keywordDifference = positiveScore - negativeScore;
    if (Math.abs(keywordDifference) > 0.1) {
      if (keywordDifference > 0) {
        sentiment = 'positive';
        sentimentScore = Math.min(sentimentScore + keywordDifference, 1.0);
      } else {
        sentiment = 'negative';
        sentimentScore = Math.max(sentimentScore + keywordDifference, 0.0);
      }
    }
    
    // より詳細な問題点と称賛点の抽出
    const issues = [];
    const praises = [];
    
    if (sentiment === 'negative') {
      if (fullText.includes('バグ') || fullText.includes('エラー') || fullText.includes('不具合')) {
        issues.push('バグ・エラーの修正が必要');
      }
      if (fullText.includes('重い') || fullText.includes('遅い') || fullText.includes('フリーズ')) {
        issues.push('パフォーマンスの改善が必要');
      }
      if (fullText.includes('使いにくい') || fullText.includes('分からない') || fullText.includes('操作')) {
        issues.push('UI/UXの改善が必要');
      }
      if (fullText.includes('落ちる') || fullText.includes('クラッシュ')) {
        issues.push('安定性の向上が必要');
      }
      if (fullText.includes('機能') && (fullText.includes('ない') || fullText.includes('欲しい'))) {
        issues.push('機能追加の検討が必要');
      }
      if (issues.length === 0) {
        issues.push('ユーザー体験の改善が必要');
      }
    }
    
    if (sentiment === 'positive') {
      if (fullText.includes('使いやすい') || fullText.includes('簡単') || fullText.includes('分かりやすい')) {
        praises.push('優れたユーザビリティ');
      }
      if (fullText.includes('便利') || fullText.includes('重宝') || fullText.includes('助かる')) {
        praises.push('実用性の高さ');
      }
      if (fullText.includes('安定') || fullText.includes('スムーズ')) {
        praises.push('安定したパフォーマンス');
      }
      if (fullText.includes('デザイン') || fullText.includes('見た目') || fullText.includes('綺麗')) {
        praises.push('優れたデザイン');
      }
      if (fullText.includes('機能') && !fullText.includes('ない')) {
        praises.push('充実した機能');
      }
      if (praises.length === 0) {
        praises.push('全体的に良好な評価');
      }
    }
    
    // より具体的な要約を生成
    let summary = '';
    if (sentiment === 'positive') {
      summary = `★${rating} 高評価レビュー`;
      if (foundKeywords.length > 0) {
        summary += ` (${foundKeywords.slice(0, 2).join(', ')})`;
      }
    } else if (sentiment === 'negative') {
      summary = `★${rating} 改善要望`;
      if (foundKeywords.length > 0) {
        summary += ` (${foundKeywords.slice(0, 2).join(', ')})`;
      }
    } else {
      summary = `★${rating} 中立的な評価`;
    }
    
    return {
      sentiment,
      sentimentScore: parseFloat(sentimentScore.toFixed(2)),
      keywords: foundKeywords.slice(0, 8), // より多くのキーワードを保持
      topics: foundTopics.slice(0, 5),
      issues,
      praises,
      summary,
      fallbackReason: 'AI分析が利用できないため、キーワードベース分析を実行'
    };
  }

  /**
   * 問題点をクラスタリングして対策案を提案（改良版）
   * @param {Array} analyzedReviews - 分析済みレビューデータ
   * @returns {Promise<Object>} 問題分析と対策提案
   */
  async generateProblemAnalysis(analyzedReviews) {
    console.log('Starting problem analysis...');
    const startTime = Date.now();
    
    try {
      // 入力データの検証
      if (!analyzedReviews || !Array.isArray(analyzedReviews) || analyzedReviews.length === 0) {
        throw new Error('有効な分析済みレビューデータが必要です');
      }

      const negativeReviews = analyzedReviews.filter(r => 
        r.analysis && r.analysis.sentiment === 'negative'
      );
      
      console.log(`Found ${negativeReviews.length} negative reviews out of ${analyzedReviews.length} total reviews`);
      
      // ネガティブレビューがない場合
      if (negativeReviews.length === 0) {
        console.log('No negative reviews found, returning positive analysis');
        return {
          problemCategories: [],
          overallSummary: 'ネガティブなレビューが見つかりませんでした。アプリは良好な評価を受けています。',
          quickWins: ['現在の品質を維持する', 'ユーザーフィードバックの継続的な監視'],
          longTermGoals: ['更なる機能向上', 'ユーザー体験の最適化'],
          totalNegativeReviews: 0,
          totalReviews: analyzedReviews.length,
          analyzedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime
        };
      }

      // まずフォールバック分析を実行（確実に結果を得るため）
      console.log('Generating fallback analysis as baseline...');
      const fallbackResult = this.generateFallbackProblemAnalysis(analyzedReviews);
      
      // AI分析を短いタイムアウトで試行
      console.log('Attempting AI analysis with timeout...');
      let aiResult = null;
      
      try {
        aiResult = await Promise.race([
          this.performAIProblemAnalysis(negativeReviews, analyzedReviews),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI analysis timeout after 30 seconds')), 30000)
          )
        ]);
        console.log('AI analysis completed successfully');
      } catch (aiError) {
        console.warn('AI analysis failed or timed out:', aiError.message);
        aiResult = null;
      }

      // AI分析が成功した場合はそれを使用、失敗した場合はフォールバックを使用
      const finalResult = aiResult || fallbackResult;
      finalResult.processingTime = Date.now() - startTime;
      finalResult.usedAI = !!aiResult;
      
      console.log(`Problem analysis completed in ${finalResult.processingTime}ms using ${aiResult ? 'AI' : 'fallback'} method`);
      return finalResult;

    } catch (error) {
      console.error('Error in problem analysis:', error);
      // 最終的なフォールバック
      return this.generateFallbackProblemAnalysis(analyzedReviews, error.message);
    }
  }

  /**
   * AI問題分析の実行（タイムアウト対応）
   * @param {Array} negativeReviews - ネガティブレビュー
   * @param {Array} analyzedReviews - 全分析済みレビュー
   * @returns {Promise<Object>} AI分析結果
   */
  async performAIProblemAnalysis(negativeReviews, analyzedReviews) {
    try {
      const allIssues = negativeReviews.flatMap(r => r.analysis.issues || []);
      const allKeywords = negativeReviews.flatMap(r => r.analysis.keywords || []);

      const prompt = `
以下のApp Storeのネガティブレビューから抽出された問題点とキーワードを詳細に分析し、実用的な対策案を提案してください。

ネガティブレビュー数: ${negativeReviews.length}件
総レビュー数: ${analyzedReviews.length}件

抽出された問題点: ${JSON.stringify(allIssues)}
関連キーワード: ${JSON.stringify(allKeywords)}

以下の形式でJSONで回答してください：
{
  "problemCategories": [
    {
      "category": "問題カテゴリ名（例：UI/UX、パフォーマンス、機能性、安定性など）",
      "issues": ["具体的な問題点1", "具体的な問題点2"],
      "frequency": 出現頻度（数値）,
      "priority": "high" | "medium" | "low",
      "solutions": [
        {
          "solution": "具体的で実行可能な対策案",
          "effort": "high" | "medium" | "low",
          "impact": "high" | "medium" | "low",
          "timeline": "短期" | "中期" | "長期"
        }
      ]
    }
  ],
  "overallSummary": "問題の全体的な傾向、主要な課題、優先すべき改善点を含む総合的な分析結果",
  "quickWins": ["低コストで即座に実施可能な改善案（例：文言修正、設定変更など）"],
  "longTermGoals": ["長期的な改善目標（例：アーキテクチャ改善、新機能開発など）"]
}

分析指針：
1. **カテゴリ分類**: 技術的問題、UI/UX問題、機能要望、パフォーマンス問題などに分類
2. **優先度判定**: 
   - high: 多数のユーザーに影響し、アプリの基本機能に関わる問題
   - medium: 一部ユーザーに影響するが回避可能な問題
   - low: 改善すれば良いが緊急性の低い問題
3. **対策案の具体性**: 開発チームが実際に実行できる具体的な改善案を提案
4. **工数と効果のバランス**: 実装コストと期待される効果を考慮した現実的な提案

必ず日本語で、開発チームにとって実用的な分析結果を提供してください。
`;

      console.log('Sending prompt to Gemini for problem analysis...');
      
      // より短いタイムアウト（30秒）
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log('Received response from Gemini (length:', text.length, 'chars)');
      
      // JSONを抽出して解析
      let analysis;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }

        analysis = JSON.parse(jsonMatch[0]);
        
        // 必須フィールドの検証と補完
        analysis.problemCategories = Array.isArray(analysis.problemCategories) ? analysis.problemCategories : [];
        analysis.overallSummary = analysis.overallSummary || 'ネガティブレビューの分析を完了しました。';
        analysis.quickWins = Array.isArray(analysis.quickWins) ? analysis.quickWins : [];
        analysis.longTermGoals = Array.isArray(analysis.longTermGoals) ? analysis.longTermGoals : [];
        
        // 各カテゴリの検証
        analysis.problemCategories = analysis.problemCategories.map(category => ({
          category: category.category || '未分類',
          issues: Array.isArray(category.issues) ? category.issues : [],
          frequency: typeof category.frequency === 'number' ? category.frequency : 1,
          priority: ['high', 'medium', 'low'].includes(category.priority) ? category.priority : 'medium',
          solutions: Array.isArray(category.solutions) ? category.solutions.map(solution => ({
            solution: solution.solution || '対策案を検討中',
            effort: ['high', 'medium', 'low'].includes(solution.effort) ? solution.effort : 'medium',
            impact: ['high', 'medium', 'low'].includes(solution.impact) ? solution.impact : 'medium',
            timeline: ['短期', '中期', '長期'].includes(solution.timeline) ? solution.timeline : '中期'
          })) : []
        }));
        
      } catch (parseError) {
        console.warn('JSON parsing failed for problem analysis:', parseError.message);
        console.warn('Raw response:', text);
        
        // フォールバック分析を生成
        analysis = {
          problemCategories: [
            {
              category: '一般的な問題',
              issues: allIssues.slice(0, 5),
              frequency: allIssues.length,
              priority: 'medium',
              solutions: [
                {
                  solution: 'ユーザーフィードバックの詳細調査を実施',
                  effort: 'low',
                  impact: 'medium',
                  timeline: '短期'
                }
              ]
            }
          ],
          overallSummary: `${negativeReviews.length}件のネガティブレビューが検出されました。詳細な分析が必要です。`,
          quickWins: ['ユーザーサポートの強化', 'FAQ の更新'],
          longTermGoals: ['ユーザー体験の全体的な改善'],
          parseError: true
        };
      }
      
      return {
        ...analysis,
        analyzedAt: new Date().toISOString(),
        totalNegativeReviews: negativeReviews.length,
        totalReviews: analyzedReviews.length
      };
    } catch (error) {
      console.error('Error in problem analysis:', error);
      
      // フォールバック: 基本的な問題分析を生成
      console.log('Generating fallback problem analysis...');
      return this.generateFallbackProblemAnalysis(analyzedReviews, error.message);
    }
  }

  /**
   * フォールバック問題分析（キーワードベース）
   * @param {Array} analyzedReviews - 分析済みレビューデータ
   * @param {string} errorMessage - エラーメッセージ
   * @returns {Object} 基本的な問題分析結果
   */
  generateFallbackProblemAnalysis(analyzedReviews, errorMessage) {
    if (errorMessage === undefined) errorMessage = '';
    const negativeReviews = analyzedReviews.filter(r => r.analysis.sentiment === 'negative');
    const neutralReviews = analyzedReviews.filter(r => r.analysis.sentiment === 'neutral');
    const positiveReviews = analyzedReviews.filter(r => r.analysis.sentiment === 'positive');
    
    console.log(`Generating fallback analysis for ${analyzedReviews.length} reviews (${negativeReviews.length} negative)`);
    
    if (negativeReviews.length === 0) {
      return {
        problemCategories: [],
        overallSummary: `${analyzedReviews.length}件のレビューを分析した結果、ネガティブなレビューは見つかりませんでした。アプリは良好な評価を受けています（ポジティブ: ${positiveReviews.length}件、中立: ${neutralReviews.length}件）。`,
        quickWins: [
          '現在の高品質を維持する',
          'ユーザーフィードバックの継続的な監視',
          'ポジティブなレビューの要因分析',
          'アプリストアでの評価向上施策'
        ],
        longTermGoals: [
          '更なる機能向上とイノベーション',
          'ユーザー体験の最適化',
          '新機能の戦略的追加',
          'ユーザーコミュニティの構築'
        ],
        totalNegativeReviews: 0,
        totalReviews: analyzedReviews.length,
        analyzedAt: new Date().toISOString(),
        fallback: true,
        fallbackReason: 'キーワードベース問題分析を実行（AI分析は利用不可）'
      };
    }

    // 問題カテゴリの分類
    const problemCategories = [];
    const allIssues = negativeReviews.flatMap(r => r.analysis.issues);
    const allKeywords = negativeReviews.flatMap(r => r.analysis.keywords);
    
    // より詳細な問題カテゴリを自動分類
    const categoryMap = {
      'バグ・エラー': {
        keywords: ['バグ', 'エラー', '不具合', 'クラッシュ', '落ちる', 'フリーズ', 'broken', 'bug', 'error', '動かない', '止まる'],
        issues: allIssues.filter(issue => 
          issue.includes('バグ') || issue.includes('エラー') || issue.includes('修正') || issue.includes('安定')
        ),
        priority: 'high',
        description: 'アプリの動作に関する技術的な問題'
      },
      'パフォーマンス': {
        keywords: ['重い', '遅い', '速度', 'パフォーマンス', 'slow', 'heavy', 'performance', '読み込み', 'ロード', '待ち時間'],
        issues: allIssues.filter(issue => 
          issue.includes('パフォーマンス') || issue.includes('速度') || issue.includes('改善')
        ),
        priority: 'medium',
        description: 'アプリの動作速度や応答性に関する問題'
      },
      'UI/UX': {
        keywords: ['使いにくい', '分からない', '操作', 'UI', 'UX', 'デザイン', 'interface', 'design', '見た目', '画面', 'ボタン'],
        issues: allIssues.filter(issue => 
          issue.includes('UI') || issue.includes('UX') || issue.includes('操作') || issue.includes('改善')
        ),
        priority: 'medium',
        description: 'ユーザーインターフェースと使いやすさの問題'
      },
      '機能要望': {
        keywords: ['機能', '欲しい', 'ない', 'feature', 'function', '追加', '実装', '対応'],
        issues: allIssues.filter(issue => 
          issue.includes('機能') || issue.includes('追加') || issue.includes('検討')
        ),
        priority: 'low',
        description: '新機能の要望や既存機能の改善要求'
      },
      '安定性': {
        keywords: ['安定', 'クラッシュ', '落ちる', 'crash', 'stable', '強制終了', '応答なし'],
        issues: allIssues.filter(issue => 
          issue.includes('安定') || issue.includes('向上') || issue.includes('必要')
        ),
        priority: 'high',
        description: 'アプリの安定性と信頼性に関する問題'
      },
      'セキュリティ・プライバシー': {
        keywords: ['セキュリティ', 'プライバシー', '個人情報', '安全', 'security', 'privacy', '漏洩', '保護'],
        issues: allIssues.filter(issue => 
          issue.includes('セキュリティ') || issue.includes('プライバシー')
        ),
        priority: 'high',
        description: 'セキュリティとプライバシーに関する懸念'
      },
      'サポート・ヘルプ': {
        keywords: ['サポート', 'ヘルプ', '問い合わせ', '対応', 'support', 'help', '回答', '解決'],
        issues: allIssues.filter(issue => 
          issue.includes('サポート') || issue.includes('対応')
        ),
        priority: 'medium',
        description: 'カスタマーサポートやヘルプ機能の問題'
      }
    };

    // 各カテゴリの詳細分析
    Object.entries(categoryMap).forEach(([categoryName, categoryData]) => {
      const matchingKeywords = allKeywords.filter(keyword => 
        categoryData.keywords.some(catKeyword => 
          keyword.toLowerCase().includes(catKeyword.toLowerCase())
        )
      );
      
      // レビュー内容からも関連する問題を検出
      const relatedReviews = negativeReviews.filter(review => {
        const content = (review.title + ' ' + review.content).toLowerCase();
        return categoryData.keywords.some(keyword => 
          content.includes(keyword.toLowerCase())
        );
      });
      
      const frequency = Math.max(matchingKeywords.length, relatedReviews.length);
      
      if (frequency > 0 || categoryData.issues.length > 0) {
        const specificIssues = categoryData.issues.length > 0 
          ? categoryData.issues 
          : [`${categoryName}に関する問題が${frequency}件のレビューで報告されています`];
        
        problemCategories.push({
          category: categoryName,
          description: categoryData.description,
          issues: specificIssues,
          frequency,
          priority: categoryData.priority,
          affectedReviews: relatedReviews.length,
          solutions: this.generateFallbackSolutions(categoryName, categoryData.priority)
        });
      }
    });

    // 一般的な問題カテゴリを追加（具体的な問題が見つからない場合）
    if (problemCategories.length === 0) {
      problemCategories.push({
        category: 'ユーザー体験',
        issues: ['ユーザー満足度の向上が必要'],
        frequency: negativeReviews.length,
        priority: 'medium',
        solutions: this.generateFallbackSolutions('ユーザー体験', 'medium')
      });
    }

    // 詳細な全体サマリーの生成
    const negativePercentage = ((negativeReviews.length / analyzedReviews.length) * 100).toFixed(1);
    const positivePercentage = ((positiveReviews.length / analyzedReviews.length) * 100).toFixed(1);
    const averageRating = (analyzedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / analyzedReviews.length).toFixed(1);
    
    let overallSummary = `${analyzedReviews.length}件のレビューを分析した結果、${negativeReviews.length}件（${negativePercentage}%）のネガティブレビューが検出されました。`;
    
    if (problemCategories.length > 0) {
      const topCategories = problemCategories
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 3)
        .map(c => c.category);
      overallSummary += `主な問題領域は${topCategories.join('、')}です。`;
      overallSummary += `平均評価は${averageRating}点で、ポジティブレビューが${positivePercentage}%を占めています。`;
    } else {
      overallSummary += `具体的な問題カテゴリは特定されませんでしたが、全体的な改善の余地があります。`;
    }

    // 問題に基づく動的なクイックウィンの生成
    const quickWins = [];
    const priorityCategories = problemCategories.filter(c => c.priority === 'high');
    
    if (priorityCategories.length > 0) {
      quickWins.push(`高優先度問題（${priorityCategories.map(c => c.category).join('、')}）の即座対応`);
    }
    
    quickWins.push(
      'ユーザーサポート体制の強化',
      'アプリストアレビューへの積極的な返信',
      'FAQ・ヘルプドキュメントの充実',
      'ユーザーフィードバック収集システムの改善',
      'アプリ内通知での改善点の告知'
    );

    // 問題に基づく動的な長期目標の生成
    const longTermGoals = [];
    
    if (problemCategories.some(c => c.category.includes('バグ') || c.category.includes('安定性'))) {
      longTermGoals.push('品質保証プロセスの抜本的強化');
    }
    if (problemCategories.some(c => c.category.includes('パフォーマンス'))) {
      longTermGoals.push('パフォーマンス最適化の継続的実施');
    }
    if (problemCategories.some(c => c.category.includes('UI/UX'))) {
      longTermGoals.push('ユーザーインターフェースの全面的見直し');
    }
    
    longTermGoals.push(
      'ユーザー中心の開発プロセスの確立',
      'データドリブンな意思決定システムの構築',
      '競合分析に基づく差別化戦略の実行',
      'ユーザーコミュニティの育成と活用'
    );

    return {
      problemCategories,
      overallSummary,
      quickWins,
      longTermGoals,
      totalNegativeReviews: negativeReviews.length,
      totalReviews: analyzedReviews.length,
      analyzedAt: new Date().toISOString(),
      fallback: true,
      fallbackReason: 'AI分析が利用できないため、キーワードベース問題分析を実行',
      error: errorMessage
    };
  }

  /**
   * フォールバック対策案の生成
   * @param {string} category - 問題カテゴリ
   * @param {string} priority - 優先度
   * @returns {Array} 対策案の配列
   */
  generateFallbackSolutions(category, priority) {
    const solutionTemplates = {
      'バグ・エラー': [
        {
          solution: 'バグレポートの詳細調査と修正',
          effort: 'medium',
          impact: 'high',
          timeline: '短期'
        },
        {
          solution: 'テスト工程の強化',
          effort: 'high',
          impact: 'high',
          timeline: '中期'
        }
      ],
      'パフォーマンス': [
        {
          solution: 'パフォーマンス最適化の実施',
          effort: 'high',
          impact: 'high',
          timeline: '中期'
        },
        {
          solution: 'リソース使用量の監視強化',
          effort: 'low',
          impact: 'medium',
          timeline: '短期'
        }
      ],
      'UI/UX': [
        {
          solution: 'ユーザビリティテストの実施',
          effort: 'medium',
          impact: 'high',
          timeline: '短期'
        },
        {
          solution: 'インターフェースの改善',
          effort: 'high',
          impact: 'high',
          timeline: '中期'
        }
      ],
      '機能要望': [
        {
          solution: 'ユーザー要望の優先度付けと実装計画',
          effort: 'medium',
          impact: 'medium',
          timeline: '中期'
        },
        {
          solution: '既存機能の改善',
          effort: 'low',
          impact: 'medium',
          timeline: '短期'
        }
      ],
      '安定性': [
        {
          solution: 'アプリの安定性向上',
          effort: 'high',
          impact: 'high',
          timeline: '中期'
        },
        {
          solution: 'クラッシュレポートの分析強化',
          effort: 'low',
          impact: 'medium',
          timeline: '短期'
        }
      ]
    };

    return solutionTemplates[category] || [
      {
        solution: `${category}に関する問題の詳細調査`,
        effort: 'medium',
        impact: 'medium',
        timeline: '短期'
      },
      {
        solution: `${category}の改善計画策定`,
        effort: 'low',
        impact: 'medium',
        timeline: '短期'
      }
    ];
  }

  /**
   * レビューの統計情報を生成
   * @param {Array} analyzedReviews - 分析済みレビューデータ
   * @returns {Object} 統計情報
   */
  generateStatistics(analyzedReviews) {
    const total = analyzedReviews.length;
    const sentimentCounts = {
      positive: analyzedReviews.filter(r => r.analysis.sentiment === 'positive').length,
      negative: analyzedReviews.filter(r => r.analysis.sentiment === 'negative').length,
      neutral: analyzedReviews.filter(r => r.analysis.sentiment === 'neutral').length
    };

    const averageSentimentScore = analyzedReviews.reduce((sum, r) => sum + r.analysis.sentimentScore, 0) / total;
    const averageRating = analyzedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total;

    // キーワード頻度
    const keywordFrequency = {};
    analyzedReviews.forEach(review => {
      review.analysis.keywords.forEach(keyword => {
        keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
      });
    });

    // トピック頻度
    const topicFrequency = {};
    analyzedReviews.forEach(review => {
      review.analysis.topics.forEach(topic => {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
      });
    });

    return {
      total,
      sentimentDistribution: {
        positive: sentimentCounts.positive,
        negative: sentimentCounts.negative,
        neutral: sentimentCounts.neutral,
        positivePercentage: (sentimentCounts.positive / total * 100).toFixed(1),
        negativePercentage: (sentimentCounts.negative / total * 100).toFixed(1),
        neutralPercentage: (sentimentCounts.neutral / total * 100).toFixed(1)
      },
      averageSentimentScore: parseFloat(averageSentimentScore.toFixed(3)),
      averageRating: parseFloat(averageRating.toFixed(2)),
      keywordFrequency,
      topicFrequency,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 問題分析と対策提案を生成
   * @param {Array} analyzedReviews - 分析済みレビューデータ
   * @returns {Promise<Object>} 問題分析結果と対策提案
   */
  async analyzeProblemAndSolutions(analyzedReviews) {
    try {
      if (!analyzedReviews || analyzedReviews.length === 0) {
        throw new Error('分析済みレビューデータが必要です');
      }

      // ネガティブレビューを抽出
      const negativeReviews = analyzedReviews.filter(
        review => review.analysis?.sentiment === 'negative'
      );

      if (negativeReviews.length === 0) {
        return {
          problemCategories: [],
          solutions: [],
          summary: {
            totalNegativeReviews: 0,
            mainIssues: [],
            priorityLevel: 'low',
            overallSentiment: 'positive'
          }
        };
      }

      // ネガティブレビューの内容を結合
      const negativeContent = negativeReviews
        .map(review => `${review.title || ''} ${review.content || ''}`)
        .join('\n');

      const prompt = `
以下は日本のApp Storeから収集したネガティブなレビューです。これらのレビューを分析して、主要な問題点を特定し、具体的な対策案を提案してください。

レビュー内容:
${negativeContent}

以下の形式でJSONレスポンスを返してください:
{
  "problemCategories": [
    {
      "category": "問題カテゴリ名",
      "description": "問題の詳細説明",
      "frequency": "出現頻度（high/medium/low）",
      "impact": "影響度（critical/high/medium/low）",
      "examples": ["具体的な例1", "具体的な例2"],
      "affectedUsers": "影響を受けるユーザー数の推定"
    }
  ],
  "solutions": [
    {
      "problemCategory": "対応する問題カテゴリ",
      "title": "対策案のタイトル",
      "description": "対策の詳細説明",
      "priority": "優先度（high/medium/low）",
      "estimatedEffort": "実装工数の見積もり",
      "expectedImpact": "期待される効果",
      "implementationSteps": ["実装ステップ1", "実装ステップ2"],
      "timeline": "実装予定期間"
    }
  ],
  "summary": {
    "totalNegativeReviews": ${negativeReviews.length},
    "mainIssues": ["主要な問題1", "主要な問題2", "主要な問題3"],
    "priorityLevel": "全体的な優先度（critical/high/medium/low）",
    "overallSentiment": "全体的な感情傾向",
    "recommendedActions": ["推奨アクション1", "推奨アクション2"]
  }
}

注意事項:
- 日本語で回答してください
- 具体的で実行可能な対策案を提案してください
- 優先度は影響度と実装の容易さを考慮してください
- レビューの内容に基づいて現実的な分析を行ってください
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // JSONレスポンスをパース
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('有効なJSONレスポンスが取得できませんでした');
      }

      const analysisResult = JSON.parse(jsonMatch[0]);
      
      // データの検証と補完
      if (!analysisResult.problemCategories) {
        analysisResult.problemCategories = [];
      }
      if (!analysisResult.solutions) {
        analysisResult.solutions = [];
      }
      if (!analysisResult.summary) {
        analysisResult.summary = {
          totalNegativeReviews: negativeReviews.length,
          mainIssues: [],
          priorityLevel: 'medium',
          overallSentiment: 'mixed'
        };
      }

      return analysisResult;

    } catch (error) {
      console.error('問題分析エラー:', error);
      
      // フォールバック: 基本的な分析を返す
      const negativeReviews = analyzedReviews.filter(
        review => review.analysis?.sentiment === 'negative'
      );

      return {
        problemCategories: [
          {
            category: "一般的な問題",
            description: "ユーザーから報告された問題",
            frequency: "medium",
            impact: "medium",
            examples: ["アプリの動作に関する問題"],
            affectedUsers: "複数のユーザー"
          }
        ],
        solutions: [
          {
            problemCategory: "一般的な問題",
            title: "ユーザーフィードバックの詳細調査",
            description: "報告された問題の詳細な調査と改善",
            priority: "medium",
            estimatedEffort: "2-4週間",
            expectedImpact: "ユーザー満足度の向上",
            implementationSteps: ["問題の詳細調査", "修正の実装", "テスト", "リリース"],
            timeline: "1ヶ月"
          }
        ],
        summary: {
          totalNegativeReviews: negativeReviews.length,
          mainIssues: ["ユーザビリティの改善が必要"],
          priorityLevel: "medium",
          overallSentiment: "改善の余地あり",
          recommendedActions: ["ユーザーフィードバックの継続的な監視"]
        }
      };
    }
  }
}

module.exports = new GeminiService();