import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper dark:bg-night text-ink dark:text-paper">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <span className="font-serif text-xl font-semibold">Ledgerly</span>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary">Log in</Link>
          <Link to="/register" className="btn-primary">Get started</Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl leading-tight mb-5">
            Know exactly where your money goes.
          </h1>
          <p className="text-ink-soft dark:text-paper/70 text-lg mb-8 max-w-md">
            Track income and expenses across accounts and currencies, set monthly budgets,
            and see your savings rate change in real time &mdash; all in one ledger.
          </p>
          <div className="flex gap-3">
            <Link to="/register" className="btn-primary text-base px-6 py-3">Create a free account</Link>
            <Link to="/login" className="btn-secondary text-base px-6 py-3">I have an account</Link>
          </div>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-wide text-ink-faint mb-4">This month</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Stat label="Income" value="\u20B980,000" tone="teal" />
            <Stat label="Expenses" value="\u20B925,000" tone="brick" />
          </div>
          <div className="flex items-center justify-between border-t border-line dark:border-white/10 pt-4">
            <span className="text-sm text-ink-faint">Net savings</span>
            <span className="figure text-lg font-semibold text-teal-600 dark:text-teal-400">
              +\u20B955,000
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-ink-faint">Savings rate</span>
            <span className="figure text-lg font-semibold">68.8%</span>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-6">
        <Feature title="Multi-currency" text="Record transactions in seven major currencies with clear, honest conversion labeling." />
        <Feature title="Real budgets" text="Set an overall and per-category monthly budget, and see utilization update as you spend." />
        <Feature title="Built for clarity" text="Every chart and number is computed from your own ledger. No fake demo data, ever." />
      </section>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div>
      <p className="text-xs text-ink-faint mb-1">{label}</p>
      <p className={`figure text-2xl font-semibold ${tone === 'teal' ? 'text-teal-600 dark:text-teal-400' : 'text-brick-500'}`}>
        {value}
      </p>
    </div>
  );
}

function Feature({ title, text }) {
  return (
    <div className="border-t-2 border-teal-500 pt-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-ink-soft dark:text-paper/70">{text}</p>
    </div>
  );
}
