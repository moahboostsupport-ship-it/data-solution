import { Link } from 'react-router-dom';

/**
 * Simple 404 page with link back to home.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <span className="text-6xl mb-4">🔍</span>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-base text-gray-500 mb-8 max-w-sm">
        Sorry, we couldn't find the page you're looking for. It may have been moved or no longer exists.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/"
          className="bg-brand-600 text-white font-bold text-lg px-8 py-3.5 rounded-2xl no-underline no-select active:bg-brand-700 transition-colors"
          style={{ minHeight: '52px' }}
        >
          Go Home
        </Link>
        <Link
          to="/deals"
          className="border-2 border-brand-600 text-brand-700 font-bold text-lg px-8 py-3.5 rounded-2xl no-underline no-select hover:bg-brand-50 transition-colors"
          style={{ minHeight: '52px' }}
        >
          Browse Deals
        </Link>
      </div>
    </div>
  );
}
