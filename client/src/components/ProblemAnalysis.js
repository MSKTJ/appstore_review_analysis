import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Paper,
  Stack
} from '@mui/material';
import {
  ExpandMore,
  Warning,
  TrendingUp,
  Schedule,
  CheckCircle,
  Error,
  Info,
  BugReport,
  Lightbulb,
  Timeline,
  Assignment
} from '@mui/icons-material';
import { generateProblemAnalysis, fetchProblemAnalysis } from '../store/slices/analysisSlice';

const ProblemAnalysis = () => {
  const dispatch = useDispatch();
  const { 
    problemAnalysis, 
    loading, 
    error 
  } = useSelector(state => state.analysis);
  
  const { 
    analyzedReviews, 
    appInfo, 
    currentApp 
  } = useSelector(state => state.reviews);

  console.log('ProblemAnalysis - currentApp:', currentApp);
  console.log('ProblemAnalysis - analyzedReviews length:', analyzedReviews?.length);

  const [expanded, setExpanded] = useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // コンポーネント読み込み時にキャッシュされた分析結果のみ取得（自動実行は無効化）
  useEffect(() => {
    // 既存の分析結果がある場合のみ表示（新規分析は手動実行のみ）
    if (currentApp && problemAnalysis) {
      console.log('Existing problem analysis found for app:', currentApp);
    }
  }, [currentApp, problemAnalysis]);

  const handleGenerateAnalysis = async () => {
    if (!currentApp) {
      console.error('No currentApp set');
      return;
    }

    if (!analyzedReviews || analyzedReviews.length === 0) {
      console.error('No analyzed reviews available');
      return;
    }

    console.log('Starting problem analysis for app:', currentApp);
    console.log('Analyzed reviews count:', analyzedReviews.length);

    try {
      await dispatch(generateProblemAnalysis({ 
        appId: currentApp,
        limit: analyzedReviews?.length || 50,
        analyzedReviews: analyzedReviews
      })).unwrap();
    } catch (error) {
      console.error('Problem analysis failed:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getEffortIcon = (effort) => {
    switch (effort) {
      case 'high': return <Warning color="error" />;
      case 'medium': return <Schedule color="warning" />;
      case 'low': return <CheckCircle color="success" />;
      default: return <Info />;
    }
  };

  if (!analyzedReviews || analyzedReviews.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          問題分析を実行するには、まずダッシュボードでレビューを取得し、感情分析を実行してください。
        </Alert>
        <Typography variant="body2" color="text.secondary">
          現在の状態: currentApp = {currentApp || 'なし'}, analyzedReviews = {analyzedReviews?.length || 0}件
        </Typography>
      </Box>
    );
  }

  const negativeReviews = analyzedReviews.filter(r => r.analysis?.sentiment === 'negative');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        問題分析・対策提案
      </Typography>

      {appInfo && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {appInfo.name}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  総レビュー数
                </Typography>
                <Typography variant="h6">
                  {analyzedReviews.length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  ネガティブレビュー
                </Typography>
                <Typography variant="h6" color="error.main">
                  {negativeReviews.length}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  問題発生率
                </Typography>
                <Typography variant="h6">
                  {((negativeReviews.length / analyzedReviews.length) * 100).toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  onClick={handleGenerateAnalysis}
                  disabled={loading.problems || !analyzedReviews || analyzedReviews.length === 0}
                  startIcon={loading.problems ? <CircularProgress size={20} /> : <TrendingUp />}
                  fullWidth
                >
                  {loading.problems ? '分析中...' : '問題分析実行'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {error.problems && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error.problems}
        </Alert>
      )}

      {loading.problems && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              問題分析を実行中...
            </Typography>
            <LinearProgress />
          </CardContent>
        </Card>
      )}

      {/* フォールバック分析の通知 */}
      {problemAnalysis?.fallback && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>分析モード:</strong> {problemAnalysis.fallbackReason || 'AI分析が利用できないため、キーワードベース問題分析を実行しています。'}
          </Typography>
        </Alert>
      )}

      {problemAnalysis && (
        <Grid container spacing={3}>
          {/* 全体サマリー */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    📊 分析サマリー
                  </Typography>
                  {problemAnalysis.fallback && (
                    <Chip
                      label="キーワードベース分析"
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Box>
                <Typography variant="body1" paragraph>
                  {problemAnalysis.overallSummary}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      分析対象レビュー
                    </Typography>
                    <Typography variant="h6">
                      {problemAnalysis.totalReviews}件
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      ネガティブレビュー
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {problemAnalysis.totalNegativeReviews}件
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      分析日時
                    </Typography>
                    <Typography variant="body2">
                      {new Date(problemAnalysis.analyzedAt).toLocaleString('ja-JP')}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* 問題カテゴリー */}
          {problemAnalysis.problemCategories && problemAnalysis.problemCategories.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                🔍 問題カテゴリー別分析
              </Typography>
              {problemAnalysis.problemCategories.map((category, index) => (
                <Accordion 
                  key={index}
                  expanded={expanded === `panel${index}`}
                  onChange={handleChange(`panel${index}`)}
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <BugReport sx={{ mr: 2 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">
                          {category.category}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                          <Chip 
                            label={`頻度: ${category.frequency}`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip 
                            label={`優先度: ${category.priority}`}
                            size="small"
                            color={getPriorityColor(category.priority)}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      {/* 問題点 */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" gutterBottom>
                          <Error sx={{ mr: 1, verticalAlign: 'middle' }} />
                          問題点
                        </Typography>
                        <List dense>
                          {category.issues.map((issue, issueIndex) => (
                            <ListItem key={issueIndex}>
                              <ListItemText primary={issue} />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>

                      {/* 対策案 */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" gutterBottom>
                          <Lightbulb sx={{ mr: 1, verticalAlign: 'middle' }} />
                          対策案
                        </Typography>
                        {category.solutions && category.solutions.map((solution, solutionIndex) => (
                          <Paper key={solutionIndex} sx={{ p: 2, mb: 2 }}>
                            <Typography variant="body1" fontWeight="bold" gutterBottom>
                              {solution.solution}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Chip 
                                icon={getEffortIcon(solution.effort)}
                                label={`工数: ${solution.effort}`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip 
                                label={`効果: ${solution.impact}`}
                                size="small"
                                color={solution.impact === 'high' ? 'success' : solution.impact === 'medium' ? 'warning' : 'default'}
                                variant="outlined"
                              />
                              <Chip 
                                icon={<Timeline />}
                                label={solution.timeline}
                                size="small"
                                variant="outlined"
                              />
                            </Stack>
                          </Paper>
                        ))}
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Grid>
          )}

          {/* クイックウィン */}
          {problemAnalysis.quickWins && problemAnalysis.quickWins.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ⚡ クイックウィン（即座に実施可能）
                  </Typography>
                  <List>
                    {problemAnalysis.quickWins.map((win, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText primary={win} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* 長期目標 */}
          {problemAnalysis.longTermGoals && problemAnalysis.longTermGoals.length > 0 && (
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🎯 長期改善目標
                  </Typography>
                  <List>
                    {problemAnalysis.longTermGoals.map((goal, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Assignment color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={goal} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default ProblemAnalysis;