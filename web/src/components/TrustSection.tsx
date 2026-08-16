const trustItems = [
  { label: 'Fast', icon: LightningIcon },
  { label: 'Affordable', icon: PriceIcon },
  { label: 'Reliable', icon: ShieldIcon },
];

export default function TrustSection() {
  return (
    <section className="mb-8">
      <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 py-4">
        {trustItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2 text-gray-600">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                <Icon />
              </div>
              <span className="font-semibold text-base">{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LightningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00A14B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function PriceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00A14B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00A14B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
