import React, { useState } from 'react';
import { AssumptionItem } from '../../types';
import {
  CheckCircle,
  Edit2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  Check,
  Tag,
  Info,
} from 'lucide-react';

interface AssumptionsSectionProps {
  assumptions: AssumptionItem[];
  onChangeAssumptions: (assumptions: AssumptionItem[]) => void;
  onProceedToDirections: () => void;
  onBackToBrief: () => void;
  isLoadingDirections: boolean;
}

export const AssumptionsSection: React.FC<AssumptionsSectionProps> = ({
  assumptions,
  onChangeAssumptions,
  onProceedToDirections,
  onBackToBrief,
  isLoadingDirections,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleSetStatus = (id: string, status: 'Accepted' | 'Rejected') => {
    onChangeAssumptions(
      assumptions.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };

  const handleSaveEdit = (id: string) => {
    onChangeAssumptions(
      assumptions.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'Edited',
              editedValue: editValue.trim(),
              proposedValue: editValue.trim(),
            }
          : a
      )
    );
    setEditingId(null);
  };

  const startEdit = (item: AssumptionItem) => {
    setEditingId(item.id);
    setEditValue(item.editedValue || item.proposedValue);
  };

  return (
    <div className="space-y-4" id="assumptions-review-section">
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
        <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Assumptions & Creative Framing Review</span>
        </div>
        <p className="text-xs text-blue-700 leading-relaxed">
          Gemini reviewed your campaign brief. To ensure strategic alignment without inventing
          unverified company facts, review these optional framing proposals before generating
          strategic directions.
        </p>
      </div>

      {assumptions.length === 0 ? (
        <div className="p-6 text-center bg-white border border-slate-200 rounded-xl space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Check className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">
            No Additional Assumptions Required
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your campaign brief contains complete and sufficient context. You can proceed directly to
            generating 3 distinct strategic directions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assumptions.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.status === 'Accepted'
                  ? 'bg-emerald-50/40 border-emerald-300'
                  : item.status === 'Rejected'
                  ? 'bg-slate-50/80 border-slate-200 opacity-60'
                  : item.status === 'Edited'
                  ? 'bg-blue-50/40 border-blue-300'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                    {item.category}
                  </span>
                  {item.sourceTags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200"
                    >
                      <Tag className="w-2.5 h-2.5 text-slate-400" />
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetStatus(item.id, 'Accepted')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      item.status === 'Accepted'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetStatus(item.id, 'Rejected')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      item.status === 'Rejected'
                        ? 'bg-slate-700 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Don't Use</span>
                  </button>
                </div>
              </div>

              {editingId === item.id ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(item.id)}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-slate-900 leading-relaxed">
                    <span className="text-slate-500 font-normal">Proposed Assumption: </span>
                    {item.editedValue || item.proposedValue}
                  </div>
                  <div className="text-[11px] text-slate-500 italic">
                    Why: {item.rationale}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onBackToBrief}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Brief</span>
        </button>

        <button
          type="button"
          onClick={onProceedToDirections}
          disabled={isLoadingDirections}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isLoadingDirections ? 'Generating Directions...' : 'Generate 3 Strategic Directions'}</span>
        </button>
      </div>
    </div>
  );
};
