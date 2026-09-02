import React, { useState } from 'react';
import { AssumptionItem } from '../../types';
import {
  CheckCircle,
  Edit2,
  XCircle,
  Sparkles,
  ArrowLeft,
  Check,
  Tag,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

interface AssumptionsSectionProps {
  assumptions: AssumptionItem[];
  onUpdateAssumption?: (updated: AssumptionItem) => void;
  onChangeAssumptions?: (assumptions: AssumptionItem[]) => void;
  onProceedToDirections: () => void;
  onBackToBrief: () => void;
  isLoadingDirections: boolean;
}

export const AssumptionsSection: React.FC<AssumptionsSectionProps> = ({
  assumptions,
  onUpdateAssumption,
  onChangeAssumptions,
  onProceedToDirections,
  onBackToBrief,
  isLoadingDirections,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Helper to propagate item updates cleanly to either callback
  const notifyUpdate = (updatedItem: AssumptionItem) => {
    if (onUpdateAssumption) {
      onUpdateAssumption(updatedItem);
    }
    if (onChangeAssumptions) {
      onChangeAssumptions(assumptions.map((a) => (a.id === updatedItem.id ? updatedItem : a)));
    }
  };

  const handleAccept = (item: AssumptionItem) => {
    if (editingId === item.id) {
      setEditingId(null);
      setEditError(null);
    }
    const updated: AssumptionItem = {
      ...item,
      status: 'Accepted',
    };
    notifyUpdate(updated);
  };

  const handleReject = (item: AssumptionItem) => {
    if (editingId === item.id) {
      setEditingId(null);
      setEditError(null);
    }
    const updated: AssumptionItem = {
      ...item,
      status: 'Rejected',
    };
    notifyUpdate(updated);
  };

  const handleUndo = (item: AssumptionItem) => {
    const updated: AssumptionItem = {
      ...item,
      status: 'Pending',
    };
    notifyUpdate(updated);
  };

  const startEdit = (item: AssumptionItem) => {
    setEditingId(item.id);
    setEditValue(item.editedValue || item.proposedValue);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setEditError(null);
  };

  const handleSaveEdit = (item: AssumptionItem) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditError('Assumption text cannot be empty. Please provide a clear framing or select Don’t Use.');
      return;
    }

    const updated: AssumptionItem = {
      ...item,
      originalValue: (item as any).originalValue || item.proposedValue,
      editedValue: trimmed,
      proposedValue: trimmed,
      status: 'Edited',
    };

    notifyUpdate(updated);
    setEditingId(null);
    setEditValue('');
    setEditError(null);
  };

  // Bulk actions for ease of review
  const handleAcceptAll = () => {
    const updatedAll = assumptions.map((a) => (a.status === 'Pending' ? { ...a, status: 'Accepted' as const } : a));
    if (onChangeAssumptions) {
      onChangeAssumptions(updatedAll);
    } else if (onUpdateAssumption) {
      updatedAll.forEach((a) => onUpdateAssumption(a));
    }
  };

  const handleRejectAll = () => {
    const updatedAll = assumptions.map((a) => (a.status === 'Pending' ? { ...a, status: 'Rejected' as const } : a));
    if (onChangeAssumptions) {
      onChangeAssumptions(updatedAll);
    } else if (onUpdateAssumption) {
      updatedAll.forEach((a) => onUpdateAssumption(a));
    }
  };

  // Metrics
  const totalCount = assumptions.length;
  const pendingCount = assumptions.filter((a) => a.status === 'Pending').length;
  const acceptedCount = assumptions.filter((a) => a.status === 'Accepted' || a.status === 'Edited').length;
  const rejectedCount = assumptions.filter((a) => a.status === 'Rejected').length;

  const canProceed = totalCount === 0 || pendingCount === 0;

  return (
    <div className="space-y-6" id="assumptions-review-section">
      {/* Informative Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#172DC3]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#15192B]">
                Assumptions & Creative Framing Review
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Safety checkpoint for optional missing context. Approved assumptions shape strategic angles.
              </p>
            </div>
          </div>

          {/* Quick Stats Pills */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2 text-xs font-bold">
              {pendingCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                  {pendingCount} Pending
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                {acceptedCount} Accepted
              </span>
              {rejectedCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  {rejectedCount} Excluded
                </span>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <span className="font-bold text-slate-800">Grounding Policy:</span> Proposing assumptions is restricted to safe creative framing where optional context was omitted. Existing brief details (e.g. selected languages, audience segment, CTAs, platforms) and company facts are authoritative and are never proposed as assumptions.
        </p>

        {/* Bulk Action Controls */}
        {totalCount > 1 && pendingCount > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500">
              Quick actions for remaining proposals:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-lg transition"
              >
                Accept All Pending
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="text-xs font-bold text-slate-600 hover:text-slate-800 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
              >
                Don't Use All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* No Assumptions State */}
      {totalCount === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm font-black text-[#15192B]">
              No Additional Assumptions Required
            </h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Your campaign brief provides complete and sufficient context without requiring creative assumptions. You can proceed directly to generating 3 strategic directions.
            </p>
          </div>
        </div>
      ) : (
        /* Assumptions Cards List */
        <div className="space-y-3.5">
          {assumptions.map((item) => {
            const isEditing = editingId === item.id;
            const isAccepted = item.status === 'Accepted' || item.status === 'Edited';
            const isRejected = item.status === 'Rejected';
            const isPending = item.status === 'Pending' || !item.status;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all duration-200 ${
                  isAccepted
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs ring-1 ring-emerald-500/20'
                    : isRejected
                    ? 'bg-slate-50/90 border-slate-200/90 opacity-75'
                    : 'bg-white border-amber-200/90 shadow-2xs ring-1 ring-amber-400/20'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  {/* Category & Truthful Source Tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-[#15192B] border border-slate-200">
                      {item.category}
                    </span>

                    {item.sourceTags && item.sourceTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {item.sourceTags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shadow-2xs"
                          >
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Status Badge */}
                    {isAccepted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        {item.status === 'Edited' ? 'Edited & Accepted' : 'Accepted'}
                      </span>
                    )}

                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                        <XCircle className="w-3 h-3 stroke-[2.5]" />
                        Will Not Be Used
                      </span>
                    )}

                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        Pending Review
                      </span>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Accept Button */}
                    <button
                      type="button"
                      onClick={() => handleAccept(item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                        isAccepted && item.status === 'Accepted'
                          ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                          : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                      title="Include this framing in strategic-direction generation"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{isAccepted && item.status === 'Accepted' ? 'Accepted' : 'Accept'}</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                        isEditing
                          ? 'bg-blue-600 text-white'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                      title="Refine or customize this proposed assumption"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{item.status === 'Edited' ? 'Re-edit' : 'Edit'}</span>
                    </button>

                    {/* Don't Use Button */}
                    {isRejected ? (
                      <button
                        type="button"
                        onClick={() => handleUndo(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs transition"
                        title="Reconsider this assumption"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reconsider</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReject(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition"
                        title="Exclude this proposal from downstream direction generation"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Don't Use</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Body Content / Inline Editor */}
                {isEditing ? (
                  <div className="space-y-2.5 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-[#15192B]">
                      Customize Assumption Value:
                    </label>
                    <textarea
                      rows={3}
                      value={editValue}
                      autoFocus
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        if (editError) setEditError(null);
                      }}
                      placeholder="Enter customized creative framing or strategic context..."
                      className="w-full px-3.5 py-2 text-xs bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 text-[#15192B] font-medium leading-relaxed shadow-inner"
                    />
                    {editError && (
                      <p className="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{editError}</span>
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item)}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-[#172DC3] hover:bg-[#12239e] rounded-xl shadow-2xs transition"
                      >
                        Save & Accept
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-[#15192B] leading-relaxed">
                      <span className="text-slate-500 font-normal">Proposed Assumption: </span>
                      <span className={`font-semibold ${isRejected ? 'line-through text-slate-500' : 'text-[#15192B]'}`}>
                        {item.editedValue || item.proposedValue}
                      </span>
                    </div>
                    {item.rationale && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        <span className="font-semibold text-slate-600">Rationale: </span>
                        {item.rationale}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unresolved Review Warning Banner */}
      {!canProceed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-950">
              {pendingCount} assumption{pendingCount > 1 ? 's' : ''} awaiting review
            </p>
            <p className="text-amber-800">
              Please click <strong>Accept</strong>, <strong>Edit</strong>, or <strong>Don't Use</strong> for each assumption above before generating strategic directions.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToBrief}
          className="btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Brief</span>
        </button>

        <button
          type="button"
          onClick={onProceedToDirections}
          disabled={!canProceed || isLoadingDirections}
          className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {isLoadingDirections
              ? 'Generating Directions...'
              : totalCount === 0
              ? 'Generate 3 Strategic Directions'
              : `Generate 3 Strategic Directions (${acceptedCount} accepted)`}
          </span>
        </button>
      </div>
    </div>
  );
};
