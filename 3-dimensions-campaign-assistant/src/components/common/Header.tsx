import React from 'react';
import {
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { PageId } from './Sidebar';

interface HeaderProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  datasetRecordCount: number;
  onRefreshData?: () => void;
}

const PAGE_TITLES: Record<PageId, { title: string; subtitle: string }> = {
  'marketing-insights': {
    title: 'Marketing Insights',
    subtitle: 'Deterministic analytics from active Meta publications CSV',
  },
  'campaign-library': {
    title: 'Campaign Library',
    subtitle: 'Manage, duplicate, and track structured 3D printing campaign briefs & plans',
  },
  'new-campaign': {
    title: 'New Campaign Creation',
    subtitle: 'Fill brief specifications, review assumptions, and generate 3 Gemini directions',
  },
  'campaign-plan': {
    title: 'Campaign Plan & Content Calendar',
    subtitle: 'Detailed strategic directions, content mix, production briefs, and lockable outputs',
  },
  'content-review': {
    title: 'Content Review Workspace',
    subtitle: 'Inspect scripts, captions, versions, staff assignments, and human approval status',
  },
  'data-knowledge': {
    title: 'Data & Knowledge Management',
    subtitle: 'Meta CSV dataset validator, Brand Kit, 3D Products catalog, and Feedback Memory',
  },
  settings: {
    title: 'Workspace Settings & Directory',
    subtitle: 'Staff team list, defaults, and full JSON database export/import',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  datasetRecordCount,
}) => {
  const currentInfo = PAGE_TITLES[currentPage];

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20 px-6 py-4 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Subtitle */}
        <div>
          <h1 className="text-xl font-black text-[#15192B] tracking-tight flex items-center gap-2">
            {currentInfo.title}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{currentInfo.subtitle}</p>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Action Buttons */}
          {currentPage !== 'new-campaign' && (
            <button
              onClick={() => onNavigate('new-campaign')}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New Campaign</span>
            </button>
          )}

          {currentPage === 'marketing-insights' && (
            <button
              onClick={() => onNavigate('data-knowledge')}
              className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#172DC3]" />
              <span>Dataset & Knowledge</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
