const express = require('express');
const router = express.Router();
const { check, query } = require('express-validator');
const validate = require('../middleware/validator');
const appStoreService = require('../services/appStoreService');
const geminiService = require('../services/geminiService');

const cache = require('../services/cacheService');

/**
 * 指定されたアプリのレビューを取得
 * GET /api/reviews/:appId
 */
router.get('/:appId', 
  [
    check('appId').isNumeric().withMessage('App ID must be a number'),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be a number between 1 and 200'),
    query('forceRefresh').optional().isBoolean().withMessage('forceRefresh must be a boolean')
  ],
  validate,
  async (req, res) => {
  try {
    const { appId } = req.params;
    const { limit = 50, forceRefresh = false } = req.query;
    
    const cacheKey = `reviews_${appId}_${limit}`;
    if (!forceRefresh && cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      return res.json({
        success: true,
        data: cachedData.data,
        cached: true,
        cachedAt: new Date(cachedData.timestamp).toISOString()
      });
    }

    console.log(`Fetching reviews for app ${appId} with limit ${limit}`);
    
    // App Store からレビューを取得
    const reviews = await appStoreService.fetchReviews(appId, parseInt(limit));
    
    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No reviews found for this app'
      });
    }

    cache.set(cacheKey, {
      data: reviews,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: reviews,
      count: reviews.length,
      appId,
      fetchedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * アプリ情報を取得
 * GET /api/reviews/:appId/info
 */
router.get('/:appId/info', async (req, res) => {
  try {
    const { appId } = req.params;
    
    console.log(`Fetching app info for ${appId}`);
    const appInfo = await appStoreService.getAppInfo(appId);
    
    res.json({
      success: true,
      data: appInfo
    });

  } catch (error) {
    console.error('Error fetching app info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * サンプルアプリIDを取得
 * GET /api/reviews/sample/apps
 */
router.get('/sample/apps', (req, res) => {
  try {
    const sampleApps = appStoreService.getSampleAppIds();
    
    res.json({
      success: true,
      data: sampleApps,
      count: sampleApps.length
    });

  } catch (error) {
    console.error('Error getting sample apps:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * レビューの感情分析を実行
 * POST /api/reviews/:appId/analyze
 */
router.post('/:appId/analyze', 
  [
    check('appId').isNumeric().withMessage('App ID must be a number'),
    check('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be a number between 1 and 200')
  ],
  validate,
  async (req, res) => {
  try {
    const { appId } = req.params;
    const { limit = 50 } = req.body;
    
    console.log(`Starting sentiment analysis for app ${appId}`);
    
    // まずレビューを取得
    const reviews = await appStoreService.fetchReviews(appId, parseInt(limit));
    
    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No reviews found for analysis'
      });
    }

    // 感情分析を実行
    console.log(`Analyzing ${reviews.length} reviews...`);
    const analyzedReviews = await geminiService.analyzeSentiment(reviews);
    
    // 統計情報を生成
    const statistics = geminiService.generateStatistics(analyzedReviews);
    
    const analysisKey = `analysis_${appId}_${limit}`;
    cache.set(analysisKey, {
      data: {
        reviews: analyzedReviews,
        statistics
      },
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: {
        reviews: analyzedReviews,
        statistics
      },
      appId,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * キャッシュされた分析結果を取得
 * GET /api/reviews/:appId/analysis
 */
router.get('/:appId/analysis', (req, res) => {
  try {
    const { appId } = req.params;
    const { limit = 50 } = req.query;
    
    const analysisKey = `analysis_${appId}_${limit}`;
    
    if (cache.has(analysisKey)) {
      const cachedData = cache.get(analysisKey);
      return res.json({
        success: true,
        data: cachedData.data,
        cached: true,
        cachedAt: new Date(cachedData.timestamp).toISOString()
      });
    }

    res.status(404).json({
      success: false,
      error: 'No analysis data found. Please run analysis first.'
    });

  } catch (error) {
    console.error('Error getting analysis data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * キャッシュをクリア
 * DELETE /api/reviews/cache
 */
router.delete('/cache', (req, res) => {
  try {
    const cacheSize = cache.size;
    cache.clear();
    
    res.json({
      success: true,
      message: `Cleared ${cacheSize} cache entries`,
      clearedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;