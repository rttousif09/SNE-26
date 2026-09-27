import React from 'react';

export interface SAPTabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface SAPTabsProps {
  tabs: SAPTabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const SAPTabs: React.FC<SAPTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex items-center border-b border-[#b9c4cc] bg-transparent px-1 gap-1 select-none shrink-0 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center space-x-1.5 px-3 py-1 text-[12px] font-medium transition-all relative top-[1px] cursor-pointer whitespace-nowrap ${
              isActive
                ? 'text-[#2d6f91] font-bold border-b-2 border-[#4d91ba] bg-transparent'
                : 'text-[#63717b] hover:text-[#303b44] hover:bg-[#edf2f5] border-b-2 border-transparent'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1 py-0.2 rounded-xs font-mono ml-1 ${
                isActive ? 'bg-[#dcecf6] text-[#2d6f91] font-bold' : 'bg-[#edf2f5] text-[#63717b]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
