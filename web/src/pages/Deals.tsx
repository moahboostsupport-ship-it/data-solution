import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePackages } from '../hooks/usePackages';
import type { Package, PackageCategory } from '../lib/types';
import PackageSection from '../components/PackageSection';
import HighlightedOffer from '../components/HighlightedOffer';
import TimeNoticeBanner from '../components/TimeNoticeBanner';
import FilterTabs from '../components/FilterTabs';
import SearchBar from '../components/SearchBar';

interface CategoryConfig {
  key: PackageCategory;
  icon: string;
  title: string;
  subtitle?: string;
  filter: string;
}

const CATEGORY_ORDER: CategoryConfig[] = [
  { key: 'bingwa_data', icon: '🔥', title: 'BINGWA DATA DEALS', filter: 'Data' },
  { key: 'sms', icon: '💬', title: 'SMS DEALS', filter: 'SMS' },
  { key: 'minutes', icon: '📞', title: 'MINUTES DEALS', filter: 'Minutes' },
  { key: 'highlighted', icon: '⭐', title: 'HIGHLIGHTED OFFER', filter: 'Special' },
  { key: 'tunukiwa', icon: '🔥', title: 'TUNUKIWA DEALS', filter: 'Special' },
];

const FILTER_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Data', value: 'Data' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Minutes', value: 'Minutes' },
  { label: 'Special', value: 'Special' },
];

/**
 * Deals page showing all package categories in sections.
 * Includes filter tabs, search, and time-based notice.
 */
export default function Deals() {
  const navigate = useNavigate();
  const { groupedByCategory, packages, loading } = usePackages();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Search filter
  const searchFilteredPackages = useMemo(() => {
    if (!searchQuery.trim()) return packages;
    const q = searchQuery.trim().toLowerCase();
    return packages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.price.toString().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
    );
  }, [packages, searchQuery]);

  // Determine if 1GB 1HR package exists in data
  const has1GB1HR = useMemo(
    () => packages.some((p) => p.id === 'bingwa-1gb-1hr'),
    [packages]
  );

  const handleSelectPackage = (pkg: Package) => {
    navigate(`/checkout/${pkg.id}`);
  };

  // Render sections based on filter
  const visibleSections = useMemo(() => {
    if (activeFilter === 'all') return CATEGORY_ORDER;
    return CATEGORY_ORDER.filter((c) => c.filter === activeFilter);
  }, [activeFilter]);

  // Get highlighted offer package
  const highlightedPkg = useMemo(() => {
    const highlighted = groupedByCategory['highlighted'];
    return highlighted && highlighted.length > 0 ? highlighted[0] : null;
  }, [groupedByCategory]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="pt-2">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">All Deals</h1>
        <p className="text-sm text-gray-500 mt-1">Choose your package and get connected instantly</p>
      </div>

      {/* Search */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by name or price..."
      />

      {/* Filter tabs */}
      <FilterTabs tabs={FILTER_TABS} activeTab={activeFilter} onChange={setActiveFilter} />

      {/* Time notice for 1GB 1HR package */}
      {has1GB1HR && <TimeNoticeBanner />}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-sm font-medium">Loading packages...</span>
          </div>
        </div>
      )}

      {/* Package sections */}
      {!loading && (
        <div className="space-y-2">
          {visibleSections.map((section) => {
            const sectionPackages = (searchFilteredPackages || packages).filter(
              (p) => p.category === section.key
            );

            if (sectionPackages.length === 0) return null;

            // Highlighted offer gets special rendering
            if (section.key === 'highlighted' && highlightedPkg) {
              return (
                <HighlightedOffer
                  key={section.key}
                  name={highlightedPkg.name}
                  price={highlightedPkg.price}
                  validity={highlightedPkg.validity}
                  onClick={() => handleSelectPackage(highlightedPkg)}
                />
              );
            }

            return (
              <PackageSection
                key={section.key}
                title={section.title}
                icon={section.icon}
                packages={sectionPackages}
                onSelectPackage={handleSelectPackage}
              />
            );
          })}
        </div>
      )}

      {/* No results */}
      {!loading && searchFilteredPackages.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <span className="text-4xl">🔍</span>
          <p className="text-base text-gray-500 mt-3">No packages found matching "{searchQuery}"</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 text-brand-600 font-semibold text-sm underline"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
