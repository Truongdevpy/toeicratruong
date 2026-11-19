import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  className = '',
}) => {
  return (
    <div className={`relative w-full ${className}`}>
      {/* Scrollable container with edge fade */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-surface rounded-full border border-hairline no-scrollbar">
        {items.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none min-h-[36px] ${
                isActive
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-slate-custom hover:text-charcoal hover:bg-white/80'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface-soft text-slate-custom'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
