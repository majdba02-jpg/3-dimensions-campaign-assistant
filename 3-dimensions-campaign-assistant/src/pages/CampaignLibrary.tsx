import React, { useState } from 'react';
import { CampaignBrief, CampaignStatus } from '../types';
import {
  FolderKanban,
  Search,
  Plus,
  Copy,
  Trash2,
  Calendar,
  Tag,
  Globe,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
} from 'lucide-react';

interface CampaignLibraryProps {
  campaigns?: CampaignBrief[];
  onSelectCampaign: (campaignId: string) => void;
  onNewCampaign: () => void;
  onDuplicateCampaign: (campaign: CampaignBrief) => Promise<void> | void;
  onDeleteCampaign: (campaignId: string) => void;
  onEditDraft?: (campaign: CampaignBrief) => void;
}

export const CampaignLibrary: React.FC<CampaignLibraryProps> = ({
  campaigns = [],
  onSelectCampaign,
  onNewCampaign,
  onDuplicateCampaign,
  onDeleteCampaign,
  onEditDraft,
}) => {
  const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedAudience, setSelectedAudience] = useState<string>('All');
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDuplicate = async (camp: CampaignBrief) => {
    if (duplicatingId) return;
    setDuplicatingId(camp.id);
    try {
      await onDuplicateCampaign(camp);
    } finally {
      setDuplicatingId(null);
    }
  };

  const filteredCampaigns = safeCampaigns.filter((c) => {
    // Search
    if (
      searchTerm &&
      !c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !c.productOrService.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !c.objective.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    // Status
    if (selectedStatus !== 'All' && c.status !== selectedStatus) {
      return false;
    }
    // Audience
    if (selectedAudience !== 'All' && c.audienceSegment !== selectedAudience) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'Approved':
        return {
          classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'In Progress':
        return {
          classes: 'bg-blue-50 text-[#172DC3] border-blue-200',
          icon: Clock,
        };
      case 'In Review':
        return {
          classes: 'bg-purple-50 text-[#6344BF] border-purple-200',
          icon: Sparkles,
        };
      case 'Draft':
        return {
          classes: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: FileEdit,
        };
      case 'Archived':
        return {
          classes: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: AlertCircle,
        };
      default:
        return {
          classes: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: Tag,
        };
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fadeIn">
      {/* Top Filter & Actions Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns by name, product, or objective..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] text-slate-900 placeholder:text-slate-400 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Approved">Approved</option>
            <option value="Archived">Archived</option>
          </select>

          {/* Audience Filter */}
          <select
            value={selectedAudience}
            onChange={(e) => setSelectedAudience(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 cursor-pointer"
          >
            <option value="All">All Audiences (B2B/B2C)</option>
            <option value="B2B">B2B Corporate</option>
            <option value="B2C">B2C Consumer</option>
            <option value="Both">Both B2B & B2C</option>
          </select>
        </div>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#172DC3] mx-auto mb-3 shadow-xs">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="font-black text-[#15192B] text-base">No campaigns found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
            {searchTerm || selectedStatus !== 'All'
              ? 'Try adjusting your search query or filter settings.'
              : 'Start your first 3D printing marketing campaign brief now.'}
          </p>
          <button
            onClick={onNewCampaign}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Campaign</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((camp) => {
            const badgeInfo = getStatusBadge(camp.status);
            const BadgeIcon = badgeInfo.icon;

            return (
              <div
                key={camp.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#172DC3]/40 shadow-2xs hover:shadow-xs transition duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Header & Content */}
                <div className="p-5 space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${badgeInfo.classes}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{camp.status}</span>
                    </span>
                    <span className="text-[10px] font-bold text-[#160857] bg-indigo-50/80 border border-indigo-100/90 px-2 py-1 rounded-lg">
                      {camp.type}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-[#15192B] text-base group-hover:text-[#172DC3] transition line-clamp-1">
                      {camp.name}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      Product: <span className="text-[#15192B] font-bold">{camp.productOrService}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 bg-[#F8FAFC] p-3 rounded-xl border border-slate-200/70 leading-relaxed">
                    {camp.objective}
                  </p>

                  {/* Specs Pill List */}
                  <div className="flex flex-wrap gap-1.5 text-[11px] pt-1">
                    <span className="bg-indigo-50 text-[#172DC3] border border-indigo-100/80 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-[#6344BF]" />
                      <span>Audience: {camp.audienceSegment}</span>
                    </span>
                    <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-slate-500" />
                      <span>{camp.language}</span>
                    </span>
                    <span className="bg-slate-100 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{camp.durationDays}d</span>
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="bg-[#F8FAFC] px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                  {camp.status === 'Draft' ? (
                    <button
                      onClick={() => (onEditDraft ? onEditDraft(camp) : onSelectCampaign(camp.id))}
                      className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#172DC3] border-indigo-200 hover:bg-indigo-50/50"
                    >
                      <FileEdit className="w-3.5 h-3.5 text-[#172DC3]" />
                      <span>Continue Draft</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectCampaign(camp.id)}
                      className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>Open Workspace</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(camp)}
                      disabled={duplicatingId === camp.id}
                      title="Duplicate Campaign"
                      className="p-2 text-slate-400 hover:text-[#172DC3] hover:bg-indigo-50/80 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {duplicatingId === camp.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#172DC3]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => onDeleteCampaign(camp.id)}
                      title="Delete Campaign"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
