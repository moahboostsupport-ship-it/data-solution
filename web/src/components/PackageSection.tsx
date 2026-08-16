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
    <section className="mb-10">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-2xl">{icon}</span>}
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      {subtitle && (
        <p className="text-sm md:text-base text-gray-500 mb-4 ml-9">{subtitle}</p>
      )}

      {/* Package grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
