import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Home', path: '/', icon: HomeIcon },
  { label: 'Deals', path: '/deals', icon: DealsIcon },
  { label: 'Orders', path: '/orders', icon: OrdersIcon },
  { label: 'Help', path: '/help', icon: HelpIcon },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white flex items-stretch justify-around safe-pb"
      style={{ boxShadow: '0 -2px 12px rgba(0, 92, 43, 0.1)' }}
    >
      {/* Top green accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-50" />
      
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            to={item.path}
            className={`relative flex flex-col items-center justify-center flex-1 py-2 no-underline transition-all touch-target ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`}
          >
            {/* Active green indicator bar */}
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-brand-500" />
            )}
            <Icon filled={isActive} />
            <span className={`text-[11px] mt-0.5 ${isActive ? 'font-bold text-brand-600' : 'font-medium'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ===== Inline SVG icons =====

function HomeIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function DealsIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      {filled && <circle cx="7" cy="7" r="1.5" fill="white" stroke="none" />}
      {!filled && <line x1="7" y1="7" x2="7.01" y2="7" />}
    </svg>
  );
}

function OrdersIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11H5a2 2 0 0 0-2 2v7h18v-7a2 2 0 0 0-2-2h-4" />
      <path d="M12 11V4a2 2 0 0 0-2 2H6a2 2 0 0 0-2 2v3" />
    </svg>
  );
}

function HelpIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
