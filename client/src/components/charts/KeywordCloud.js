import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

const KeywordCloud = ({ data }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;

    // シンプルなワードクラウド風の表示を作成
    const container = containerRef.current;
    if (!container) return;

    // 既存の内容をクリア
    container.innerHTML = '';

    // データを頻度順にソート
    const sortedKeywords = Object.entries(data)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30); // 上位30個まで表示

    // 最大頻度を取得してフォントサイズの計算に使用
    const maxFreq = Math.max(...Object.values(data));
    const minFreq = Math.min(...Object.values(data));

    sortedKeywords.forEach(([keyword, frequency]) => {
      const span = document.createElement('span');
      
      // 頻度に基づいてフォントサイズを計算 (12px - 32px)
      const fontSize = 12 + (frequency - minFreq) / (maxFreq - minFreq) * 20;
      
      // 頻度に基づいて色を決定
      const intensity = (frequency - minFreq) / (maxFreq - minFreq);
      const hue = 210; // 青系
      const saturation = 50 + intensity * 50;
      const lightness = 30 + intensity * 30;
      
      span.textContent = keyword;
      span.style.fontSize = `${fontSize}px`;
      span.style.color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      span.style.margin = '4px 8px';
      span.style.display = 'inline-block';
      span.style.fontWeight = intensity > 0.7 ? 'bold' : 'normal';
      span.style.cursor = 'pointer';
      span.style.transition = 'transform 0.2s';
      
      // ホバー効果
      span.addEventListener('mouseenter', () => {
        span.style.transform = 'scale(1.1)';
        span.title = `出現回数: ${frequency}`;
      });
      
      span.addEventListener('mouseleave', () => {
        span.style.transform = 'scale(1)';
      });
      
      container.appendChild(span);
    });
  }, [data]);

  if (!data || Object.keys(data).length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          キーワードデータがありません
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        minHeight: '200px',
        p: 2,
        textAlign: 'center',
        lineHeight: 1.8,
        backgroundColor: '#fafafa',
        borderRadius: 1,
        border: '1px solid #e0e0e0'
      }}
    />
  );
};

export default KeywordCloud;