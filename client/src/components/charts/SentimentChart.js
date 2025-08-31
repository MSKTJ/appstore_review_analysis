import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const SentimentChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div>データがありません</div>;
  }

  const sentimentCounts = data.reduce((acc, review) => {
    const sentiment = review.analysis?.sentiment || 'neutral';
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {});

  const chartData = {
    labels: ['ポジティブ', 'ネガティブ', '中立'],
    datasets: [
      {
        data: [
          sentimentCounts.positive || 0,
          sentimentCounts.negative || 0,
          sentimentCounts.neutral || 0
        ],
        backgroundColor: [
          '#4caf50',
          '#f44336',
          '#ff9800'
        ],
        borderColor: [
          '#388e3c',
          '#d32f2f',
          '#f57c00'
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed}件 (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default SentimentChart;