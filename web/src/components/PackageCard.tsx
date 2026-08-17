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
      className="relative w-full text-left bg-white rounded-xl p-2.5 card-shadow hover:card-shadow-hover active:scale-[0.97] transition-all no-select overflow-hidden border-t-[3px] border-brand-500"
      style={{ minHeight: '108px' }}
    >
      {/* Badge ribbon */}
      {badge && (
        <div className={`badge-ribbon ${badgeColors[badge]} font-bold`}>
          {badge}
        </div>
      )}

      {/* Emoji + name in one row */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-lg">{emoji}</span>
        <h3 className="text-xs font-semibold text-gray-800 leading-tight">{name}</h3>
      </div>

      {/* Validity */}
      <p className="text-[10px] text-gray-400 mb-1.5">{validity}</p>

      {/* PRICE */}
      <div className="flex items-baseline gap-0.5">
        <span className="text-xs font-bold text-brand-700">KSh</span>
        <span className="text-xl font-extrabold text-brand-600 leading-none">
          {price.toLocaleString('en-KE')}
        </span>
      </div>

      {/* Purchase frequency */}
      <div className="mt-1">
        <span
          className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
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
