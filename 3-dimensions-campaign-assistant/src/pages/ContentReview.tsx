import React, { useState } from 'react';
import {
  ContentAsset,
  ReviewComment,
  FeedbackMemoryItem,
  StaffMember,
  CampaignBrief,
} from '../types';
import {
  CheckCircle2,
  History,
  MessageSquare,
  Lock,
  Unlock,
  Save,
  Send,
  Sparkles,
} from 'lucide-react';

interface ContentReviewProps {
  assets: ContentAsset[];
  staffMembers: StaffMember[];
  onSaveAsset: (updatedAsset: ContentAsset) => Promise<void>;
  onSaveFeedbackMemory: (item: FeedbackMemoryItem) => Promise<void>;
  selectedAssetId?: string;
  activeBrief?: CampaignBrief | null;
}

export const ContentReview: React.FC<ContentReviewProps> = ({
  assets,
  staffMembers,
  onSaveAsset,
  onSaveFeedbackMemory,
  selectedAssetId,
  activeBrief,
}) => {
  const [currentAssetId, setCurrentAssetId] = useState<string>(
    selectedAssetId || assets[0]?.id || ''
  );

  const activeAsset = assets.find((a) => a.id === currentAssetId) || assets[0];

  // Editable Form State
  const [caption, setCaption] = useState(activeAsset?.caption || '');
  const [script, setScript] = useState(activeAsset?.scriptOrStoryboard || '');
  const [hook, setHook] = useState(activeAsset?.hook || '');
  const [cta, setCta] = useState(activeAsset?.cta || '');
  const [status, setStatus] = useState<ContentAsset['status']>(activeAsset?.status || 'Needs Review');
  const [isLocked, setIsLocked] = useState(activeAsset?.isLocked || false);

  // New Comment State
  const [commentText, setCommentText] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState(staffMembers[0]?.id || '');

  // Feedback Memory Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<'Positive' | 'Negative' | 'Neutral'>('Positive');
  const [feedbackExplanation, setFeedbackExplanation] = useState('');

  // Sync state when active asset changes
  React.useEffect(() => {
    if (activeAsset) {
      setCaption(activeAsset.caption || '');
      setScript(activeAsset.scriptOrStoryboard || '');
      setHook(activeAsset.hook || '');
      setCta(activeAsset.cta || '');
      setStatus(activeAsset.status || 'Needs Review');
      setIsLocked(activeAsset.isLocked || false);
    }
  }, [activeAsset]);

  if (!activeAsset) {
    return (
      <div className="p-12 text-center bg-[#F8FAFC] min-h-[60vh] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300">
        <CheckCircle2 className="w-12 h-12 text-slate-400 mb-2" />
        <h3 className="font-bold text-[#15192B] text-base">No Content Assets for Review</h3>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Generate a campaign plan to review and refine its individual post copy and video scripts.
        </p>
      </div>
    );
  }

  const handleSaveEdits = async () => {
    const nextVersionNumber = (activeAsset.versions?.length || 0) + 1;
    const newVersion = {
      versionNumber: nextVersionNumber,
      caption,
      scriptOrStoryboard: script,
      cta,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Marketing Manager',
      changeSummary: 'Human copy edit & refinement',
    };

    const updated: ContentAsset = {
      ...activeAsset,
      caption,
      scriptOrStoryboard: script,
      hook,
      cta,
      status,
      isLocked,
      versions: [newVersion, ...(activeAsset.versions || [])],
      updatedAt: new Date().toISOString(),
    };

    await onSaveAsset(updated);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const author = staffMembers.find((s) => s.id === selectedStaffId) || staffMembers[0];

    const newComment: ReviewComment = {
      id: `comment_${Date.now()}`,
      assetId: activeAsset.id,
      authorName: author.name,
      authorRole: author.role,
      text: commentText,
      createdAt: new Date().toISOString(),
    };

    const updated: ContentAsset = {
      ...activeAsset,
      comments: [newComment, ...(activeAsset.comments || [])],
    };

    await onSaveAsset(updated);
    setCommentText('');
  };

  const handleSaveFeedbackMemory = async () => {
    if (!feedbackExplanation.trim()) return;

    const memoryItem: FeedbackMemoryItem = {
      id: `fb_${Date.now()}`,
      rating: feedbackRating,
      explanation: feedbackExplanation,
      campaignType: activeBrief?.type || 'Product Launch',
      audienceSegment: activeBrief?.audienceSegment || 'B2C',
      contentFormat: activeAsset.format,
      language: activeBrief?.language || 'Multilingual (English & Darija)',
      originalGeneratedContent: activeAsset.caption,
      humanEditedContent: caption !== activeAsset.caption ? caption : undefined,
      createdAt: new Date().toISOString(),
    };

    await onSaveFeedbackMemory(memoryItem);
    setIsFeedbackModalOpen(false);
    setFeedbackExplanation('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Assets Selector Sidebar */}
        <div className="card-tier-1 p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Campaign Content Items ({assets.length})
          </div>

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {assets.map((ast) => {
              const isSel = ast.id === activeAsset.id;
              return (
                <button
                  key={ast.id}
                  onClick={() => setCurrentAssetId(ast.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-150 ${
                    isSel
                      ? 'border-[#172DC3] bg-indigo-50/60 shadow-2xs font-bold'
                      : 'border-slate-200/80 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[#15192B] mb-1">
                    <span className="truncate">{ast.title || ast.hook}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase ${
                        ast.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {ast.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate font-medium">
                    {ast.platform} • {ast.format}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Main Copy / Script Review Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Workspace Card */}
          <div className="card-tier-1 p-6 space-y-5">
            {/* Header / Status Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-[#172DC3] px-2.5 py-0.5 rounded-md">
                  {activeAsset.platform} • {activeAsset.format}
                </span>
                <h2 className="text-lg font-black text-[#15192B] mt-1">{activeAsset.title || activeAsset.hook}</h2>
              </div>

              {/* Approval & Lock Controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isLocked ? 'bg-[#160857] text-white' : 'btn-secondary'
                  }`}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{isLocked ? 'Locked' : 'Lock Output'}</span>
                </button>

                {/* Human Approval Status Selector */}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none transition ${
                    status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  <option value="Draft">Draft</option>
                  <option value="Needs Review">Needs Review</option>
                  <option value="Approved">✓ Approved by Human</option>
                  <option value="Changes Requested">Changes Requested</option>
                </select>
              </div>
            </div>

            {/* Hook Editor */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Hook / Opening Line
              </label>
              <input
                type="text"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#15192B] focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition"
              />
            </div>

            {/* Caption Copy Editor */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Caption Copy (Tunisian Darija / English)
              </label>
              <textarea
                rows={5}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition"
              />
            </div>

            {/* Video Script / Storyboard Editor if Reel / Video */}
            {activeAsset.format.includes('Reel') || activeAsset.format.includes('Video') ? (
              <div>
                <label className="block text-xs font-bold text-[#15192B] mb-1">
                  Video Script & Visual Storyboard Directions
                </label>
                <textarea
                  rows={4}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition"
                />
              </div>
            ) : null}

            {/* CTA Editor */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Call to Action (CTA)
              </label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition"
              />
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(true)}
                className="btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#CB19C2]" />
                <span>Log Structured Feedback Memory</span>
              </button>

              <button
                type="button"
                onClick={handleSaveEdits}
                className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Edits & Snapshot Version</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Comments & Version History Column */}
        <div className="space-y-6">
          {/* Version History Card */}
          <div className="card-tier-1 p-5 space-y-3">
            <h3 className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#172DC3]" />
              <span>Version History ({activeAsset.versions?.length || 0})</span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(activeAsset.versions || []).map((ver) => (
                <div key={ver.versionNumber} className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#15192B]">
                    <span>v{ver.versionNumber} Snapshot</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ver.updatedAt.slice(11, 16)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{ver.caption}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Comments Workspace */}
          <div className="card-tier-1 p-5 space-y-3">
            <h3 className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#172DC3]" />
              <span>Team Review Comments</span>
            </h3>

            {/* Comment Input */}
            <div className="space-y-2">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold text-slate-800"
              >
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>

              <textarea
                rows={2}
                placeholder="Add review feedback..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />

              <button
                onClick={handleAddComment}
                className="w-full btn-secondary py-2 text-xs font-bold flex items-center justify-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>Post Comment</span>
              </button>
            </div>

            {/* Comment Stream */}
            <div className="space-y-2 pt-2 max-h-48 overflow-y-auto">
              {(activeAsset.comments || []).map((c) => (
                <div key={c.id} className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#15192B]">
                    <span>{c.authorName}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{c.authorRole}</span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK MEMORY LOGGING MODAL */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#160857]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-black text-[#15192B] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#CB19C2]" />
              <span>Log Marketing Feedback Memory</span>
            </h3>

            <p className="text-xs text-slate-600 font-medium">
              This feedback memory will be saved in IndexedDB and supplied as context to future Gemini generations to improve future campaign alignment.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Rating</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Positive', 'Neutral', 'Negative'] as const).map((r) => {
                  const isSel = feedbackRating === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFeedbackRating(r)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        isSel
                          ? 'bg-[#160857] text-white border-[#160857]'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Why was this content approved or modified?
              </label>
              <textarea
                rows={3}
                value={feedbackExplanation}
                onChange={(e) => setFeedbackExplanation(e.target.value)}
                placeholder="e.g. Prefer Darija written in Arabic script with natural French technical terms (e.g., 'impression 3D', 'batch'). Avoid overly casual slang for B2B posts."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsFeedbackModalOpen(false)}
                className="btn-ghost px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFeedbackMemory}
                className="btn-primary px-5 py-2 text-xs font-bold"
              >
                Save Feedback Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
