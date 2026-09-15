import { Bar } from 'react-chartjs-2';
import '../charts/chartSetup';

export default function BudgetVsActualChart({ budgets }) {
  if (!budgets.length) {
    return <p className="text-sm text-ink-faint py-10 text-center">No budgets set for this year yet.</p>;
  }
  const labels = budgets.map((b) => `${b.month}/${b.year}`);
  const data = {
    labels,
    datasets: [
      { label: 'Budget', data: budgets.map((b) => Number(b.total_budget)), backgroundColor: '#DAD7CC', borderRadius: 3 },
      {
        label: 'Actual spend',
        data: budgets.map((b) => Number(b.spent)),
        backgroundColor: budgets.map((b) => (b.isOverBudget ? '#A6432E' : '#0E6E5D')),
        borderRadius: 3,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => v.toLocaleString() } } },
  };
  return (
    <div style={{ height: 280 }}>
      <Bar data={data} options={options} />
    </div>
  );
}
