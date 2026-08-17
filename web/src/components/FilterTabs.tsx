export interface FilterTab {
  label: string;
  value: string;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  activeTab: string;
  onChange: (value: string) => void;
}

/**
 * Reusable horizontal filter tab component.
 * Shows tabs with the active tab highlighted. Scrollable on mobile.
 */
export default function FilterTabs({ tabs, activeTab, onChange }: FilterTabsProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar -mx-3 md:-mx-4 px-3 md:px-4">
      <div className="flex items-center gap-2 min-w-min pb-1">
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`flex-shrink-0 px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-colors no-select ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 active:bg-gray-50'
              }`}
              style={{ minHeight: '40px' }}
              aria-pressed={isActive}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
