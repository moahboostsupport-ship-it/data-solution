import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden rounded-b-3xl md:rounded-b-none"
      style={{
        background: 'linear-gradient(135deg, #003D1D 0%, #005C2B 30%, #007A38 60%, #00A14B 100%)',
      }}
    >
      {/* Subtle decorative circles */}
      <div
        className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #4DDB7E 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-20 -left-10 w-40 h-40 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #4DDB7E 0%, transparent 70%)' }}
      />

      <div className="relative px-6 py-10 md:py-16 max-w-4xl mx-auto text-center">
        {/* Logo + Brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-3xl">📶</span>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            DATA SOLUTION
          </h1>
        </div>

        {/* Main heading */}
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
          CONNECT &amp; STAY AHEAD!
        </h2>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-white/80 mb-6 font-medium">
          Fast Data • Reliable Network • Best Prices
        </p>

        {/* Okoa banner */}
        <div className="inline-block bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-3 mb-8">
          <p className="text-white font-bold text-lg md:text-xl">
            📶 PATA DATA HATA UKIWA NA OKOA!
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center max-w-md mx-auto">
          <Link
            to="/deals"
            className="flex-1 bg-white text-brand-700 font-bold text-lg py-4 px-8 rounded-2xl no-underline no-select text-center transition-all hover:shadow-lg active:scale-[0.98]"
            style={{ minHeight: '56px' }}
          >
            BUY DATA
          </Link>
          <Link
            to="/deals"
            className="flex-1 border-2 border-white text-white font-bold text-lg py-4 px-8 rounded-2xl no-underline no-select text-center hover:bg-white/10 transition-colors active:scale-[0.98]"
            style={{ minHeight: '56px' }}
          >
            VIEW ALL DEALS
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-white/70 text-sm font-medium">
          <span className="flex items-center gap-1">
            <CheckIcon /> Fast
          </span>
          <span className="flex items-center gap-1">
            <CheckIcon /> Affordable
          </span>
          <span className="flex items-center gap-1">
            <CheckIcon /> Reliable
          </span>
        </div>
      </div>
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
