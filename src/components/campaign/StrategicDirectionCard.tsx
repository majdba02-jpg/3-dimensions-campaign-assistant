import React, { useState, useEffect } from 'react';
import { StrategicDirection } from '../../types';
import {
  CheckCircle,
  RefreshCw,
  Edit3,
  Check,
  X,
  Compass,
  Layers,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

export interface StrategicDirectionCardProps {
  direction: StrategicDirection;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onReplace: (id: string) => void;
  isReplacing: boolean;
  onSaveEdit: (id: string, updated: Partial<StrategicDirection>) => void;
  accentColor?: string;
}

export const StrategicDirectionCard: React.FC<StrategicDirectionCardProps> = ({
  direction,
  index,
  isSelected,
  onSelect,
  onReplace,
  isReplacing,
  onSaveEdit,
  accentColor,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(direction.title || '');
  const [editAngle, setEditAngle] = useState(direction.strategicAngle || '');
  const [editConcept, setEditConcept] = useState(direction.concept || '');
  const [editCoreMessage, setEditCoreMessage] = useState(direction.coreMessage || '');
  const [editRationale, setEditRationale] = useState(direction.strategicRationale || '');
  const [editSpecificPillar, setEditSpecificPillar] = useState(
    direction.directionSpecificPillar || ''
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync edit state when direction prop updates
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(direction.title || '');
      setEditAngle(direction.strategicAngle || '');
      setEditConcept(direction.concept || '');
      setEditCoreMessage(direction.coreMessage || '');
      setEditRationale(direction.strategicRationale || '');
      setEditSpecificPillar(direction.directionSpecificPillar || '');
    }
  }, [direction, isEditing]);

  const handleSave = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const trimmedTitle = editTitle.trim();
    const trimmedAngle = editAngle.trim();
    const trimmedConcept = editConcept.trim();
    const trimmedCoreMessage = editCoreMessage.trim();
    const trimmedRationale = editRationale.trim();

    if (!trimmedTitle || !trimmedConcept || !trimmedCoreMessage || !trimmedRationale) {
      setValidationError('Please fill in Title, Concept, Core Message, and Strategic Rationale.');
      return;
    }

    setValidationError(null);

    const originalText = direction.originalText || {
      title: direction.title,
      concept: direction.concept,
      coreMessage: direction.coreMessage,
      strategicRationale: direction.strategicRationale,
    };

    onSaveEdit(direction.id, {
      title: trimmedTitle,
      strategicAngle: trimmedAngle || direction.strategicAngle,
      concept: trimmedConcept,
      coreMessage: trimmedCoreMessage,
      strategicRationale: trimmedRationale,
      directionSpecificPillar: editSpecificPillar.trim() || undefined,
      isEdited: true,
      originalText,
      updatedAt: new Date().toISOString(),
    });

    setIsEditing(false);
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditTitle(direction.title || '');
    setEditAngle(direction.strategicAngle || '');
    setEditConcept(direction.concept || '');
    setEditCoreMessage(direction.coreMessage || '');
    setEditRationale(direction.strategicRationale || '');
    setEditSpecificPillar(direction.directionSpecificPillar || '');
    setValidationError(null);
    setIsEditing(false);
  };

  const topColor =
    accentColor ||
    (direction.isHybrid
      ? '#8B5CF6'
      : direction.directionNumber === 1 || index === 0
      ? '#172DC3'
      : direction.directionNumber === 2 || index === 1
      ? '#0D9488'
      : '#D97706');

  const factualStatus = direction.factualStatus || 'grounded';

  return (
    <div
      id={`direction-card-${direction.id}`}
      className={`rounded-2xl border transition-all duration-200 relative overflow-hidden bg-white shadow-2xs ${
        isSelected
          ? 'border-[#172DC3] ring-2 ring-[#172DC3]/20 shadow-md bg-indigo-50/10'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {/* Top Accent Line */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: topColor }}
      />

      <div className="p-5 sm:p-6 space-y-4">
        {/* Header: Number, Strategic Angle, Grounding Badge, Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                direction.isHybrid
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-slate-100 text-[#15192B] border-slate-200'
              }`}
            >
              {direction.isHybrid
                ? 'HYBRID'
                : `DIR ${String(direction.directionNumber || index + 1).padStart(2, '0')}`}
            </span>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#172DC3] border border-blue-100 shadow-2xs">
              <Compass className="w-3.5 h-3.5 text-[#172DC3]" />
              <span>{direction.strategicAngle}</span>
            </div>

            {/* Grounding Status Badge */}
            {factualStatus === 'requires_confirmation' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Requires Confirmation</span>
              </span>
            ) : factualStatus === 'creative' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>Creative Angle</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Grounded in Knowledge</span>
              </span>
            )}

            {direction.isEdited && (
              <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Edited
              </span>
            )}
            {direction.isReplacement && (
              <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Replaced
              </span>
            )}
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Replace Direction with AI */}
            {!direction.isHybrid && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReplace(direction.id);
                }}
                disabled={isReplacing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                title="Generate an alternative strategic direction for this slot"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReplacing ? 'animate-spin text-[#172DC3]' : 'text-slate-400'}`} />
                <span>{isReplacing ? 'Replacing...' : 'Replace'}</span>
              </button>
            )}

            {/* Edit / Save controls */}
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  title="Cancel editing"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Edit</span>
              </button>
            )}

            {/* Select Direction Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(direction.id);
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                isSelected
                  ? 'bg-[#172DC3] text-white shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-[#172DC3] border border-slate-200/80 hover:border-indigo-200'
              }`}
            >
              <CheckCircle
                className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`}
              />
              <span>{isSelected ? '✓ Selected Direction' : 'Select Direction'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isEditing ? (
          <div className="space-y-3.5 pt-1">
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#15192B] mb-1">
                  Direction Title *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#15192B] mb-1">
                  Strategic Angle
                </label>
                <input
                  type="text"
                  value={editAngle}
                  onChange={(e) => setEditAngle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Concept Summary *
              </label>
              <textarea
                rows={2}
                value={editConcept}
                onChange={(e) => {
                  setEditConcept(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Core Message / Hook *
              </label>
              <textarea
                rows={2}
                value={editCoreMessage}
                onChange={(e) => {
                  setEditCoreMessage(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Strategic Rationale (Why this works) *
              </label>
              <textarea
                rows={2}
                value={editRationale}
                onChange={(e) => {
                  setEditRationale(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Optional Direction-Specific Pillar
              </label>
              <input
                type="text"
                value={editSpecificPillar}
                onChange={(e) => setEditSpecificPillar(e.target.value)}
                placeholder="e.g. Rapid Iteration Case Studies"
                className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 shadow-inner"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-black text-[#15192B] leading-snug">
                {direction.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                {direction.concept}
              </p>
            </div>

            {/* Core Message Callout */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Core Message
              </div>
              <p className="text-xs font-bold text-[#15192B] italic">
                "{direction.coreMessage}"
              </p>
            </div>

            {/* Strategic Rationale */}
            <div className="text-xs text-slate-600 font-medium leading-relaxed">
              <span className="font-bold text-slate-800">Why this works: </span>
              {direction.strategicRationale}
            </div>

            {/* Campaign Pillars */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                Pillars:
              </span>
              {direction.campaignPillars && direction.campaignPillars.length > 0 ? (
                direction.campaignPillars.map((p, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold border border-slate-200/80"
                  >
                    {p}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-400 italic">Standard campaign pillars</span>
              )}
              {direction.directionSpecificPillar && (
                <span className="text-[11px] px-2.5 py-0.5 bg-blue-50 text-[#172DC3] border border-blue-200 rounded-md font-bold">
                  + {direction.directionSpecificPillar}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
