import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove,
  Search,
  Analytics
} from '@mui/icons-material';
import { 
  fetchReviews, 
  fetchAppInfo, 
  analyzeReviews, 
  fetchSampleApps,
  setCurrentApp 
} from '../store/slices/reviewsSlice';
import SentimentChart from './charts/SentimentChart';
import RatingDistribution from './charts/RatingDistribution';
import KeywordCloud from './charts/KeywordCloud';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { 
    reviews, 
    analyzedReviews, 
    appInfo, 
    statistics, 
    sampleApps,
    loading, 
    error, 
    currentApp 
  } = useSelector(state => state.reviews);

  const [appId, setAppId] = useState('');
  const [reviewLimit, setReviewLimit] = useState(50);

  useEffect(() => {
    dispatch(fetchSampleApps());
  }, [dispatch]);

  const handleFetchReviews = async () => {
    if (!appId.trim()) return;
    
    dispatch(setCurrentApp(appId));
    await dispatch(fetchReviews({ appId, limit: reviewLimit }));
    await dispatch(fetchAppInfo(appId));
  };

  const handleAnalyzeReviews = async () => {
    if (!appId.trim()) return;
    
    await dispatch(analyzeReviews({ appId, limit: reviewLimit }));
  };

  const handleSampleAppSelect = (selectedAppId) => {
    setAppId(selectedAppId);
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp color="success" />;
      case 'negative':
        return <TrendingDown color="error" />;
      default:
        return <Remove color="action" />;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* アプリ選択セクション */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            アプリ選択
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="App ID"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="例: 310633997"
                helperText="App StoreのアプリIDを入力してください"
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>取得件数</InputLabel>
                <Select
                  value={reviewLimit}
                  label="取得件数"
                  onChange={(e) => setReviewLimit(e.target.value)}
                >
                  <MenuItem value={25}>25件</MenuItem>
                  <MenuItem value={50}>50件</MenuItem>
                  <MenuItem value={100}>100件</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Search />}
                onClick={handleFetchReviews}
                disabled={loading.reviews || loading.appInfo || !appId.trim()}
              >
                {loading.reviews || loading.appInfo ? <CircularProgress size={20} /> : 'レビュー取得'}
              </Button>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={<Analytics />}
                onClick={handleAnalyzeReviews}
                disabled={loading.analysis || reviews.length === 0}
              >
                {loading.analysis ? <CircularProgress size={20} /> : '感情分析実行'}
              </Button>
            </Grid>
          </Grid>

          {/* サンプルアプリ */}
          {sampleApps.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                サンプルアプリ:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {sampleApps.slice(0, 5).map((sampleAppId) => (
                  <Chip
                    key={sampleAppId}
                    label={sampleAppId}
                    onClick={() => handleSampleAppSelect(sampleAppId)}
                    variant={appId === sampleAppId ? 'filled' : 'outlined'}
                    color="primary"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error.reviews && (
        <Alert severity="error" sx={{ mb: 3 }}>
          レビューの取得に失敗しました: {error.reviews}
        </Alert>
      )}
      {error.appInfo && (
        <Alert severity="error" sx={{ mb: 3 }}>
          アプリ情報の取得に失敗しました: {error.appInfo}
        </Alert>
      )}
      {error.analysis && (
        <Alert severity="error" sx={{ mb: 3 }}>
          感情分析の実行に失敗しました: {error.analysis}
        </Alert>
      )}

      {/* アプリ情報 */}
      {appInfo && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📱 {appInfo.name}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  バージョン: {appInfo.version}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  平均評価: ⭐ {appInfo.averageUserRating?.toFixed(1)} ({appInfo.userRatingCount?.toLocaleString()}件)
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">
                  ジャンル: {appInfo.genres?.join(', ')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  最終更新: {new Date(appInfo.currentVersionReleaseDate).toLocaleDateString('ja-JP')}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 統計情報 */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  総レビュー数
                </Typography>
                <Typography variant="h4" color="primary">
                  {statistics.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getSentimentIcon('positive')}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    ポジティブ
                  </Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {statistics.sentimentDistribution.positivePercentage}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statistics.sentimentDistribution.positive}件
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getSentimentIcon('negative')}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    ネガティブ
                  </Typography>
                </Box>
                <Typography variant="h4" color="error.main">
                  {statistics.sentimentDistribution.negativePercentage}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statistics.sentimentDistribution.negative}件
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  平均評価
                </Typography>
                <Typography variant="h4" color="primary">
                  ⭐ {statistics.averageRating}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  感情スコア: {statistics.averageSentimentScore}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* チャート */}
      {analyzedReviews.length > 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  感情分布
                </Typography>
                <SentimentChart data={analyzedReviews} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  評価分布
                </Typography>
                <RatingDistribution data={analyzedReviews} />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  キーワードクラウド
                </Typography>
                <KeywordCloud data={statistics?.keywordFrequency || {}} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* フォールバック分析の通知 */}
      {analyzedReviews.length > 0 && analyzedReviews.some(review => review.analysis?.fallback) && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>分析モード:</strong> AI分析が利用できないため、キーワードベース分析を実行しています。
            より詳細な分析結果を得るには、Gemini APIのクォータ制限が解除されるまでお待ちください。
          </Typography>
        </Alert>
      )}

      {/* レビューサンプル */}
      {analyzedReviews.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                最新レビューサンプル
              </Typography>
              {analyzedReviews.some(review => review.analysis?.fallback) && (
                <Chip
                  label="キーワードベース分析"
                  size="small"
                  color="info"
                  variant="outlined"
                  sx={{ ml: 2 }}
                />
              )}
            </Box>
            <Grid container spacing={2}>
              {analyzedReviews.slice(0, 3).map((review, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip
                          size="small"
                          label={review.analysis.sentiment}
                          color={getSentimentColor(review.analysis.sentiment)}
                        />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          ⭐ {review.rating}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2" gutterBottom>
                        {review.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {review.analysis.summary}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard;