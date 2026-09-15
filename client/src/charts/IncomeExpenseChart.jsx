import { Bar } from 'react-chartjs-2';
import '../charts/chartSetup';
import { CHART_COLORS } from '../charts/chartSetup';

/**
 * series: array of { month, currency, type, total } rows from
 * /dashboard/income-vs-expenses. Since amounts across different currencies
 * cannot be summed, this chart renders the series for a single selected
 * currency (the display currency) and notes when other currencies exist.
 */
export default function IncomeExpenseChart({ series, currency }) {
  const filtered = series.filter((s) => s.currency === currency);
  const months = [...new Set(filtered.map((s) => s.month))].sort();

  const incomeByMonth = months.map((m) => Number(filtered.find((s) => s.month === m && s.type === 'INCOME')?.total || 0));
  const expenseByMonth = months.map((m) => Number(filtered.find((s) => s.month === m && s.type === 'EXPENSE')?.total || 0));

  const data = {
    labels: months,
    datasets: [
      { label: 'Income', data: incomeByMonth, backgroundColor: CHART_COLORS.income, borderRadius: 3 },
      { label: 'Expenses', data: expenseByMonth, backgroundColor: CHART_COLORS.expense, borderRadius: 3 },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v) => v.toLocaleString() } },
    },
  };

  if (months.length === 0) {
    return <p className="text-sm text-ink-faint py-10 text-center">No transactions yet in {currency}.</p>;
  }

  return (
    <div style={{ height: 280 }}>
      <Bar data={data} options={options} />
    </div>
  );
}
