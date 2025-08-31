import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert
} from '@mui/material';
import {
  Visibility,
  FilterList,
  Download,
  Star
} from '@mui/icons-material';
import { filterReviews } from '../store/slices/analysisSlice';

const ReviewList = () => {
  const dispatch = useDispatch();
  const { analyzedReviews } = useSelector(state => state.reviews);
  const { filteredReviews, loading } = useSelector(state => state.analysis);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedReview, setSelectedReview] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    sentiment: 'all',
    rating: [],
    keyword: ''
  });

  const displayReviews = filteredReviews.length > 0 ? filteredReviews : analyzedReviews;

  useEffect(() => {
    if (analyzedReviews.length > 0) {
      handleFilter();
    }
  }, [analyzedReviews]);

  const handleFilter = () => {
    const filterParams = {
      analyzedReviews,
      sentiment: filters.sentiment,
      rating: filters.rating,
      keywords: filters.keyword ? [filters.keyword] : []
    };
    
    dispatch(filterReviews(filterParams));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleRatingFilterChange = (rating) => {
    setFilters(prev => ({
      ...prev,
      rating: prev.rating.includes(rating)
        ? prev.rating.filter(r => r !== rating)
        : [...prev.rating, rating]
    }));
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewReview = (review) => {
    setSelectedReview(review);
    setDialogOpen(true);
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

  const getSentimentLabel = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return 'ポジティブ';
      case 'negative':
        return 'ネガティブ';
      default:
        return '中立';
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        sx={{
          color: i < rating ? '#ffc107' : '#e0e0e0',
          fontSize: '16px'
        }}
      />
    ));
  };

  const exportToCSV = () => {
    const headers = ['タイトル', '内容', '評価', '感情', '感情スコア', '作成者', '更新日'];
    const csvContent = [
      headers.join(','),
      ...displayReviews.map(review => [
        `"${review.title}"`,
        `"${review.content}"`,
        review.rating,
        getSentimentLabel(review.analysis?.sentiment),
        review.analysis?.sentimentScore || 0,
        review.author,
        new Date(review.updated).toLocaleDateString('ja-JP')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'reviews.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (analyzedReviews.length === 0) {
    return (
      <Alert severity="info">
        レビューデータがありません。まずダッシュボードでレビューを取得し、感情分析を実行してください。
      </Alert>
    );
  }

  return (
    <Box>
      {/* フィルター */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <FilterList sx={{ mr: 1, verticalAlign: 'middle' }} />
            フィルター
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>感情</InputLabel>
                <Select
                  value={filters.sentiment}
                  label="感情"
                  onChange={(e) => handleFilterChange('sentiment', e.target.value)}
                >
                  <MenuItem value="all">すべて</MenuItem>
                  <MenuItem value="positive">ポジティブ</MenuItem>
                  <MenuItem value="negative">ネガティブ</MenuItem>
                  <MenuItem value="neutral">中立</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="キーワード検索"
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                placeholder="タイトルや内容を検索"
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" gutterBottom>
                評価フィルター:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[1, 2, 3, 4, 5].map(rating => (
                  <Chip
                    key={rating}
                    label={`${rating}⭐`}
                    onClick={() => handleRatingFilterChange(rating)}
                    color={filters.rating.includes(rating) ? 'primary' : 'default'}
                    variant={filters.rating.includes(rating) ? 'filled' : 'outlined'}
                    size="small"
                  />
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleFilter}
                disabled={loading.filter}
              >
                適用
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* レビューテーブル */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              レビュー一覧 ({displayReviews.length}件)
            </Typography>
            <Button
              startIcon={<Download />}
              onClick={exportToCSV}
              variant="outlined"
            >
              CSV出力
            </Button>
          </Box>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>タイトル</TableCell>
                  <TableCell>評価</TableCell>
                  <TableCell>感情</TableCell>
                  <TableCell>感情スコア</TableCell>
                  <TableCell>作成者</TableCell>
                  <TableCell>更新日</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayReviews
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((review, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {review.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {renderStars(review.rating)}
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            ({review.rating})
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getSentimentLabel(review.analysis?.sentiment)}
                          color={getSentimentColor(review.analysis?.sentiment)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {review.analysis?.sentimentScore?.toFixed(3) || 'N/A'}
                      </TableCell>
                      <TableCell>{review.author}</TableCell>
                      <TableCell>
                        {new Date(review.updated).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleViewReview(review)}
                        >
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={displayReviews.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="表示件数:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}件`}
          />
        </CardContent>
      </Card>

      {/* レビュー詳細ダイアログ */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          レビュー詳細
        </DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedReview.title}
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    評価: {renderStars(selectedReview.rating)} ({selectedReview.rating})
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    感情: <Chip
                      label={getSentimentLabel(selectedReview.analysis?.sentiment)}
                      color={getSentimentColor(selectedReview.analysis?.sentiment)}
                      size="small"
                    />
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    作成者: {selectedReview.author}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    更新日: {new Date(selectedReview.updated).toLocaleDateString('ja-JP')}
                  </Typography>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle2" gutterBottom>
                レビュー内容:
              </Typography>
              <Typography variant="body2" paragraph>
                {selectedReview.content}
              </Typography>
              
              {selectedReview.analysis && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">
                      分析結果:
                    </Typography>
                    {selectedReview.analysis.fallback && (
                      <Chip
                        label="キーワードベース分析"
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                  
                  {selectedReview.analysis.fallback && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        {selectedReview.analysis.fallbackReason || 'AI分析が利用できないため、キーワードベース分析を実行しました。'}
                      </Typography>
                    </Alert>
                  )}
                  
                  <Typography variant="body2" paragraph>
                    要約: {selectedReview.analysis.summary}
                  </Typography>
                  
                  {selectedReview.analysis.keywords.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        キーワード:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedReview.analysis.keywords.map((keyword, i) => (
                          <Chip key={i} label={keyword} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  {selectedReview.analysis.issues.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        問題点:
                      </Typography>
                      <ul>
                        {selectedReview.analysis.issues.map((issue, i) => (
                          <li key={i}>
                            <Typography variant="body2">{issue}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                  
                  {selectedReview.analysis.praises.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        称賛点:
                      </Typography>
                      <ul>
                        {selectedReview.analysis.praises.map((praise, i) => (
                          <li key={i}>
                            <Typography variant="body2">{praise}</Typography>
                          </li>
                        ))}
                      </ul>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReviewList;