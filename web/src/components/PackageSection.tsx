import type { Package } from '../lib/types';
import PackageCard from './PackageCard';

interface PackageSectionProps {
  title: string;
  subtitle?: string;
  icon?: string;
  packages: Package[];
  onSelectPackage: (pkg: Package) => void;
}

export default function PackageSection({
  title,
  subtitle,
  icon,
  packages,
  onSelectPackage,
}: PackageSectionProps) {
  return (
    <section className="mb-4 md:mb-6">
      {/* Section header */}
      <div className="flex items-center gap-1 mb-1.5 md:mb-2">
        {icon && <span className="text-base md:text-lg">{icon}</span>}
        <h2 className="text-sm md:text-xl font-bold text-gray-900">{title}</h2>
      </div>
      {subtitle && (
        <p className="text-[11px] md:text-sm text-gray-500 mb-2 md:mb-3 ml-6">{subtitle}</p>
      )}

      {/* Package grid — 2 cols mobile, more on larger */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            name={pkg.name}
            price={pkg.price}
            validity={pkg.validity}
            category={pkg.category}
            badge={pkg.badge}
            purchaseFrequency={pkg.purchase_frequency}
            onClick={() => onSelectPackage(pkg)}
          />
        ))}
      </div>
    </section>
  );
}
