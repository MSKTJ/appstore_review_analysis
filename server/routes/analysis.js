const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');

// レビューデータを一時的に保存するメモリストレージ（reviews.jsと共有）
const reviewsModule = require('./reviews');
const reviewsCache = reviewsModule.reviewsCache || new Map();

// 分析結果を一時的に保存するメモリストレージ
let analysisCache = new Map();

// 重複したエンドポイントを削除（下部に正しい実装があります）

/**
 * 統計情報の詳細分析
 * POST /api/analysis/statistics
 */
router.post('/statistics', (req, res) => {
  try {
    const { analyzedReviews } = req.body;
    
    if (!analyzedReviews || !Array.isArray(analyzedReviews)) {
      return res.status(400).json({
        success: false,
        error: 'analyzedReviews array is required'
      });
    }

    // 詳細統計を生成
    const statistics = geminiService.generateStatistics(analyzedReviews);
    
    // 時系列データの生成
    const timeSeriesData = generateTimeSeriesData(analyzedReviews);
    
    // 評価とセンチメントの相関分析
    const correlationData = generateCorrelationData(analyzedReviews);

    res.json({
      success: true,
      data: {
        ...statistics,
        timeSeries: timeSeriesData,
        correlation: correlationData
      }
    });

  } catch (error) {
    console.error('Error generating statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * キーワード分析
 * POST /api/analysis/keywords
 */
router.post('/keywords', (req, res) => {
  try {
    const { analyzedReviews, minFrequency = 2 } = req.body;
    
    if (!analyzedReviews || !Array.isArray(analyzedReviews)) {
      return res.status(400).json({
        success: false,
        error: 'analyzedReviews array is required'
      });
    }

    // キーワード分析
    const keywordAnalysis = analyzeKeywords(analyzedReviews, minFrequency);
    
    res.json({
      success: true,
      data: keywordAnalysis
    });

  } catch (error) {
    console.error('Error in keyword analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * レビューフィルタリング
 * POST /api/analysis/filter
 */
router.post('/filter', (req, res) => {
  try {
    const { 
      analyzedReviews, 
      sentiment, 
      rating, 
      keywords, 
      dateRange 
    } = req.body;
    
    if (!analyzedReviews || !Array.isArray(analyzedReviews)) {
      return res.status(400).json({
        success: false,
        error: 'analyzedReviews array is required'
      });
    }

    let filteredReviews = [...analyzedReviews];

    // センチメントフィルター
    if (sentiment && sentiment !== 'all') {
      filteredReviews = filteredReviews.filter(review => 
        review.analysis.sentiment === sentiment
      );
    }

    // 評価フィルター
    if (rating && rating.length > 0) {
      filteredReviews = filteredReviews.filter(review => 
        rating.includes(review.rating)
      );
    }

    // キーワードフィルター
    if (keywords && keywords.length > 0) {
      filteredReviews = filteredReviews.filter(review => 
        keywords.some(keyword => 
          review.analysis.keywords.includes(keyword) ||
          review.title.toLowerCase().includes(keyword.toLowerCase()) ||
          review.content.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    // 日付範囲フィルター
    if (dateRange && dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      filteredReviews = filteredReviews.filter(review => {
        const reviewDate = new Date(review.updated);
        return reviewDate >= startDate && reviewDate <= endDate;
      });
    }

    res.json({
      success: true,
      data: {
        reviews: filteredReviews,
        count: filteredReviews.length,
        originalCount: analyzedReviews.length
      }
    });

  } catch (error) {
    console.error('Error filtering reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 時系列データを生成
 */
function generateTimeSeriesData(analyzedReviews) {
  const timeSeriesMap = new Map();
  
  analyzedReviews.forEach(review => {
    const date = new Date(review.updated).toISOString().split('T')[0];
    
    if (!timeSeriesMap.has(date)) {
      timeSeriesMap.set(date, {
        date,
        positive: 0,
        negative: 0,
        neutral: 0,
        totalSentimentScore: 0,
        totalRating: 0,
        count: 0
      });
    }
    
    const dayData = timeSeriesMap.get(date);
    dayData[review.analysis.sentiment]++;
    dayData.totalSentimentScore += review.analysis.sentimentScore;
    dayData.totalRating += review.rating || 0;
    dayData.count++;
  });
  
  return Array.from(timeSeriesMap.values())
    .map(day => ({
      ...day,
      averageSentimentScore: day.totalSentimentScore / day.count,
      averageRating: day.totalRating / day.count
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/**
 * 相関データを生成
 */
function generateCorrelationData(analyzedReviews) {
  const correlationData = analyzedReviews.map(review => ({
    rating: review.rating || 0,
    sentimentScore: review.analysis.sentimentScore,
    sentiment: review.analysis.sentiment
  }));
  
  // 評価別のセンチメントスコア平均
  const ratingGroups = {};
  correlationData.forEach(item => {
    if (!ratingGroups[item.rating]) {
      ratingGroups[item.rating] = {
        rating: item.rating,
        sentimentScores: [],
        count: 0
      };
    }
    ratingGroups[item.rating].sentimentScores.push(item.sentimentScore);
    ratingGroups[item.rating].count++;
  });
  
  const ratingAnalysis = Object.values(ratingGroups).map(group => ({
    rating: group.rating,
    averageSentimentScore: group.sentimentScores.reduce((a, b) => a + b, 0) / group.count,
    count: group.count
  }));
  
  return {
    scatterData: correlationData,
    ratingAnalysis
  };
}

/**
 * キーワード分析
 */
function analyzeKeywords(analyzedReviews, minFrequency) {
  const keywordStats = {};
  const topicStats = {};
  
  analyzedReviews.forEach(review => {
    // キーワード統計
    review.analysis.keywords.forEach(keyword => {
      if (!keywordStats[keyword]) {
        keywordStats[keyword] = {
          keyword,
          frequency: 0,
          sentiments: { positive: 0, negative: 0, neutral: 0 },
          avgSentimentScore: 0,
          totalSentimentScore: 0
        };
      }
      
      keywordStats[keyword].frequency++;
      keywordStats[keyword].sentiments[review.analysis.sentiment]++;
      keywordStats[keyword].totalSentimentScore += review.analysis.sentimentScore;
    });
    
    // トピック統計
    review.analysis.topics.forEach(topic => {
      if (!topicStats[topic]) {
        topicStats[topic] = {
          topic,
          frequency: 0,
          sentiments: { positive: 0, negative: 0, neutral: 0 }
        };
      }
      
      topicStats[topic].frequency++;
      topicStats[topic].sentiments[review.analysis.sentiment]++;
    });
  });
  
  // 平均センチメントスコアを計算
  Object.values(keywordStats).forEach(stat => {
    stat.avgSentimentScore = stat.totalSentimentScore / stat.frequency;
  });
  
  // 最小頻度でフィルター
  const filteredKeywords = Object.values(keywordStats)
    .filter(stat => stat.frequency >= minFrequency)
    .sort((a, b) => b.frequency - a.frequency);
    
  const filteredTopics = Object.values(topicStats)
    .filter(stat => stat.frequency >= minFrequency)
    .sort((a, b) => b.frequency - a.frequency);
  
  return {
    keywords: filteredKeywords,
    topics: filteredTopics,
    totalUniqueKeywords: Object.keys(keywordStats).length,
    totalUniqueTopics: Object.keys(topicStats).length
  };
}

/**
 * 問題分析と対策提案を生成
 * POST /api/analysis/problems
 */
router.post('/problems', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { appId, limit = 50, analyzedReviews: providedReviews } = req.body;
    
    if (!appId) {
      console.log('Error: App ID is required');
      return res.status(400).json({
        success: false,
        error: 'App ID is required'
      });
    }

    console.log(`Starting problem analysis for app ${appId} with limit ${limit}`);
    
    let analyzedReviews;
    
    // 直接送信されたanalyzedReviewsがある場合はそれを使用
    if (providedReviews && Array.isArray(providedReviews) && providedReviews.length > 0) {
      console.log(`Using provided analyzed reviews: ${providedReviews.length} reviews`);
      analyzedReviews = providedReviews;
    } else {
      // フォールバック: キャッシュから取得
      const analysisKey = `analysis_${appId}_${limit}`;
      
      if (!reviewsCache.has(analysisKey)) {
        console.log(`No analyzed reviews found in cache for key: ${analysisKey}`);
        console.log('Available cache keys:', Array.from(reviewsCache.keys()));
        return res.status(404).json({
          success: false,
          error: 'No analyzed reviews found. Please run sentiment analysis first.',
          hint: 'Use POST /api/reviews/:appId/analyze to analyze reviews first'
        });
      }

      const cachedData = reviewsCache.get(analysisKey);
      analyzedReviews = cachedData.data.reviews;
    }
    
    if (!analyzedReviews || analyzedReviews.length === 0) {
      console.log('Analyzed reviews array is empty');
      return res.status(404).json({
        success: false,
        error: 'No analyzed reviews found. Please run sentiment analysis first.'
      });
    }

    console.log(`Found ${analyzedReviews.length} analyzed reviews, starting problem analysis...`);
    
    // ネガティブレビューの数をチェック
    const negativeReviews = analyzedReviews.filter(r => r.analysis && r.analysis.sentiment === 'negative');
    console.log(`Found ${negativeReviews.length} negative reviews`);
    
    if (negativeReviews.length === 0) {
      console.log('No negative reviews found, returning positive analysis');
      return res.json({
        success: true,
        data: {
          problemCategories: [],
          overallSummary: 'ネガティブなレビューが見つかりませんでした。アプリは良好な評価を受けています。',
          quickWins: ['現在の品質を維持する', 'ユーザーフィードバックの継続的な監視'],
          longTermGoals: ['更なる機能向上', 'ユーザー体験の最適化'],
          totalNegativeReviews: 0,
          totalReviews: analyzedReviews.length,
          analyzedAt: new Date().toISOString(),
          processingTime: Date.now() - startTime
        }
      });
    }

    // 問題分析を実行（タイムアウト付き）
    let problemAnalysis;
    
    try {
      console.log('Attempting AI problem analysis...');
      problemAnalysis = await Promise.race([
        geminiService.generateProblemAnalysis(analyzedReviews),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Problem analysis timeout after 45 seconds')), 45000)
        )
      ]);
      
      console.log('AI problem analysis completed successfully');
      
    } catch (analysisError) {
      console.warn('AI problem analysis failed or timed out:', analysisError.message);
      
      // フォールバック分析を実行
      console.log('Generating fallback analysis...');
      problemAnalysis = geminiService.generateFallbackProblemAnalysis(analyzedReviews, analysisError.message);
      problemAnalysis.fallback = true;
      problemAnalysis.fallbackReason = analysisError.message;
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`Problem analysis completed in ${processingTime}ms`);
    console.log(`Analysis result: ${problemAnalysis.problemCategories?.length || 0} categories, ${problemAnalysis.totalNegativeReviews || 0} negative reviews`);
    
    // 結果をキャッシュに保存
    const problemKey = `problems_${appId}_${limit}`;
    reviewsCache.set(problemKey, {
      data: problemAnalysis,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: problemAnalysis,
      appId,
      processingTime,
      usedFallback: problemAnalysis.fallback || false,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Critical error in problem analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate problem analysis',
      details: error.message,
      processingTime
    });
  }
});

/**
 * キャッシュされた問題分析結果を取得
 * GET /api/analysis/problems/:appId
 */
router.get('/problems/:appId', (req, res) => {
  try {
    const { appId } = req.params;
    const { limit = 50 } = req.query;
    
    const problemKey = `problems_${appId}_${limit}`;
    
    if (reviewsCache.has(problemKey)) {
      const cachedData = reviewsCache.get(problemKey);
      return res.json({
        success: true,
        data: cachedData.data,
        cached: true,
        cachedAt: new Date(cachedData.timestamp).toISOString()
      });
    }

    res.status(404).json({
      success: false,
      error: 'No problem analysis data found. Please run analysis first.'
    });

  } catch (error) {
    console.error('Error getting problem analysis data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


module.exports = router;