import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// 非同期アクション
export const generateProblemAnalysis = createAsyncThunk(
  'analysis/generateProblemAnalysis',
  async ({ appId, limit = 50, analyzedReviews }, { rejectWithValue }) => {
    try {
      const response = await api.post('/analysis/problems', { 
        appId, 
        limit, 
        analyzedReviews 
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchProblemAnalysis = createAsyncThunk(
  'analysis/fetchProblemAnalysis',
  async ({ appId, limit = 50 }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/analysis/problems/${appId}?limit=${limit}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const generateStatistics = createAsyncThunk(
  'analysis/generateStatistics',
  async (analyzedReviews, { rejectWithValue }) => {
    try {
      const response = await api.post('/analysis/statistics', { analyzedReviews });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const analyzeKeywords = createAsyncThunk(
  'analysis/analyzeKeywords',
  async ({ analyzedReviews, minFrequency = 2 }, { rejectWithValue }) => {
    try {
      const response = await api.post('/analysis/keywords', { analyzedReviews, minFrequency });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const filterReviews = createAsyncThunk(
  'analysis/filterReviews',
  async (filterParams, { rejectWithValue }) => {
    try {
      const response = await api.post('/analysis/filter', filterParams);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

const initialState = {
  problemAnalysis: null,
  detailedStatistics: null,
  keywordAnalysis: null,
  filteredReviews: [],
  loading: {
    problems: false,
    statistics: false,
    keywords: false,
    filter: false,
  },
  error: {
    problems: null,
    statistics: null,
    keywords: null,
    filter: null,
  }
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    clearAnalysis: (state) => {
      state.problemAnalysis = null;
      state.detailedStatistics = null;
      state.keywordAnalysis = null;
      state.filteredReviews = [];
    },
    clearAnalysisErrors: (state) => {
      state.error = {
        problems: null,
        statistics: null,
        keywords: null,
        filter: null,
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // generateProblemAnalysis
      .addCase(generateProblemAnalysis.pending, (state) => {
        state.loading.problems = true;
        state.error.problems = null;
      })
      .addCase(generateProblemAnalysis.fulfilled, (state, action) => {
        state.loading.problems = false;
        state.problemAnalysis = action.payload.data;
      })
      .addCase(generateProblemAnalysis.rejected, (state, action) => {
        state.loading.problems = false;
        state.error.problems = action.payload;
      })
      
      // fetchProblemAnalysis
      .addCase(fetchProblemAnalysis.pending, (state) => {
        state.loading.problems = true;
        state.error.problems = null;
      })
      .addCase(fetchProblemAnalysis.fulfilled, (state, action) => {
        state.loading.problems = false;
        state.problemAnalysis = action.payload.data;
      })
      .addCase(fetchProblemAnalysis.rejected, (state, action) => {
        state.loading.problems = false;
        state.error.problems = action.payload;
      })
      
      // generateStatistics
      .addCase(generateStatistics.pending, (state) => {
        state.loading.statistics = true;
        state.error.statistics = null;
      })
      .addCase(generateStatistics.fulfilled, (state, action) => {
        state.loading.statistics = false;
        state.detailedStatistics = action.payload.data;
      })
      .addCase(generateStatistics.rejected, (state, action) => {
        state.loading.statistics = false;
        state.error.statistics = action.payload;
      })
      
      // analyzeKeywords
      .addCase(analyzeKeywords.pending, (state) => {
        state.loading.keywords = true;
        state.error.keywords = null;
      })
      .addCase(analyzeKeywords.fulfilled, (state, action) => {
        state.loading.keywords = false;
        state.keywordAnalysis = action.payload.data;
      })
      .addCase(analyzeKeywords.rejected, (state, action) => {
        state.loading.keywords = false;
        state.error.keywords = action.payload;
      })
      
      // filterReviews
      .addCase(filterReviews.pending, (state) => {
        state.loading.filter = true;
        state.error.filter = null;
      })
      .addCase(filterReviews.fulfilled, (state, action) => {
        state.loading.filter = false;
        state.filteredReviews = action.payload.data.reviews;
      })
      .addCase(filterReviews.rejected, (state, action) => {
        state.loading.filter = false;
        state.error.filter = action.payload;
      });
  },
});

export const { clearAnalysis, clearAnalysisErrors } = analysisSlice.actions;
export default analysisSlice.reducer;