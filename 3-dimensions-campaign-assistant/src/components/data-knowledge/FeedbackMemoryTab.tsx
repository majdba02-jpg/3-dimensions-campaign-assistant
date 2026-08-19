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
} from 'lucide-react';
import { FeedbackMemoryItem, CampaignType, AudienceSegment, ContentFormat, LanguageOption } from '../../types';

interface FeedbackMemoryTabProps {
  feedbackMemory?: FeedbackMemoryItem[];
  onDeleteFeedbackMemory?: (id: string) => Promise<void>;
  onClearFeedbackMemory?: () => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const FeedbackMemoryTab: React.FC<FeedbackMemoryTabProps> = ({
  feedbackMemory = [],
  onDeleteFeedbackMemory,
  onClearFeedbackMemory,
  onRefreshData,
}) => {
  const safeFeedback = Array.isArray(feedbackMemory) ? feedbackMemory : [];
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'Positive' | 'Negative' | 'Neutral'>('all');
  const [selectedItem, setSelectedItem] = useState<FeedbackMemoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FeedbackMemoryItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filter items
  const filteredItems = safeFeedback.filter((item) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      (item.explanation && item.explanation.toLowerCase().includes(q)) ||
      (item.originalGeneratedContent && item.originalGeneratedContent.toLowerCase().includes(q)) ||
      (item.humanEditedContent && item.humanEditedContent.toLowerCase().includes(q)) ||
      (item.correctedVersion && item.correctedVersion.toLowerCase().includes(q)) ||
      (item.campaignName && item.campaignName.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (ratingFilter !== 'all' && item.rating !== ratingFilter) return false;
    return true;
  });

  const positiveCount = safeFeedback.filter((i) => i.rating === 'Positive').length;
  const negativeCount = safeFeedback.filter((i) => i.rating === 'Negative').length;
  const neutralCount = safeFeedback.filter((i) => i.rating === 'Neutral').length;

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !onDeleteFeedbackMemory) return;
    setActionLoading(true);
    try {
      await onDeleteFeedbackMemory(itemToDelete.id);
      setItemToDelete(null);
      if (selectedItem?.id === itemToDelete.id) setSelectedItem(null);
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
      setSelectedItem(null);
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
                  Structured human manager ratings, edits, and corrections supplied to future Gemini generation prompts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {feedbackMemory.length > 0 && onClearFeedbackMemory && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Memory</span>
              </button>
            )}
          </div>
        </div>

        {/* Architecture Notice Banner */}
        <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-start gap-3 text-xs text-purple-950">
          <Info className="w-4 h-4 text-[#6344BF] shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <strong className="font-bold block">In-Context Retrieval Architecture:</strong>
            Feedback memory records are injected as relevant few-shot examples into future Gemini prompt contexts.
            The foundation model is not being fine-tuned or retrained; memory is preserved deterministically in your local IndexedDB workspace.
          </div>
        </div>

        {/* Stats & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => setRatingFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                ratingFilter === 'all' ? 'bg-[#160857] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All Memory</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${ratingFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {feedbackMemory.length}
              </span>
            </button>

            <button
              onClick={() => setRatingFilter('Positive')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                ratingFilter === 'Positive' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>Positive ({positiveCount})</span>
            </button>

            <button
              onClick={() => setRatingFilter('Negative')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                ratingFilter === 'Negative' ? 'bg-rose-700 text-white shadow-2xs' : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
              <span>Negative / Corrections ({negativeCount})</span>
            </button>

            {neutralCount > 0 && (
              <button
                onClick={() => setRatingFilter('Neutral')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  ratingFilter === 'Neutral' ? 'bg-slate-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Minus className="w-3 h-3" />
                <span>Neutral ({neutralCount})</span>
              </button>
            )}
          </div>

          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search feedback memories..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Memory Items List */}
      {filteredItems.length === 0 ? (
        <div className="card-tier-1 p-12 text-center space-y-3">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <p className="font-bold text-[#15192B] text-sm">No feedback memory entries found</p>
            <p className="text-xs text-slate-500">
              When you rate generated campaign content or edit copy in Content Review, structured preferences are logged here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isPositive = item.rating === 'Positive';
            const isNegative = item.rating === 'Negative';
            const hasCorrected = !!item.humanEditedContent || !!item.correctedVersion;
            const correctedText = item.humanEditedContent || item.correctedVersion;

            return (
              <div
                key={item.id}
                className="card-tier-1 p-5 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all space-y-3 shadow-2xs"
              >
                {/* Header line: Rating Badge, Context Tags & Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isPositive && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-emerald-700" />
                        <span>Positive Rating</span>
                      </span>
                    )}
                    {isNegative && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3 text-rose-700" />
                        <span>Changes Requested / Negative</span>
                      </span>
                    )}
                    {!isPositive && !isNegative && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                        <Minus className="w-3 h-3 text-slate-500" />
                        <span>Neutral Note</span>
                      </span>
                    )}

                    {item.campaignName && (
                      <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.campaignName}
                      </span>
                    )}

                    {item.campaignType && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.campaignType}
                      </span>
                    )}

                    {item.audienceSegment && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.audienceSegment}
                      </span>
                    )}

                    {item.contentFormat && (
                      <span className="text-[10px] font-semibold text-[#172DC3] bg-indigo-50 px-2 py-0.5 rounded-md">
                        {item.contentFormat}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>

                    {onDeleteFeedbackMemory && (
                      <button
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete feedback entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Manager Feedback Explanation */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-900 leading-relaxed">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Marketing Manager Feedback Note:
                  </span>
                  <p className="font-medium">{item.explanation}</p>
                </div>

                {/* Content Comparison (if both original and corrected exist) */}
                {(hasCorrected || item.originalGeneratedContent) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
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
                onClick={() => setItemToDelete(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
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
              Are you sure you want to clear all <strong>{feedbackMemory.length} feedback memory entries</strong>? This will remove all stored human corrections and ratings from future Gemini generation contexts.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
              <strong>Note:</strong> Your Brand Kit, Products Catalog, Campaign Plans, and Marketing Datasets will remain untouched.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
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
