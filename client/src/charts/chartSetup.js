import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export const CHART_COLORS = {
  income: '#0E6E5D',
  expense: '#A6432E',
  net: '#12151A',
  palette: ['#0E6E5D', '#A6432E', '#C08A2E', '#1D8F78', '#767C86', '#833224', '#0B5A4B', '#DAD7CC'],
};
