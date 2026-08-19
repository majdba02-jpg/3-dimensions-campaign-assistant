import React, { useState } from 'react';
import { StrategicDirection } from '../../types';
import {
  Sparkles,
  CheckCircle,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Edit3,
  Check,
  X,
  Compass,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface StrategicDirectionCardProps {
  direction: StrategicDirection;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onToggleShortlist: (id: string) => void;
  onReplace: (id: string) => void;
  isReplacing: boolean;
  onSaveEdit: (id: string, updated: Partial<StrategicDirection>) => void;
  accentColor?: string;
}

export const StrategicDirectionCard: React.FC<StrategicDirectionCardProps> = ({
  direction,
  isSelected,
  onSelect,
  onToggleShortlist,
  onReplace,
  isReplacing,
  onSaveEdit,
  accentColor,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(direction.title);
  const [editConcept, setEditConcept] = useState(direction.concept);
  const [editCoreMessage, setEditCoreMessage] = useState(direction.coreMessage);
  const [editRationale, setEditRationale] = useState(direction.strategicRationale);
  const [editSpecificPillar, setEditSpecificPillar] = useState(
    direction.directionSpecificPillar || ''
  );

  const handleSave = () => {
    onSaveEdit(direction.id, {
      title: editTitle.trim(),
      concept: editConcept.trim(),
      coreMessage: editCoreMessage.trim(),
      strategicRationale: editRationale.trim(),
      directionSpecificPillar: editSpecificPillar.trim() || undefined,
      isEdited: true,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(direction.title);
    setEditConcept(direction.concept);
    setEditCoreMessage(direction.coreMessage);
    setEditRationale(direction.strategicRationale);
    setEditSpecificPillar(direction.directionSpecificPillar || '');
    setIsEditing(false);
  };

  const borderStyle = isSelected
    ? { borderColor: accentColor || '#2563EB', borderWidth: '2px' }
    : undefined;

  return (
    <div
      id={`direction-card-${direction.id}`}
      style={borderStyle}
      className={`rounded-xl border transition-all relative overflow-hidden bg-white ${
        isSelected
          ? 'shadow-md ring-1 ring-blue-500/20'
          : 'border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      {/* Top Accent Line */}
      <div
        className="h-1 w-full"
        style={{
          backgroundColor:
            accentColor ||
            (direction.isHybrid
              ? '#8B5CF6'
              : direction.directionNumber === 1
              ? '#2563EB'
              : direction.directionNumber === 2
              ? '#0D9488'
              : '#D97706'),
        }}
      />

      <div className="p-5 space-y-4">
        {/* Header: Number, Strategic Angle, Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                direction.isHybrid
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {direction.isHybrid
                ? 'HYBRID'
                : `DIR ${String(direction.directionNumber).padStart(2, '0')}`}
            </span>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-100">
              <Compass className="w-3 h-3 text-blue-600" />
              <span>{direction.strategicAngle}</span>
            </div>
            {direction.isEdited && (
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                Edited
              </span>
            )}
            {direction.isReplacement && (
              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Replaced
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Shortlist bookmark */}
            <button
              type="button"
              onClick={() => onToggleShortlist(direction.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                direction.shortlisted
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Bookmark to shortlist"
            >
              {direction.shortlisted ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Shortlisted</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                  <span>Shortlist</span>
                </>
              )}
            </button>

            {/* Replace Direction with AI */}
            {!direction.isHybrid && (
              <button
                type="button"
                onClick={() => onReplace(direction.id)}
                disabled={isReplacing}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                title="Generate an alternative direction for this slot"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReplacing ? 'animate-spin' : ''}`} />
                <span>Replace</span>
              </button>
            )}

            {/* Edit / Save buttons */}
            {isEditing ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  title="Cancel editing"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Edit</span>
              </button>
            )}

            {/* Select for Plan Radio */}
            <button
              type="button"
              onClick={() => onSelect(direction.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <CheckCircle
                className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`}
              />
              <span>{isSelected ? 'Selected' : 'Select for Plan'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isEditing ? (
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Direction Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Concept Summary
              </label>
              <textarea
                rows={2}
                value={editConcept}
                onChange={(e) => setEditConcept(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Core Message / Hook
              </label>
              <textarea
                rows={2}
                value={editCoreMessage}
                onChange={(e) => setEditCoreMessage(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Strategic Rationale
              </label>
              <textarea
                rows={2}
                value={editRationale}
                onChange={(e) => setEditRationale(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Direction-Specific Pillar
              </label>
              <input
                type="text"
                value={editSpecificPillar}
                onChange={(e) => setEditSpecificPillar(e.target.value)}
                placeholder="e.g. Rapid Iteration Case Studies"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {direction.title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{direction.concept}</p>
            </div>

            {/* Core Message Callout */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Core Message
              </div>
              <p className="text-xs font-medium text-slate-900 italic">
                "{direction.coreMessage}"
              </p>
            </div>

            {/* Strategic Rationale */}
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">Why this works: </span>
              {direction.strategicRationale}
            </div>

            {/* Campaign Pillars */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
                <Layers className="w-3 h-3 text-slate-400" />
                Pillars:
              </span>
              {direction.campaignPillars?.map((p, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium"
                >
                  {p}
                </span>
              ))}
              {direction.directionSpecificPillar && (
                <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-medium">
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
