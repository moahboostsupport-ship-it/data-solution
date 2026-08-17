import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Deals', path: '/deals' },
  { label: 'Orders', path: '/orders' },
  { label: 'How It Works', path: '/#how-it-works' },
  { label: 'Contact', path: '/#contact' },
];

export default function MobileHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header
      className="md:hidden sticky top-0 z-50 safe-top"
      style={{
        background: 'linear-gradient(90deg, #003D1D 0%, #005C2B 50%, #00A14B 100%)',
        boxShadow: '0 2px 12px rgba(0, 61, 29, 0.2)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 no-underline"
          onClick={() => setOpen(false)}
        >
          <span className="text-xl">📶</span>
          <span className="text-base font-bold text-white tracking-tight">
            DATA SOLUTION
          </span>
        </Link>

        {/* Hamburger toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="flex items-center justify-center w-10 h-10 rounded-lg text-white touch-target no-select"
        >
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <nav
          className="bg-white border-t border-brand-100 pb-2"
          style={{ boxShadow: '0 4px 12px rgba(0, 61, 29, 0.12)' }}
        >
          {navLinks.map((link) => {
            const isActive = link.path.startsWith('/#')
              ? location.pathname === '/'
              : location.pathname === link.path;
            return (
              <Link
                key={link.label}
                to={link.path}
                onClick={() => setOpen(false)}
                className={`block px-5 py-3 text-[15px] font-medium no-underline touch-target ${
                  isActive ? 'text-brand-600 font-bold bg-brand-50' : 'text-gray-700'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
