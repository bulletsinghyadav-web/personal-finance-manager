export default function EmptyState({ title, description, action }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center gap-3 py-14 px-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm text-ink-faint max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
