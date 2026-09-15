import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LedgerIcon },
  { to: '/transactions', label: 'Transactions', icon: ListIcon },
  { to: '/budgets', label: 'Budgets', icon: TargetIcon },
  { to: '/accounts', label: 'Accounts', icon: WalletIcon },
  { to: '/categories', label: 'Categories', icon: TagIcon },
  { to: '/reports', label: 'Reports', icon: ChartIcon },
  { to: '/settings', label: 'Settings', icon: GearIcon },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-night text-ink dark:text-paper flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-line dark:border-white/10 bg-paper-raised dark:bg-night-raised">
        <Brand />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="p-3 border-t border-line dark:border-white/10">
          <button type="button" onClick={handleLogout} className="btn-secondary w-full">
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-paper-raised dark:bg-night-raised flex flex-col">
            <Brand />
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.to} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </nav>
            <div className="p-3 border-t border-line dark:border-white/10">
              <button type="button" onClick={handleLogout} className="btn-secondary w-full">
                Log out
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-line dark:border-white/10 flex items-center justify-between px-4 gap-4">
          <button
            type="button"
            className="md:hidden p-2 -ml-2"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded hover:bg-paper-sunken dark:hover:bg-white/5"
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <NavLink to="/settings" className="text-sm font-medium hover:text-teal-600 dark:hover:text-teal-400">
              {user?.name}
            </NavLink>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="h-14 flex items-center px-4 border-b border-line dark:border-white/10">
      <span className="font-serif text-lg font-semibold">Ledgerly</span>
    </div>
  );
}

function NavItem({ to, label, icon: Icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors ${
          isActive
            ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400'
            : 'text-ink-soft dark:text-paper/70 hover:bg-paper-sunken dark:hover:bg-white/5'
        }`
      }
    >
      <Icon />
      {label}
    </NavLink>
  );
}

/* Minimal inline icon set (no external icon dependency needed) */
function iconProps() {
  return { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
}
function LedgerIcon() { return (<svg {...iconProps()}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg>); }
function ListIcon() { return (<svg {...iconProps()}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>); }
function TargetIcon() { return (<svg {...iconProps()}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>); }
function WalletIcon() { return (<svg {...iconProps()}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h3M3 10h18"/></svg>); }
function TagIcon() { return (<svg {...iconProps()}><path d="M20.59 13.41 12 22l-9-9 8.59-8.59A2 2 0 0 1 13 4h6a2 2 0 0 1 2 2v6a2 2 0 0 1-.41 1.41Z"/><circle cx="16" cy="8" r="1.2"/></svg>); }
function ChartIcon() { return (<svg {...iconProps()}><path d="M4 20V10M11 20V4M18 20v-7"/></svg>); }
function GearIcon() { return (<svg {...iconProps()}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></svg>); }
function MenuIcon() { return (<svg {...iconProps()}><path d="M3 6h18M3 12h18M3 18h18"/></svg>); }
function SunIcon() { return (<svg {...iconProps()}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>); }
function MoonIcon() { return (<svg {...iconProps()}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>); }
