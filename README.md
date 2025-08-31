<<<<<<< HEAD
# appstore_analysys
rovodevで作ったApp storeユーザレビュー分析アプリ
=======
# App Store レビュー分析アプリケーション

日本のApple App Storeから取得したユーザーレビューに対して感情分析を行い、その結果をグラフや表形式で可視化するWebアプリケーションです。

## 🚀 主な機能

- **データ収集**: App Store RSSフィードからレビューデータを自動取得
- **感情分析**: Gemini 2.0 APIを使用した高精度な感情分析
- **可視化**: インタラクティブなグラフとチャートでデータを表示
- **問題分析**: AIによる自動的な問題抽出と対策提案
- **フィルタリング**: 感情、評価、キーワードによる詳細検索

## 🛠 技術スタック

### フロントエンド
- React.js 18
- Material-UI (MUI)
- Redux Toolkit
- Chart.js / React-Chartjs-2
- React Router

### バックエンド
- Node.js + Express
- Gemini 2.0 API
- XML2JS (RSS解析)
- Axios

## 📋 前提条件

- Node.js 16.x 以上
- npm または yarn
- Gemini API キー (設定済み)

## 🔧 インストールと起動

### 1. 依存関係のインストール

```bash
# ルートディレクトリで実行
npm run i 
```

### 2. 環境変数の設定

ルートディレクトリに`.env`ファイルを作成し、以下の内容を記述します。

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
PORT=5000
NODE_ENV=development
```

**注意:** `YOUR_GEMINI_API_KEY`はご自身のGemini APIキーに置き換えてください。
この`.env`ファイルは`.gitignore`に含まれており、バージョン管理の対象外です。

### 3. アプリケーションの起動

#### 開発モード（推奨）
```bash
npm run dev
```
これにより、バックエンド（ポート5000）とフロントエンド（ポート3000）が同時に起動します。

#### 個別起動
```bash
# バックエンドのみ
npm run server

# フロントエンドのみ（別ターミナル）
npm run client
```

### 4. アプリケーションへのアクセス

ブラウザで以下のURLにアクセス：
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:5000/api

## 📱 使用方法

### 1. ダッシュボード
1. App IDを入力（例: 310633997 - WhatsApp）
2. 取得件数を選択（25/50/100件）
3. 「レビュー取得」ボタンをクリック
4. 「感情分析実行」ボタンをクリック
5. 結果をグラフで確認

### 2. レビュー一覧
- 感情、評価、キーワードでフィルタリング
- 詳細なレビュー内容を表示
- CSV形式でエクスポート可能

### 3. 問題分析
- AIによる自動問題分析
- 優先度付きの対策提案
- カテゴリ別の問題整理

## 🔍 サンプルApp ID

以下のApp IDでテストできます：
- 310633997 (WhatsApp)
- 389801252 (Instagram)
- 454638411 (Threads)
- 333903271 (Twitter/X)
- 835599320 (TikTok)

## 📊 API エンドポイント

### レビュー関連
- `GET /api/reviews/:appId` - レビュー取得
- `GET /api/reviews/:appId/info` - アプリ情報取得
- `POST /api/reviews/:appId/analyze` - 感情分析実行

### 分析関連
- `POST /api/analysis/problems` - 問題分析
- `POST /api/analysis/statistics` - 統計情報生成
- `POST /api/analysis/keywords` - キーワード分析
- `POST /api/analysis/filter` - レビューフィルタリング

## 🎯 主要コンポーネント

### フロントエンド
- `Dashboard.js` - メインダッシュボード
- `ReviewList.js` - レビュー一覧・検索
- `ProblemAnalysis.js` - 問題分析・対策提案
- `charts/` - 各種グラフコンポーネント

### バックエンド
- `services/appStoreService.js` - App Store API連携
- `services/geminiService.js` - Gemini AI連携
- `routes/reviews.js` - レビュー関連API
- `routes/analysis.js` - 分析関連API

## 🔒 セキュリティ

- APIキーは環境変数で管理
- CORS設定済み
- Helmet.jsによるセキュリティヘッダー
- リクエスト制限とタイムアウト設定

## 🚨 トラブルシューティング

### よくある問題

1. **レビューが取得できない**
   - App IDが正しいか確認
   - ネットワーク接続を確認
   - App Store RSSフィードの可用性を確認

2. **感情分析が失敗する**
   - Gemini APIキーが正しいか確認
   - API制限に達していないか確認
   - レビューデータが存在するか確認

3. **フロントエンドが表示されない**
   - ポート3000が使用可能か確認
   - バックエンドが正常に起動しているか確認
   - プロキシ設定を確認

### ログ確認
```bash
# サーバーログ
npm run server

# 開発者ツールでブラウザコンソールを確認
```

## 📈 今後の拡張予定

- データベース連携（MongoDB/PostgreSQL）
- ユーザー認証機能
- リアルタイム更新
- 複数アプリの比較分析
- 詳細なレポート生成
- スケジュール実行機能

## 📄 ライセンス

MIT License

## 👨‍💻 開発者

Rovo Dev - AI Assistant

---

## 🆘 サポート

問題や質問がある場合は、以下を確認してください：
1. このREADMEファイル
2. コンソールのエラーログ
3. ネットワーク接続状況
4. API制限状況
>>>>>>> abf6cbe (とり会えずVer1.0)
