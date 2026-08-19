import React from 'react';
import {
  BarChart3,
  FolderKanban,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Database,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Logo } from './Logo';

export type PageId =
  | 'marketing-insights'
  | 'campaign-library'
  | 'campaign-workspace'
  | 'new-campaign'
  | 'content-review'
  | 'data-knowledge'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  activeCampaignName?: string;
  isGenerating?: boolean;
}

const NAV_ITEMS: { id: PageId; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'marketing-insights', label: 'Marketing Insights', icon: BarChart3 },
  { id: 'campaign-library', label: 'Campaign Library', icon: FolderKanban },
  { id: 'new-campaign', label: 'New Campaign', icon: PlusCircle, badge: 'AI' },
  { id: 'content-review', label: 'Content Review', icon: CheckCircle2 },
  { id: 'data-knowledge', label: 'Data & Knowledge', icon: Database },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  activeCampaignName,
  isGenerating = false,
}) => {
  return (
    <aside className="w-64 bg-[#160857] text-slate-100 flex flex-col h-screen sticky top-0 z-30 border-r border-[#201B9F]/30 flex-shrink-0 shadow-xl">
      {/* Top Header & Official Logo */}
      <div className="p-4 border-b border-white/10 flex flex-col gap-2.5">
        <Logo />
        <div className="text-center pt-0.5">
          <span className="text-[11px] font-bold tracking-tight text-slate-200">
            3 Dimensions Campaign Assistant
          </span>
        </div>
      </div>

      {/* Workspace Indicator */}
      <div className="px-5 py-3 bg-[#0f053d]/80 border-b border-white/10 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
        <div className="text-xs text-slate-300 font-medium truncate">
          3D Printing Marketing Studio
        </div>
      </div>

      {/* Active Campaign Context Banner if loaded */}
      {activeCampaignName && (
        <div className="mx-3 mt-3 p-2.5 bg-[#201B9F]/40 border border-[#8478E2]/30 rounded-xl flex items-center justify-between text-xs text-white shadow-xs">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-[#CB19C2] flex-shrink-0 animate-pulse" />
            <span className="truncate font-semibold">{activeCampaignName}</span>
          </div>
          <button
            onClick={() => onNavigate('campaign-workspace')}
            className="text-[10px] bg-gradient-to-r from-[#172DC3] to-[#6344BF] hover:brightness-110 text-white px-2.5 py-1 rounded-lg font-bold transition shadow-2xs cursor-pointer"
          >
            View
          </button>
        </div>
      )}

      {/* Main Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider px-3 mb-2">
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                isActive
                  ? 'bg-[#201B9F] text-white shadow-md shadow-[#160857]/50 border-l-4 border-[#CB19C2]'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 flex-shrink-0 transition-all duration-150 group-hover:scale-110 ${
                    isActive ? 'text-[#8478E2]' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {item.badge && (
                  <span className="text-[10px] bg-[#CB19C2]/20 text-[#CB19C2] border border-[#CB19C2]/30 px-1.5 py-0.2 rounded-md font-bold">
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#CB19C2]" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer / Company Info */}
      <div className="p-4 border-t border-white/10 bg-[#0f053d]/50 text-xs text-slate-300">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-300">Tunis, Tunisia</span>
          <span className="text-[10px] font-mono text-slate-400">v1.0</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-300 font-semibold truncate">
          Infinite Dimensions (3D)
        </div>
      </div>
    </aside>
  );
};
