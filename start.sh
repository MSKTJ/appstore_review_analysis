#!/bin/bash

echo "🚀 App Store レビュー分析アプリケーション 起動スクリプト"
echo "=================================================="

# Node.jsのバージョンチェック
if ! command -v node &> /dev/null; then
    echo "❌ Node.jsがインストールされていません。"
    echo "   https://nodejs.org/ からNode.js 16.x以上をインストールしてください。"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js 16.x以上が必要です。現在のバージョン: $(node -v)"
    exit 1
fi

echo "✅ Node.js バージョン: $(node -v)"

# 依存関係のインストール
echo ""
echo "📦 依存関係をインストール中..."
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ サーバー依存関係のインストールに失敗しました。"
        exit 1
    fi
fi

if [ ! -d "client/node_modules" ]; then
    cd client
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ クライアント依存関係のインストールに失敗しました。"
        exit 1
    fi
    cd ..
fi

echo "✅ 依存関係のインストール完了"

# 環境変数の確認
if [ ! -f ".env" ]; then
    echo "❌ .envファイルが見つかりません。"
    exit 1
fi

echo "✅ 環境設定ファイル確認完了"

# アプリケーション起動
echo ""
echo "🎯 アプリケーションを起動中..."
echo "   - バックエンド: http://localhost:5000"
echo "   - フロントエンド: http://localhost:3000"
echo ""
echo "📝 使用方法:"
echo "   1. ブラウザで http://localhost:3000 にアクセス"
echo "   2. App IDを入力（例: 310633997）"
echo "   3. レビューを取得して感情分析を実行"
echo ""
echo "⏹️  停止するには Ctrl+C を押してください"
echo ""

# 開発モードで起動
npm run dev