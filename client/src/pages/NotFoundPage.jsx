import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-night text-ink dark:text-paper px-4">
      <div className="text-center">
        <p className="font-mono text-sm text-ink-faint mb-2">404</p>
        <h1 className="font-serif text-3xl font-semibold mb-3">Page not found</h1>
        <p className="text-ink-faint mb-6">The page you're looking for doesn't exist or has moved.</p>
        <Link to="/" className="btn-primary">Go home</Link>
      </div>
    </div>
  );
}
