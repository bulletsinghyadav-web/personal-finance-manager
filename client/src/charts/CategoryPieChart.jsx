import { Pie } from 'react-chartjs-2';
import '../charts/chartSetup';
import { CHART_COLORS } from '../charts/chartSetup';
import { formatMoney } from '../utils/money';

export default function CategoryPieChart({ breakdown, currency }) {
  const filtered = breakdown.filter((b) => b.currency === currency);

  if (filtered.length === 0) {
    return <p className="text-sm text-ink-faint py-10 text-center">No expenses recorded in {currency} for this period.</p>;
  }

  const data = {
    labels: filtered.map((b) => b.category_name || 'Uncategorized'),
    datasets: [
      {
        data: filtered.map((b) => Number(b.total)),
        backgroundColor: filtered.map((_, i) => CHART_COLORS.palette[i % CHART_COLORS.palette.length]),
        borderWidth: 1,
        borderColor: '#F6F5F0',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatMoney(ctx.raw, currency)}`,
        },
      },
    },
  };

  return (
    <div style={{ height: 280 }}>
      <Pie data={data} options={options} />
    </div>
  );
}
