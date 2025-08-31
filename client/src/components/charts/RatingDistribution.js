import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const RatingDistribution = ({ data }) => {
  if (!data || data.length === 0) {
    return <div>データがありません</div>;
  }

  const ratingCounts = data.reduce((acc, review) => {
    const rating = review.rating || 0;
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {});

  const chartData = {
    labels: ['1⭐', '2⭐', '3⭐', '4⭐', '5⭐'],
    datasets: [
      {
        label: 'レビュー数',
        data: [
          ratingCounts[1] || 0,
          ratingCounts[2] || 0,
          ratingCounts[3] || 0,
          ratingCounts[4] || 0,
          ratingCounts[5] || 0
        ],
        backgroundColor: [
          '#f44336',
          '#ff9800',
          '#ffc107',
          '#8bc34a',
          '#4caf50'
        ],
        borderColor: [
          '#d32f2f',
          '#f57c00',
          '#ff8f00',
          '#689f38',
          '#388e3c'
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
            return `${context.parsed.y}件 (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default RatingDistribution;