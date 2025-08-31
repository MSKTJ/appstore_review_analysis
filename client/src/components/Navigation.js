import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Tabs, 
  Tab, 
  Box, 
  Container 
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  List as ListIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabValue = () => {
    switch (location.pathname) {
      case '/':
        return 0;
      case '/reviews':
        return 1;
      case '/problems':
        return 2;
      default:
        return 0;
    }
  };

  const handleTabChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/reviews');
        break;
      case 2:
        navigate('/problems');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Container maxWidth="xl">
        <Tabs 
          value={getTabValue()} 
          onChange={handleTabChange}
          aria-label="navigation tabs"
        >
          <Tab 
            icon={<DashboardIcon />} 
            label="ダッシュボード" 
            iconPosition="start"
          />
          <Tab 
            icon={<ListIcon />} 
            label="レビュー一覧" 
            iconPosition="start"
          />
          <Tab 
            icon={<AnalyticsIcon />} 
            label="問題分析" 
            iconPosition="start"
          />
        </Tabs>
      </Container>
    </Box>
  );
};

export default Navigation;