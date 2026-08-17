import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden rounded-b-2xl md:rounded-b-none"
      style={{
        background: 'linear-gradient(135deg, #003D1D 0%, #005C2B 30%, #007A38 60%, #00A14B 100%)',
      }}
    >
      {/* Subtle decorative circles */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #4DDB7E 0%, transparent 70%)' }}
      />

      <div className="relative px-4 py-6 md:py-16 max-w-4xl mx-auto text-center">
        {/* Main heading */}
        <h2 className="text-xl md:text-4xl font-bold text-white mb-2 leading-tight">
          CONNECT &amp; STAY AHEAD!
        </h2>

        {/* Subtitle */}
        <p className="text-sm md:text-xl text-white/80 mb-3 font-medium">
          Fast Data • Reliable Network • Best Prices
        </p>

        {/* Okoa banner */}
        <div className="inline-block bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 mb-4">
          <p className="text-white font-bold text-sm md:text-xl">
            📶 PATA DATA HATA UKIWA NA OKOA!
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center items-stretch sm:items-center max-w-md mx-auto">
          <Link
            to="/deals"
            className="flex-1 bg-white text-brand-700 font-bold text-base py-3 px-6 rounded-xl no-underline no-select text-center transition-all hover:shadow-lg active:scale-[0.98]"
          >
            BUY DATA
          </Link>
          <Link
            to="/deals"
            className="flex-1 border-2 border-white text-white font-bold text-base py-3 px-6 rounded-xl no-underline no-select text-center hover:bg-white/10 transition-colors active:scale-[0.98]"
          >
            VIEW ALL DEALS
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-3 flex items-center justify-center gap-4 text-white/70 text-xs md:text-sm font-medium">
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
