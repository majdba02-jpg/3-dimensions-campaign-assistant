import React, { useState } from 'react';
import {
  BookmarkPlus,
  Plus,
  Search,
  Trash2,
  Edit2,
  ExternalLink,
  Info,
  Tag,
  Languages,
  Users,
  Share2,
  FileText,
  X,
  Check,
  Calendar,
  Sparkles,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import {
  CampaignReference,
  CampaignType,
  AudienceSegment,
  LanguageOption,
  PlatformType,
  ReferenceAttachment,
} from '../../types';

interface CampaignReferencesTabProps {
  references?: CampaignReference[];
  onSaveReference: (ref: CampaignReference) => Promise<void>;
  onDeleteReference?: (id: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const CampaignReferencesTab: React.FC<CampaignReferencesTabProps> = ({
  references = [],
  onSaveReference,
  onDeleteReference,
  onRefreshData,
}) => {
  const safeReferences = Array.isArray(references) ? references : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRef, setEditingRef] = useState<CampaignReference | null>(null);
  const [refToDelete, setRefToDelete] = useState<CampaignReference | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<CampaignType>('Product Launch');
  const [formAudience, setFormAudience] = useState<AudienceSegment>('B2B');
  const [formLanguage, setFormLanguage] = useState<LanguageOption>('Tunisian Darija');
  const [formPlatform, setFormPlatform] = useState<PlatformType>('Instagram');
  const [formCaption, setFormCaption] = useState('');
  const [formWhyUseful, setFormWhyUseful] = useState('');
  const [formPerformance, setFormPerformance] = useState('');
  const [formSource, setFormSource] = useState('');

  // Filter references
  const filteredReferences = safeReferences.filter((r) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.captionCopy && r.captionCopy.toLowerCase().includes(q)) ||
      (r.whyUsefulNotes && r.whyUsefulNotes.toLowerCase().includes(q)) ||
      (r.performanceNotes && r.performanceNotes.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (audienceFilter !== 'all' && r.audienceSegment !== audienceFilter) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingRef(null);
    setFormTitle('');
    setFormType('Product Launch');
    setFormAudience('B2B');
    setFormLanguage('Tunisian Darija');
    setFormPlatform('Instagram');
    setFormCaption('');
    setFormWhyUseful('');
    setFormPerformance('');
    setFormSource('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ref: CampaignReference) => {
    setEditingRef(ref);
    setFormTitle(ref.title);
    setFormType(ref.type);
    setFormAudience(ref.audienceSegment || 'B2B');
    setFormLanguage(ref.language || 'Tunisian Darija');
    setFormPlatform(ref.platform || 'Instagram');
    setFormCaption(ref.captionCopy || '');
    setFormWhyUseful(ref.whyUsefulNotes || '');
    setFormPerformance(ref.performanceNotes || '');
    setFormSource(ref.sourceCampaign || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsSaving(true);
    try {
      const refToSave: CampaignReference = {
        id: editingRef?.id || `ref_${Date.now()}`,
        title: formTitle.trim(),
        type: formType,
        audienceSegment: formAudience,
        language: formLanguage,
        platform: formPlatform,
        captionCopy: formCaption.trim() || undefined,
        whyUsefulNotes: formWhyUseful.trim() || undefined,
        performanceNotes: formPerformance.trim() || undefined,
        sourceCampaign: formSource.trim() || undefined,
        createdAt: editingRef?.createdAt || new Date().toISOString(),
      };

      await onSaveReference(refToSave);
      setIsModalOpen(false);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Failed to save campaign reference:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!refToDelete || !onDeleteReference) return;
    await onDeleteReference(refToDelete.id);
    setRefToDelete(null);
    if (onRefreshData) await onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-[#172DC3]">
                <BookmarkPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-[#15192B] text-base">Campaign Reference Library</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Curated internal and external high-performing marketing examples used as contextual benchmarks for Gemini generation.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Reference Example</span>
          </button>
        </div>

        {/* Guidance Notice Banner */}
        <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex items-start gap-3 text-xs text-indigo-950">
          <Info className="w-4 h-4 text-[#172DC3] shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <strong className="font-bold block">Contextual Inspiration Only:</strong>
            Campaign references provide structural formats, hooks, and creative benchmarks for Gemini campaign planning. They are reference examples and are not treated as verified company facts unless documented in the Brand Kit or Products Catalog.
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-medium"
            >
              <option value="all">All Campaign Types</option>
              <option value="Product Launch">Product Launch</option>
              <option value="B2B Corporate Campaign">B2B Corporate Campaign</option>
              <option value="Seasonal Campaign">Seasonal Campaign</option>
              <option value="Educational Content">Educational Content</option>
              <option value="Behind the Scenes">Behind the Scenes</option>
            </select>

            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 font-medium"
            >
              <option value="all">All Audiences</option>
              <option value="B2B">B2B Focus</option>
              <option value="B2C">B2C Focus</option>
              <option value="Both">B2B + B2C (Both)</option>
            </select>
          </div>

          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference examples..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* References Grid */}
      {filteredReferences.length === 0 ? (
        <div className="card-tier-1 p-12 text-center space-y-3">
          <BookmarkPlus className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <p className="font-bold text-[#15192B] text-sm">No campaign references found</p>
            <p className="text-xs text-slate-500">
              Save your best social media posts or competitor hooks as reference benchmarks.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="btn-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Reference</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredReferences.map((ref) => (
            <div
              key={ref.id}
              className="card-tier-1 p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 shadow-2xs"
            >
              <div className="space-y-3">
                {/* Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold bg-indigo-50 text-[#172DC3] border border-indigo-100 px-2 py-0.5 rounded-md">
                      {ref.type}
                    </span>
                    {ref.audienceSegment && (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {ref.audienceSegment}
                      </span>
                    )}
                    {ref.language && (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {ref.language}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(ref.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h4 className="font-black text-[#15192B] text-sm">{ref.title}</h4>
                  {ref.sourceCampaign && (
                    <span className="text-[11px] text-slate-400">Source: {ref.sourceCampaign}</span>
                  )}
                </div>

                {/* Copy Text Preview */}
                {ref.captionCopy && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-sans">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Referenced Post Copy:
                    </span>
                    <p className="line-clamp-4 whitespace-pre-line">{ref.captionCopy}</p>
                  </div>
                )}

                {/* Why useful */}
                {ref.whyUsefulNotes && (
                  <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block text-amber-900">Strategic Rationale:</strong>
                      {ref.whyUsefulNotes}
                    </div>
                  </div>
                )}

                {/* Performance Notes */}
                {ref.performanceNotes && (
                  <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold block text-emerald-900">Observed Performance:</strong>
                      {ref.performanceNotes}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleOpenEdit(ref)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  title="Edit Reference"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {onDeleteReference && (
                  <button
                    onClick={() => setRefToDelete(ref)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Reference"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-[#172DC3]">
                  <BookmarkPlus className="w-4 h-4" />
                </div>
                <h4 className="font-black text-[#15192B] text-base">
                  {editingRef ? 'Edit Campaign Reference' : 'Add Campaign Reference Example'}
                </h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reference Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. 24h Prototyping Darija Reel Hook"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="Product Launch">Product Launch</option>
                    <option value="B2B Corporate Campaign">B2B Corporate</option>
                    <option value="Seasonal Campaign">Seasonal</option>
                    <option value="Educational Content">Educational</option>
                    <option value="Behind the Scenes">Behind the Scenes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={formAudience}
                    onChange={(e) => setFormAudience(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="B2B">B2B</option>
                    <option value="B2C">B2C</option>
                    <option value="Both">Both (B2B + B2C)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Language</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="Tunisian Darija">Tunisian Darija</option>
                    <option value="English">English</option>
                    <option value="French">French</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Referenced Content / Caption Copy
                </label>
                <textarea
                  rows={4}
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder="Paste the caption, hook, or script text here..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Why This Reference Is Useful (Rationale)
                  </label>
                  <textarea
                    rows={2}
                    value={formWhyUseful}
                    onChange={(e) => setFormWhyUseful(e.target.value)}
                    placeholder="e.g. Strong technical hook with high engagement in Tunisian hardware community"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observed Performance / Metrics
                  </label>
                  <textarea
                    rows={2}
                    value={formPerformance}
                    onChange={(e) => setFormPerformance(e.target.value)}
                    placeholder="e.g. 1,400 views, 8.4% engagement rate, 12 inbound direct quote requests"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Source / Reference Origin</label>
                <input
                  type="text"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="e.g. Internal Meta Post Feb 2026, or Competitor Benchmark"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formTitle.trim()}
                  className="btn-primary px-5 py-2 text-xs font-bold shadow-xs"
                >
                  {isSaving ? 'Saving...' : editingRef ? 'Update Reference' : 'Save Reference'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {refToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-[#15192B] text-base">Delete Campaign Reference</h4>
                <p className="text-xs text-slate-500">Remove from benchmark library</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{refToDelete.title}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRefToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
