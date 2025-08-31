import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// 非同期アクション
export const fetchReviews = createAsyncThunk(
  'reviews/fetchReviews',
  async ({ appId, limit = 50, forceRefresh = false }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reviews/${appId}`, {
        params: { limit, forceRefresh }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchAppInfo = createAsyncThunk(
  'reviews/fetchAppInfo',
  async (appId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reviews/${appId}/info`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const analyzeReviews = createAsyncThunk(
  'reviews/analyzeReviews',
  async ({ appId, limit = 50 }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/reviews/${appId}/analyze`, { limit });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchSampleApps = createAsyncThunk(
  'reviews/fetchSampleApps',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/reviews/sample/apps');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

const initialState = {
  reviews: [],
  analyzedReviews: [],
  currentApp: null,
  appInfo: null,
  sampleApps: [],
  statistics: null,
  loading: {
    reviews: false,
    analysis: false,
    appInfo: false,
    sampleApps: false,
  },
  error: {
    reviews: null,
    analysis: null,
    appInfo: null,
    sampleApps: null,
  },
  filters: {
    sentiment: 'all',
    rating: [],
    keywords: [],
    dateRange: { start: null, end: null }
  }
};

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    setCurrentApp: (state, action) => {
      state.currentApp = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearReviews: (state) => {
      state.reviews = [];
      state.analyzedReviews = [];
      state.statistics = null;
    },
    clearErrors: (state) => {
      state.error = {
        reviews: null,
        analysis: null,
        appInfo: null,
        sampleApps: null,
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchReviews
      .addCase(fetchReviews.pending, (state) => {
        state.loading.reviews = true;
        state.error.reviews = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading.reviews = false;
        state.reviews = action.payload.data;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading.reviews = false;
        state.error.reviews = action.payload;
      })
      
      // fetchAppInfo
      .addCase(fetchAppInfo.pending, (state) => {
        state.loading.appInfo = true;
        state.error.appInfo = null;
      })
      .addCase(fetchAppInfo.fulfilled, (state, action) => {
        state.loading.appInfo = false;
        state.appInfo = action.payload.data;
      })
      .addCase(fetchAppInfo.rejected, (state, action) => {
        state.loading.appInfo = false;
        state.error.appInfo = action.payload;
      })
      
      // analyzeReviews
      .addCase(analyzeReviews.pending, (state) => {
        state.loading.analysis = true;
        state.error.analysis = null;
      })
      .addCase(analyzeReviews.fulfilled, (state, action) => {
        state.loading.analysis = false;
        state.analyzedReviews = action.payload.data.reviews;
        state.statistics = action.payload.data.statistics;
      })
      .addCase(analyzeReviews.rejected, (state, action) => {
        state.loading.analysis = false;
        state.error.analysis = action.payload;
      })
      
      // fetchSampleApps
      .addCase(fetchSampleApps.pending, (state) => {
        state.loading.sampleApps = true;
        state.error.sampleApps = null;
      })
      .addCase(fetchSampleApps.fulfilled, (state, action) => {
        state.loading.sampleApps = false;
        state.sampleApps = action.payload.data;
      })
      .addCase(fetchSampleApps.rejected, (state, action) => {
        state.loading.sampleApps = false;
        state.error.sampleApps = action.payload;
      });
  },
});

export const { setCurrentApp, setFilters, clearReviews, clearErrors } = reviewsSlice.actions;
export default reviewsSlice.reducer;