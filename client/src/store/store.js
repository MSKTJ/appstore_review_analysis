import { configureStore } from '@reduxjs/toolkit';
import reviewsReducer from './slices/reviewsSlice';
import analysisReducer from './slices/analysisSlice';
import uiReducer from './slices/uiSlice';

const store = configureStore({
  reducer: {
    reviews: reviewsReducer,
    analysis: analysisReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;