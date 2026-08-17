import type { BadgeType, PackageCategory, PurchaseFrequency } from '../lib/types';

interface PackageCardProps {
  name: string;
  price: number;
  validity: string;
  category: PackageCategory;
  badge?: BadgeType;
  purchaseFrequency: PurchaseFrequency;
  onClick: () => void;
}

const categoryEmojis: Record<PackageCategory, string> = {
  bingwa_data: '📶',
  sms: '💬',
  minutes: '📞',
  highlighted: '⭐',
  tunukiwa: '🔥',
};

const badgeColors: Record<NonNullable<BadgeType>, string> = {
  'BEST VALUE': 'bg-brand-600 text-white',
  'POPULAR': 'bg-orange-500 text-white',
  'LIMITED TIME': 'bg-red-500 text-white',
  'BUY MANY TIMES': 'bg-blue-500 text-white',
};

export default function PackageCard({
  name,
  price,
  validity,
  category,
  badge,
  purchaseFrequency,
  onClick,
}: PackageCardProps) {
  const emoji = categoryEmojis[category] || '📦';

  return (
    <button
      onClick={onClick}
      className="relative w-full text-left bg-white rounded-xl p-3 card-shadow hover:card-shadow-hover active:scale-[0.97] transition-all no-select overflow-hidden border-t-[3px] border-brand-500"
      style={{ minHeight: '120px' }}
    >
      {/* Badge ribbon */}
      {badge && (
        <div className={`badge-ribbon ${badgeColors[badge]} font-bold`}>
          {badge}
        </div>
      )}

      {/* Emoji + name in one row */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xl">{emoji}</span>
        <h3 className="text-sm font-semibold text-gray-800 leading-tight">{name}</h3>
      </div>

      {/* Validity */}
      <p className="text-[11px] text-gray-400 mb-2">{validity}</p>

      {/* PRICE */}
      <div className="flex items-baseline gap-0.5">
        <span className="text-sm font-bold text-brand-700">KSh</span>
        <span className="text-2xl font-extrabold text-brand-600 leading-none">
          {price.toLocaleString('en-KE')}
        </span>
      </div>

      {/* Purchase frequency */}
      <div className="mt-1.5">
        <span
          className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${
            purchaseFrequency === 'buy_once'
              ? 'bg-brand-50 text-brand-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {purchaseFrequency === 'buy_once' ? '🔑 Buy Once' : '🔁 Many Times'}
        </span>
      </div>
    </button>
  );
}
