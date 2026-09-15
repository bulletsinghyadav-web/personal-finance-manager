export default function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-night">
      <div className="flex flex-col items-center gap-3" role="status" aria-label="Loading">
        <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
        <span className="text-sm text-ink-faint">Loading...</span>
      </div>
    </div>
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card p-4 animate-pulse" aria-hidden="true">
      <div className="h-4 w-1/3 bg-line rounded mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-line rounded mb-2 last:mb-0" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="card divide-y divide-line" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
          <div className="h-3 w-24 bg-line rounded" />
          <div className="h-3 flex-1 bg-line rounded" />
          <div className="h-3 w-16 bg-line rounded" />
        </div>
      ))}
    </div>
  );
}
