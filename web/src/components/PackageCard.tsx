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
      className="relative w-full text-left bg-white rounded-2xl p-5 card-shadow hover:card-shadow-hover active:scale-[0.97] transition-all no-select overflow-hidden border-t-[3px] border-brand-500"
      style={{ minHeight: '160px' }}
    >
      {/* Badge ribbon */}
      {badge && (
        <div className={`badge-ribbon ${badgeColors[badge]} font-bold`}>
          {badge}
        </div>
      )}

      {/* Category emoji */}
      <div className="text-3xl mb-2">{emoji}</div>

      {/* Package name */}
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{name}</h3>

      {/* Validity */}
      <p className="text-sm text-gray-500 mb-3">{validity}</p>

      {/* PRICE — most prominent element */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold text-brand-700">KSh</span>
        <span className="text-4xl font-extrabold text-brand-600 leading-none">
          {price.toLocaleString('en-KE')}
        </span>
      </div>

      {/* Purchase frequency label */}
      <div className="mt-2">
        <span
          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
            purchaseFrequency === 'buy_once'
              ? 'bg-brand-50 text-brand-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {purchaseFrequency === 'buy_once' ? '🔑 Buy Once!' : '🔁 Buy Many Times!'}
        </span>
      </div>
    </button>
  );
}
