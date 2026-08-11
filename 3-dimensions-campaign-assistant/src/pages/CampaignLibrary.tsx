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
} from 'lucide-react';

interface CampaignLibraryProps {
  campaigns: CampaignBrief[];
  onSelectCampaign: (campaignId: string) => void;
  onNewCampaign: () => void;
  onDuplicateCampaign: (campaign: CampaignBrief) => void;
  onDeleteCampaign: (campaignId: string) => void;
}

export const CampaignLibrary: React.FC<CampaignLibraryProps> = ({
  campaigns,
  onSelectCampaign,
  onNewCampaign,
  onDuplicateCampaign,
  onDeleteCampaign,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedAudience, setSelectedAudience] = useState<string>('All');

  const filteredCampaigns = campaigns.filter((c) => {
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
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'In Progress':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'In Review':
        return 'bg-violet-50 text-violet-800 border-violet-300';
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Archived':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Header */}
      <div className="card-tier-1 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns by name, product, or objective..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 focus:border-[#172DC3] text-slate-900 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
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
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
          >
            <option value="All">All Audiences (B2B/B2C)</option>
            <option value="B2B">B2B Corporate</option>
            <option value="B2C">B2C Consumer</option>
            <option value="Both">Both B2B & B2C</option>
          </select>

          {/* New Campaign Button */}
          <button
            onClick={onNewCampaign}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#172DC3] mx-auto mb-3">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-[#15192B] text-base">No campaigns found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
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
          {filteredCampaigns.map((camp) => (
            <div
              key={camp.id}
              className="card-tier-1 hover:border-[#172DC3]/40 transition duration-200 flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                      camp.status
                    )}`}
                  >
                    {camp.status}
                  </span>
                  <span className="text-[10px] font-bold text-[#160857] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                    {camp.type}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-[#15192B] text-base group-hover:text-[#172DC3] transition">
                    {camp.name}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Product: <span className="text-[#15192B] font-semibold">{camp.productOrService}</span>
                  </p>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/80">
                  {camp.objective}
                </p>

                {/* Specs Pill List */}
                <div className="flex flex-wrap gap-1.5 text-[11px] pt-1">
                  <span className="bg-indigo-50 text-[#172DC3] border border-indigo-100 px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[#6344BF]" />
                    <span>Audience: {camp.audienceSegment}</span>
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg font-medium flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-500" />
                    <span>{camp.language}</span>
                  </span>
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{camp.durationDays}d</span>
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="bg-[#F8FAFC] px-5 py-3 border-t border-slate-200/80 flex items-center justify-between">
                <button
                  onClick={() => onSelectCampaign(camp.id)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#172DC3] hover:text-[#201B9F] transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#CB19C2]" />
                  <span>Open Campaign Plan</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDuplicateCampaign(camp)}
                    title="Duplicate Campaign"
                    className="p-1.5 text-slate-400 hover:text-[#172DC3] hover:bg-indigo-50 rounded-lg transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteCampaign(camp.id)}
                    title="Delete Campaign"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
