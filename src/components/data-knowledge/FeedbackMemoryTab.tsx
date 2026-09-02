import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Layers,
  Calendar,
  AlertCircle,
  FileText,
  X,
  Check,
  Info,
  Clock,
  Filter,
  Eye,
  MessageSquare,
  ShieldAlert,
  Plus,
  Edit2,
  Power,
  Tag,
  Globe,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  FeedbackMemoryItem,
  FeedbackType,
  FeedbackSource,
  CampaignType,
  AudienceSegment,
  ContentFormat,
  LanguageOption,
} from '../../types';

interface FeedbackMemoryTabProps {
  feedbackMemory?: FeedbackMemoryItem[];
  onSaveFeedbackMemory?: (item: FeedbackMemoryItem) => Promise<void>;
  onDeleteFeedbackMemory?: (id: string) => Promise<void>;
  onClearFeedbackMemory?: () => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const FeedbackMemoryTab: React.FC<FeedbackMemoryTabProps> = ({
  feedbackMemory = [],
  onSaveFeedbackMemory,
  onDeleteFeedbackMemory,
  onClearFeedbackMemory,
  onRefreshData,
}) => {
  const safeFeedback = Array.isArray(feedbackMemory) ? feedbackMemory : [];

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FeedbackType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');

  // Modal states
  const [editingItem, setEditingItem] = useState<FeedbackMemoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FeedbackMemoryItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for Add / Edit modal
  const [formInstruction, setFormInstruction] = useState('');
  const [formType, setFormType] = useState<FeedbackType>('Positive Preference');
  const [formIsGlobal, setFormIsGlobal] = useState(false);
  const [formFormat, setFormFormat] = useState('All Formats');
  const [formAudience, setFormAudience] = useState('All Audiences');
  const [formPlatform, setFormPlatform] = useState('All Platforms');
  const [formLanguage, setFormLanguage] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Stats calculation
  const totalCount = safeFeedback.length;
  const activeCount = safeFeedback.filter((i) => i.isActive !== false).length;
  const inactiveCount = safeFeedback.filter((i) => i.isActive === false).length;
  const positiveCount = safeFeedback.filter(
    (i) => i.feedbackType === 'Positive Preference' || i.rating === 'Positive'
  ).length;
  const negativeCount = safeFeedback.filter(
    (i) => i.feedbackType === 'Avoid / Negative' || i.rating === 'Negative'
  ).length;
  const correctionCount = safeFeedback.filter(
    (i) => i.feedbackType === 'Correction'
  ).length;
  const brandRuleCount = safeFeedback.filter(
    (i) => i.feedbackType === 'Brand / Style Rule'
  ).length;

  // Filtered feedback list
  const filteredItems = safeFeedback.filter((item) => {
    const q = searchTerm.toLowerCase();
    const instruction = item.instruction || item.explanation || item.correctedVersion || '';
    const original = item.originalGeneratedContent || '';
    const campaign = item.campaignName || '';
    const source = item.source || '';

    const matchesSearch =
      !q ||
      instruction.toLowerCase().includes(q) ||
      original.toLowerCase().includes(q) ||
      campaign.toLowerCase().includes(q) ||
      source.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Type filter
    if (typeFilter !== 'all') {
      const itemType =
        item.feedbackType ||
        (item.rating === 'Positive'
          ? 'Positive Preference'
          : item.rating === 'Negative'
          ? 'Avoid / Negative'
          : 'Brand / Style Rule');
      if (itemType !== typeFilter) return false;
    }

    // Status filter
    const isActive = item.isActive !== false;
    if (statusFilter === 'active' && !isActive) return false;
    if (statusFilter === 'inactive' && isActive) return false;

    // Audience filter
    if (audienceFilter !== 'all') {
      const itemAudience = item.audienceSegment || item.scope?.audienceSegment;
      if (audienceFilter === 'Global' && itemAudience) return false;
      if (audienceFilter !== 'Global' && itemAudience !== audienceFilter) return false;
    }

    // Format filter
    if (formatFilter !== 'all') {
      const itemFormat = item.format || item.contentFormat || item.scope?.format;
      if (itemFormat !== formatFilter) return false;
    }

    return true;
  });

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormInstruction('');
    setFormType('Positive Preference');
    setFormIsGlobal(false);
    setFormFormat('All Formats');
    setFormAudience('All Audiences');
    setFormPlatform('All Platforms');
    setFormLanguage('Tunisian Darija & English');
    setFormIsActive(true);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: FeedbackMemoryItem) => {
    setEditingItem(item);
    setFormInstruction(item.instruction || item.explanation || item.correctedVersion || '');
    setFormType(
      item.feedbackType ||
        (item.rating === 'Positive'
          ? 'Positive Preference'
          : item.rating === 'Negative'
          ? 'Avoid / Negative'
          : 'Brand / Style Rule')
    );
    setFormIsGlobal(Boolean(item.scope?.isGlobal));
    setFormFormat(item.format || item.contentFormat || item.scope?.format || 'All Formats');
    setFormAudience(item.audienceSegment || item.scope?.audienceSegment || 'All Audiences');
    setFormPlatform(item.platform || item.scope?.platform || 'All Platforms');
    setFormLanguage(
      item.languages?.join(', ') ||
        (typeof item.language === 'string' ? item.language : '') ||
        'Tunisian Darija & English'
    );
    setFormIsActive(item.isActive !== false);
    setIsAddModalOpen(true);
  };

  const handleSaveModalForm = async () => {
    if (!formInstruction.trim() || !onSaveFeedbackMemory) return;
    setActionLoading(true);

    try {
      const langArray = formLanguage
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updatedItem: FeedbackMemoryItem = {
        id: editingItem ? editingItem.id : `fb_${Date.now()}`,
        instruction: formInstruction.trim(),
        feedbackType: formType,
        scope: {
          format: formIsGlobal || formFormat === 'All Formats' ? undefined : formFormat,
          platform: formIsGlobal || formPlatform === 'All Platforms' ? undefined : formPlatform,
          audienceSegment: formIsGlobal || formAudience === 'All Audiences' ? undefined : formAudience,
          languages: formIsGlobal || langArray.length === 0 ? undefined : langArray,
          isGlobal: formIsGlobal,
        },
        format: formIsGlobal || formFormat === 'All Formats' ? undefined : formFormat,
        platform: formIsGlobal || formPlatform === 'All Platforms' ? undefined : formPlatform,
        audienceSegment: formIsGlobal || formAudience === 'All Audiences' ? undefined : formAudience,
        languages: formIsGlobal || langArray.length === 0 ? undefined : langArray,
        source: editingItem ? editingItem.source || 'Manual Entry' : 'Manual Entry',
        authorStaffId: editingItem?.authorStaffId,
        authorName: editingItem?.authorName,
        campaignId: editingItem?.campaignId,
        campaignName: editingItem?.campaignName,
        contentItemId: editingItem?.contentItemId,
        originalGeneratedContent: editingItem?.originalGeneratedContent,
        humanEditedContent: editingItem?.humanEditedContent,
        createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: formIsActive,
      };

      await onSaveFeedbackMemory(updatedItem);
      setIsAddModalOpen(false);
      setEditingItem(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Failed to save feedback memory:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (item: FeedbackMemoryItem) => {
    if (!onSaveFeedbackMemory) return;
    setActionLoading(true);
    try {
      const currentActive = item.isActive !== false;
      const updated: FeedbackMemoryItem = {
        ...item,
        isActive: !currentActive,
        updatedAt: new Date().toISOString(),
      };
      await onSaveFeedbackMemory(updated);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !onDeleteFeedbackMemory) return;
    setActionLoading(true);
    try {
      await onDeleteFeedbackMemory(itemToDelete.id);
      setItemToDelete(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Failed to delete feedback item:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmClearAll = async () => {
    if (!onClearFeedbackMemory) return;
    setActionLoading(true);
    try {
      await onClearFeedbackMemory();
      setShowClearConfirm(false);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Failed to clear feedback memory:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-fuchsia-50 flex items-center justify-center text-[#CB19C2]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-[#15192B] text-base">Feedback Memory Context</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Structured human preferences, corrections, and style rules supplied into future Gemini generation prompts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSaveFeedbackMemory && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Feedback Memory</span>
              </button>
            )}

            {safeFeedback.length > 0 && onClearFeedbackMemory && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Architecture Notice Banner */}
        <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-start gap-3 text-xs text-purple-950">
          <Info className="w-4 h-4 text-[#6344BF] shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <strong className="font-bold block">In-Context Guidance (Few-Shot Retrieval):</strong>
            Feedback memory entries are stored locally in your browser's IndexedDB and dynamically selected (top 3–5 by relevance) to guide future AI generations.
            The underlying Gemini model is not fine-tuned or retrained.
          </div>
        </div>

        {/* Status & Type Quick Filters Bar */}
        <div className="flex flex-col gap-3 pt-1">
          {/* Row 1: Type & Status Badges */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-[#160857] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All Types</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  typeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('Positive Preference')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                typeFilter === 'Positive Preference'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>Positive Preference ({positiveCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('Avoid / Negative')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                typeFilter === 'Avoid / Negative'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
              <span>Avoid / Negative ({negativeCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('Correction')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                typeFilter === 'Correction'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Correction ({correctionCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('Brand / Style Rule')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                typeFilter === 'Brand / Style Rule'
                  ? 'bg-[#6344BF] text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Brand / Style Rule ({brandRuleCount})</span>
            </button>
          </div>

          {/* Row 2: Search, Status, Audience & Format Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    statusFilter === 'all' ? 'bg-white text-[#15192B] shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    statusFilter === 'inactive' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Inactive ({inactiveCount})
                </button>
              </div>

              {/* Audience Scope Filter */}
              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Audiences</option>
                <option value="B2B">B2B Only</option>
                <option value="B2C">B2C Only</option>
                <option value="Both">Both (B2B + B2C)</option>
              </select>

              {/* Format Scope Filter */}
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="Reel / Video">Reel / Video</option>
                <option value="Carousel">Carousel</option>
                <option value="Static Post">Static Post</option>
                <option value="Story">Story</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search feedback memories..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Memory Items List */}
      {filteredItems.length === 0 ? (
        <div className="card-tier-1 p-12 text-center space-y-3 bg-white">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <p className="font-bold text-[#15192B] text-sm">No feedback memory entries found</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Try clearing your filters or search terms.'
                : 'Click "Add Feedback Memory" above, or review content in Content Review to save reusable guidance.'}
            </p>
          </div>
          {onSaveFeedbackMemory && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn-secondary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Preference</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map((item) => {
            const isActive = item.isActive !== false;
            const type: FeedbackType =
              item.feedbackType ||
              (item.rating === 'Positive'
                ? 'Positive Preference'
                : item.rating === 'Negative'
                ? 'Avoid / Negative'
                : 'Brand / Style Rule');

            const instruction = item.instruction || item.explanation || item.correctedVersion || '';
            const hasCorrected = Boolean(item.humanEditedContent || item.correctedVersion);
            const correctedText = item.humanEditedContent || item.correctedVersion;

            const audienceTag = item.audienceSegment || item.scope?.audienceSegment;
            const formatTag = item.format || item.contentFormat || item.scope?.format;
            const platformTag = item.platform || item.scope?.platform;
            const langTag =
              item.languages?.join(', ') ||
              (typeof item.language === 'string' ? item.language : undefined);
            const isGlobal = item.scope?.isGlobal || (!audienceTag && !formatTag && !platformTag && !langTag);

            return (
              <div
                key={item.id}
                className={`card-tier-1 p-5 rounded-2xl border transition-all space-y-3 shadow-2xs bg-white ${
                  !isActive ? 'opacity-65 border-dashed border-slate-300 bg-slate-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Top Line: Badges & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Feedback Type Badge */}
                    {type === 'Positive Preference' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-emerald-700" />
                        <span>Positive Preference</span>
                      </span>
                    )}
                    {type === 'Avoid / Negative' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3 text-rose-700" />
                        <span>Avoid / Negative</span>
                      </span>
                    )}
                    {type === 'Correction' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-amber-700" />
                        <span>Correction</span>
                      </span>
                    )}
                    {type === 'Brand / Style Rule' && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-900 border border-purple-200 inline-flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-purple-700" />
                        <span>Brand / Style Rule</span>
                      </span>
                    )}

                    {/* Active / Inactive Status */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(item)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                      }`}
                      title={isActive ? 'Click to deactivate rule' : 'Click to reactivate rule'}
                    >
                      <Power className={`w-2.5 h-2.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span>{isActive ? 'Active' : 'Inactive / Paused'}</span>
                    </button>

                    {/* Scope Badges */}
                    {isGlobal ? (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 inline-flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" />
                        <span>Global (All Campaigns)</span>
                      </span>
                    ) : (
                      <>
                        {audienceTag && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            Audience: {audienceTag}
                          </span>
                        )}
                        {formatTag && (
                          <span className="text-[10px] font-bold text-fuchsia-700 bg-fuchsia-50 px-2 py-0.5 rounded-md border border-fuchsia-100">
                            Format: {formatTag}
                          </span>
                        )}
                        {platformTag && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            Platform: {platformTag}
                          </span>
                        )}
                        {langTag && (
                          <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            Lang: {langTag}
                          </span>
                        )}
                      </>
                    )}

                    {/* Source Tag */}
                    {item.source && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        via {item.source}
                      </span>
                    )}
                  </div>

                  {/* Right Actions: Edit, Delete, Date */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>

                    {onSaveFeedbackMemory && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-[#172DC3] hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        title="Edit feedback memory"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteFeedbackMemory && (
                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete feedback memory entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Instruction Body */}
                <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 text-xs text-slate-900 leading-relaxed font-medium">
                  <p className="whitespace-pre-line">{instruction}</p>
                </div>

                {/* Content Comparison (if both original and corrected exist) */}
                {(hasCorrected || item.originalGeneratedContent) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    {item.originalGeneratedContent && (
                      <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Original AI Generation
                        </span>
                        <p className="line-clamp-3 leading-relaxed whitespace-pre-line">
                          {item.originalGeneratedContent}
                        </p>
                      </div>
                    )}

                    {hasCorrected && (
                      <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200/80 text-emerald-950 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Human Preferred / Corrected Version</span>
                        </span>
                        <p className="line-clamp-3 leading-relaxed whitespace-pre-line font-medium">
                          {correctedText}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT FEEDBACK MEMORY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#160857]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#15192B] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#CB19C2]" />
                <span>{editingItem ? 'Edit Feedback Memory' : 'Add Reusable Feedback Memory'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Define a concise preference, style rule, or correction. This preference will be selectively supplied into future Gemini generation prompts based on matching scope.
            </p>

            {/* Instruction Field */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Instruction / Reusable Guideline <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={formInstruction}
                onChange={(e) => setFormInstruction(e.target.value)}
                placeholder="e.g. Keep Tunisian Darija conversational in Reel voiceovers; naturally integrate French technical terms like 'impression 3D', 'tolérance', and 'CAO'."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 font-medium"
              />
            </div>

            {/* Feedback Type Selector */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1.5">Feedback Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    'Positive Preference',
                    'Avoid / Negative',
                    'Correction',
                    'Brand / Style Rule',
                  ] as FeedbackType[]
                ).map((t) => {
                  const isSel = formType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-left cursor-pointer ${
                        isSel
                          ? 'bg-[#160857] text-white border-[#160857] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scope Settings */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#15192B]">Scope & Applicability</label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsGlobal}
                    onChange={(e) => setFormIsGlobal(e.target.checked)}
                    className="rounded text-[#172DC3] focus:ring-[#172DC3]/20"
                  />
                  <span>Apply Globally to All Campaigns</span>
                </label>
              </div>

              {!formIsGlobal && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Target Format</label>
                    <select
                      value={formFormat}
                      onChange={(e) => setFormFormat(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 font-semibold text-slate-800"
                    >
                      <option value="All Formats">All Formats</option>
                      <option value="Reel / Video">Reel / Video</option>
                      <option value="Carousel">Carousel</option>
                      <option value="Static Post">Static Post</option>
                      <option value="Story">Story</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Audience Segment</label>
                    <select
                      value={formAudience}
                      onChange={(e) => setFormAudience(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 font-semibold text-slate-800"
                    >
                      <option value="All Audiences">All Audiences</option>
                      <option value="B2B">B2B</option>
                      <option value="B2C">B2C</option>
                      <option value="Both">Both (B2B + B2C)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Platform</label>
                    <select
                      value={formPlatform}
                      onChange={(e) => setFormPlatform(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 font-semibold text-slate-800"
                    >
                      <option value="All Platforms">All Platforms</option>
                      <option value="Meta / Instagram">Meta / Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="TikTok">TikTok</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Languages</label>
                    <input
                      type="text"
                      value={formLanguage}
                      onChange={(e) => setFormLanguage(e.target.value)}
                      placeholder="e.g. Tunisian Darija, English"
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2 font-medium text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-[#15192B]">Active Status</span>
              <button
                type="button"
                onClick={() => setFormIsActive(!formIsActive)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  formIsActive
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                <Power className="w-3 h-3" />
                <span>{formIsActive ? 'Active (Supplied to Gemini)' : 'Inactive / Paused'}</span>
              </button>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={actionLoading}
                className="btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalForm}
                disabled={actionLoading || !formInstruction.trim()}
                className="btn-primary px-5 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : editingItem ? 'Save Changes' : 'Save as Reusable Preference'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-[#15192B] text-base">Delete Feedback Memory Entry</h4>
                <p className="text-xs text-slate-500">Remove from prompt context</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this feedback memory entry? It will no longer be provided as in-context reference for future campaign generations.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR ALL MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-[#15192B] text-base">Clear All Feedback Memory?</h4>
                <p className="text-xs text-slate-500">Reset learning context</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to clear all <strong>{safeFeedback.length} feedback memory entries</strong>? This will remove all stored human corrections and ratings from future Gemini generation contexts.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
              <strong>Note:</strong> Your Brand Kit, Products Catalog, Campaign Plans, and Marketing Datasets will remain untouched.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                {actionLoading ? 'Clearing...' : 'Clear All Feedback Memory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
