import React, { useState } from 'react';
import { AlertTriangle, Check, Edit2, Sparkles, X } from 'lucide-react';

interface AssumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingFields: { fieldKey: string; label: string; proposedValue: string }[];
  onConfirm: (confirmedAssumptions: Record<string, string>) => void;
}

export const AssumptionModal: React.FC<AssumptionModalProps> = ({
  isOpen,
  onClose,
  missingFields,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const [assumptions, setAssumptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    missingFields.forEach((item) => {
      initial[item.fieldKey] = item.proposedValue;
    });
    return initial;
  });

  const [editingKey, setEditingKey] = useState<string | null>(null);

  const handleConfirm = () => {
    onConfirm(assumptions);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-amber-50 border-b border-amber-200 p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Confirm Proposed Campaign Assumptions
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Some optional parameters were left blank. Gemini will not silently invent missing details. Please review or adjust our proposed assumptions below before generating.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Proposed Specifications ({missingFields.length})
          </p>

          <div className="space-y-3">
            {missingFields.map((item) => {
              const currentValue = assumptions[item.fieldKey] ?? item.proposedValue;
              const isEditing = editingKey === item.fieldKey;

              return (
                <div
                  key={item.fieldKey}
                  className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => setEditingKey(isEditing ? null : item.fieldKey)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{isEditing ? 'Done' : 'Edit'}</span>
                    </button>
                  </div>

                  {isEditing ? (
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) =>
                        setAssumptions((prev) => ({
                          ...prev,
                          [item.fieldKey]: e.target.value,
                        }))
                      }
                      className="text-xs bg-white border border-indigo-300 rounded px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-900"
                    />
                  ) : (
                    <div className="text-xs text-slate-700 font-medium bg-white px-3 py-2 rounded border border-slate-200 flex items-center justify-between">
                      <span>{currentValue}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                        Proposed
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Go Back & Fill Form
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Confirm & Generate 3 Directions</span>
          </button>
        </div>
      </div>
    </div>
  );
};
