const axios = require('axios');
const xml2js = require('xml2js');

class AppStoreService {
  constructor() {
    this.baseUrl = 'https://itunes.apple.com/jp/rss/customerreviews';
    this.parser = new xml2js.Parser();
  }

  /**
   * App Store RSSフィードからレビューを取得
   * @param {string} appId - アプリID
   * @param {number} limit - 取得件数（デフォルト: 50）
   * @returns {Promise<Array>} レビューデータの配列
   */
  async fetchReviews(appId, limit = 50) {
    try {
      const url = `${this.baseUrl}/id=${appId}/sortby=mostrecent/xml`;
      console.log(`Fetching reviews from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      const result = await this.parser.parseStringPromise(response.data);
      const entries = result.feed?.entry || [];
      
      // 最初のエントリはアプリ情報なのでスキップ
      const reviews = entries.slice(1, limit + 1).map(entry => this.parseReviewEntry(entry));
      
      console.log(`Successfully fetched ${reviews.length} reviews for app ${appId}`);
      return reviews;
    } catch (error) {
      console.error('Error fetching reviews:', error.message);
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }
  }

  /**
   * レビューエントリをパース
   * @param {Object} entry - XMLエントリ
   * @returns {Object} パースされたレビューデータ
   */
  parseReviewEntry(entry) {
    const getTextContent = (field) => {
      if (!field || !field[0]) return '';
      return typeof field[0] === 'string' ? field[0] : field[0]._ || '';
    };

    const getRating = (entry) => {
      const ratingField = entry['im:rating'];
      if (ratingField && ratingField[0]) {
        return parseInt(ratingField[0], 10);
      }
      return null;
    };

    return {
      id: getTextContent(entry.id),
      title: getTextContent(entry.title),
      content: getTextContent(entry.content),
      rating: getRating(entry),
      author: getTextContent(entry.author?.[0]?.name),
      version: getTextContent(entry['im:version']),
      updated: getTextContent(entry.updated),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * アプリ情報を取得
   * @param {string} appId - アプリID
   * @returns {Promise<Object>} アプリ情報
   */
  async getAppInfo(appId) {
    try {
      const url = `https://itunes.apple.com/jp/lookup?id=${appId}`;
      const response = await axios.get(url);
      
      if (response.data.results && response.data.results.length > 0) {
        const app = response.data.results[0];
        return {
          id: app.trackId,
          name: app.trackName,
          bundleId: app.bundleId,
          version: app.version,
          description: app.description,
          averageUserRating: app.averageUserRating,
          userRatingCount: app.userRatingCount,
          genres: app.genres,
          releaseDate: app.releaseDate,
          currentVersionReleaseDate: app.currentVersionReleaseDate
        };
      }
      
      throw new Error('App not found');
    } catch (error) {
      console.error('Error fetching app info:', error.message);
      throw new Error(`Failed to fetch app info: ${error.message}`);
    }
  }

  /**
   * 人気アプリのサンプルIDを取得
   * @returns {Array} サンプルアプリIDの配列
   */
  getSampleAppIds() {
    return [
      '6503927232',  // サンプルアプリ1
      '1064363738',  // サンプルアプリ2
      '1543310444',  // サンプルアプリ3
      '648688812',   // サンプルアプリ4
      '310633997'    // WhatsApp (予備)
    ];
  }
}

module.exports = new AppStoreService();