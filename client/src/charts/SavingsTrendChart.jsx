import { Line } from 'react-chartjs-2';
import '../charts/chartSetup';

export default function SavingsTrendChart({ series, currency }) {
  const filtered = series.filter((s) => s.currency === currency);
  const months = [...new Set(filtered.map((s) => s.month))].sort();

  if (months.length === 0) {
    return <p className="text-sm text-ink-faint py-10 text-center">Not enough data yet to chart a trend.</p>;
  }

  const netByMonth = months.map((m) => {
    const income = Number(filtered.find((s) => s.month === m && s.type === 'INCOME')?.total || 0);
    const expense = Number(filtered.find((s) => s.month === m && s.type === 'EXPENSE')?.total || 0);
    return income - expense;
  });

  const data = {
    labels: months,
    datasets: [
      {
        label: 'Net savings',
        data: netByMonth,
        borderColor: '#0E6E5D',
        backgroundColor: 'rgba(14,110,93,0.12)',
        fill: true,
        tension: 0.25,
        pointRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { ticks: { callback: (v) => v.toLocaleString() } } },
  };

  return (
    <div style={{ height: 260 }}>
      <Line data={data} options={options} />
    </div>
  );
}
