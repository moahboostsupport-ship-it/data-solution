import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Deals', path: '/deals' },
  { label: 'How It Works', path: '/#how-it-works' },
  { label: 'Orders', path: '/orders' },
  { label: 'Contact', path: '/#contact' },
];

export default function DesktopNav() {
  const location = useLocation();

  return (
    <header className="hidden md:block sticky top-0 z-50 safe-top" style={{ background: 'linear-gradient(90deg, #003D1D 0%, #005C2B 50%, #00A14B 100%)', boxShadow: '0 2px 12px rgba(0, 61, 29, 0.2)' }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">📶</span>
          <span className="text-xl font-bold text-white tracking-tight">
            DATA SOLUTION
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = link.path.startsWith('/#')
              ? location.pathname === '/'
              : location.pathname === link.path;
            return (
              <Link
                key={link.label}
                to={link.path}
                className={`text-sm font-medium transition-colors no-underline relative ${
                  isActive
                    ? 'text-white font-bold'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-2 left-0 right-0 h-0.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
