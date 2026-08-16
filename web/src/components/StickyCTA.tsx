import { Link } from 'react-router-dom';

export default function StickyCTA() {
  return (
    <div
      className="md:hidden fixed bottom-14 left-0 right-0 z-40 px-4 py-2 bg-white/95 backdrop-blur-sm"
      style={{ 
        paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))',
        boxShadow: '0 -1px 8px rgba(0, 92, 43, 0.08)'
      }}
    >
      <Link
        to="/deals"
        className="flex items-center justify-center w-full text-white text-lg font-bold py-3 rounded-2xl no-underline no-select transition-all active:scale-[0.98]"
        style={{ 
          minHeight: '52px',
          background: 'linear-gradient(135deg, #007A38 0%, #00A14B 100%)',
          boxShadow: '0 2px 12px rgba(0, 161, 75, 0.3)'
        }}
      >
        📶 BUY DATA
      </Link>
    </div>
  );
}
