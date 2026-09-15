import { Link, Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-paper dark:bg-night text-ink dark:text-paper flex flex-col">
      <header className="p-5">
        <Link to="/" className="font-serif text-lg font-semibold">
          Ledgerly
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
