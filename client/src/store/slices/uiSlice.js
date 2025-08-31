import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedTab: 0,
  sidebarOpen: false,
  notifications: [],
  theme: 'light',
  dateRange: {
    start: null,
    end: null
  },
  chartSettings: {
    showDataLabels: true,
    animationEnabled: true,
    colorScheme: 'default'
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedTab: (state, action) => {
      state.selectedTab = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        ...action.payload
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setDateRange: (state, action) => {
      state.dateRange = action.payload;
    },
    setChartSettings: (state, action) => {
      state.chartSettings = { ...state.chartSettings, ...action.payload };
    }
  }
});

export const {
  setSelectedTab,
  toggleSidebar,
  setSidebarOpen,
  addNotification,
  removeNotification,
  clearNotifications,
  setTheme,
  setDateRange,
  setChartSettings
} = uiSlice.actions;

export default uiSlice.reducer;