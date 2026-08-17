interface HighlightedOfferProps {
  name: string;
  price: number;
  validity: string;
  onClick: () => void;
}

export default function HighlightedOffer({
  name,
  price,
  validity,
  onClick,
}: HighlightedOfferProps) {
  return (
    <section className="mb-4 md:mb-10">
      <div
        className="relative overflow-hidden rounded-2xl md:rounded-3xl p-4 md:p-8"
        style={{
          background: 'linear-gradient(135deg, #003D1D 0%, #005C2B 30%, #00A14B 70%, #43B02A 100%)',
          boxShadow: '0 4px 24px rgba(0, 92, 43, 0.25)',
        }}
      >
        {/* Compact mobile layout / expanded desktop layout */}
        <div className="relative flex flex-row md:flex-col items-center gap-3 md:gap-6">
          {/* Left: Star + Label */}
          <div className="flex flex-col items-start text-left md:items-center md:text-center flex-1 min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
              <span className="text-2xl md:text-4xl">⭐</span>
              <span className="bg-white/20 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider px-2 py-0.5 md:px-3 md:py-1 rounded-full">
                Highlighted
              </span>
            </div>
            <h3 className="text-lg md:text-3xl font-bold text-white leading-tight">{name}</h3>
            <p className="text-white/80 text-xs md:text-base">{validity}</p>
          </div>

          {/* Right: Price + CTA */}
          <div className="flex flex-col items-center gap-2 md:gap-3 flex-shrink-0">
            <div className="text-center">
              <span className="hidden md:block text-white/70 text-sm font-medium">Price</span>
              <div className="flex items-baseline gap-0.5 justify-center">
                <span className="text-base md:text-2xl font-bold text-white/90">KSh</span>
                <span className="text-3xl md:text-6xl font-extrabold text-white leading-none">
                  {price}
                </span>
              </div>
            </div>
            <span className="bg-white/20 text-white text-[10px] md:text-xs font-medium px-2 py-0.5 md:px-3 md:py-1 rounded-full whitespace-nowrap">
              🔁 Buy Many Times!
            </span>
            <button
              onClick={onClick}
              className="bg-white text-brand-700 font-bold text-sm md:text-lg px-6 md:px-8 py-2.5 md:py-3 rounded-xl md:rounded-2xl no-select hover:bg-gray-50 transition-all active:scale-[0.98] w-full"
              style={{ minHeight: '44px' }}
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
