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
    <section className="mb-10">
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-8"
        style={{
          background: 'linear-gradient(135deg, #003D1D 0%, #005C2B 30%, #00A14B 70%, #43B02A 100%)',
          boxShadow: '0 4px 24px rgba(0, 92, 43, 0.25)',
        }}
      >
        {/* Decorative elements */}
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-16 -left-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4DDB7E 0%, transparent 70%)' }}
        />

        <div className="relative flex flex-col md:flex-row items-center gap-6">
          {/* Left: Star + Label */}
          <div className="flex flex-col items-center text-center md:text-left md:items-start">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-4xl">⭐</span>
              <span className="bg-white/20 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Highlighted Offer
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">{name}</h3>
            <p className="text-white/80 text-sm md:text-base">{validity}</p>
          </div>

          {/* Right: Price + CTA */}
          <div className="flex flex-col items-center gap-3 ml-auto">
            <div className="text-center">
              <span className="block text-white/70 text-sm font-medium">Price</span>
              <div className="flex items-baseline gap-1 justify-center">
                <span className="text-2xl font-bold text-white/90">KSh</span>
                <span className="text-5xl md:text-6xl font-extrabold text-white leading-none">
                  {price}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">
                🔁 Buy Many Times!
              </span>
              <button
                onClick={onClick}
                className="bg-white text-brand-700 font-bold text-lg px-8 py-3 rounded-2xl no-select hover:bg-gray-50 transition-all active:scale-[0.98] w-full"
                style={{ minHeight: '52px' }}
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
