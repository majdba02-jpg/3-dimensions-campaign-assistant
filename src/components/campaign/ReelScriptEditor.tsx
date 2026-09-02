import React, { useState } from 'react';
import { ScriptSegment, FactualStatus } from '../../types';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Video,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Film,
  MessageSquare,
} from 'lucide-react';

interface ReelScriptEditorProps {
  segments: ScriptSegment[];
  legacyScriptText?: string;
  totalDurationSeconds?: number;
  onChangeSegments: (segments: ScriptSegment[], duration?: number) => void;
  onGenerateDetailedScript: () => Promise<void>;
  isGeneratingScript: boolean;
  isLocked: boolean;
  factualStatus?: FactualStatus;
}

/**
 * Calculates total seconds from a timestamp like "00:15" or "0:20"
 */
function parseTimestampToSeconds(ts: string): number {
  if (!ts) return 0;
  const parts = ts.trim().split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  const numeric = parseInt(ts, 10);
  return isNaN(numeric) ? 0 : numeric;
}

function formatSecondsToTimestamp(totalSecs: number): string {
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const ReelScriptEditor: React.FC<ReelScriptEditorProps> = ({
  segments,
  legacyScriptText,
  totalDurationSeconds,
  onChangeSegments,
  onGenerateDetailedScript,
  isGeneratingScript,
  isLocked,
  factualStatus,
}) => {
  // Derive total duration from last segment if not explicitly passed
  const calculatedDuration = React.useMemo(() => {
    if (totalDurationSeconds && totalDurationSeconds > 0) return totalDurationSeconds;
    if (segments.length > 0) {
      const lastSeg = segments[segments.length - 1];
      const endSec = parseTimestampToSeconds(lastSeg.endTime);
      if (endSec > 0) return endSec;
    }
    return 15;
  }, [segments, totalDurationSeconds]);

  // Update a single cell in a segment
  const handleUpdateSegment = (
    index: number,
    field: keyof ScriptSegment,
    value: string
  ) => {
    if (isLocked) return;
    const updated = segments.map((seg, i) => {
      if (i === index) {
        return { ...seg, [field]: value };
      }
      return seg;
    });

    // Re-derive duration if end time changed on last segment
    let newDuration = calculatedDuration;
    if (index === segments.length - 1 && field === 'endTime') {
      const parsed = parseTimestampToSeconds(value);
      if (parsed > 0) newDuration = parsed;
    }

    onChangeSegments(updated, newDuration);
  };

  // Add a new row to the table
  const handleAddSegment = () => {
    if (isLocked) return;
    let startSec = 0;
    if (segments.length > 0) {
      const lastEnd = segments[segments.length - 1].endTime;
      startSec = parseTimestampToSeconds(lastEnd);
    }
    const endSec = startSec + 4;

    const newSeg: ScriptSegment = {
      id: `seg_${Date.now()}_${segments.length + 1}`,
      startTime: formatSecondsToTimestamp(startSec),
      endTime: formatSecondsToTimestamp(endSec),
      visual: '',
      voiceover: '',
      onScreenText: '',
      cameraNotes: '',
    };

    const updated = [...segments, newSeg];
    onChangeSegments(updated, endSec);
  };

  // Delete a row
  const handleDeleteSegment = (index: number) => {
    if (isLocked) return;
    const updated = segments.filter((_, i) => i !== index);
    const newDuration =
      updated.length > 0
        ? parseTimestampToSeconds(updated[updated.length - 1].endTime) || 15
        : 15;
    onChangeSegments(updated, newDuration);
  };

  // Move row up
  const handleMoveUp = (index: number) => {
    if (isLocked || index === 0) return;
    const updated = [...segments];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChangeSegments(updated, calculatedDuration);
  };

  // Move row down
  const handleMoveDown = (index: number) => {
    if (isLocked || index === segments.length - 1) return;
    const updated = [...segments];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChangeSegments(updated, calculatedDuration);
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-xl border border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#172DC3]" />
            <h3 className="text-xs font-black text-[#15192B] uppercase tracking-wider">
              Structured Production Video Script
            </h3>
            {factualStatus === 'requires_confirmation' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Requires Confirmation</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Production Ready</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Timed shot breakdown with Darija voiceover dialogue, English on-screen text, and videographer camera notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Total Duration Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#160857] shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[#172DC3]" />
            <span>Total Duration:</span>
            <span className="text-[#172DC3] font-mono font-black">{calculatedDuration}s</span>
          </div>

          {/* AI Generation Button */}
          <button
            type="button"
            onClick={onGenerateDetailedScript}
            disabled={isGeneratingScript || isLocked}
            className={`btn-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer ${
              isGeneratingScript ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#CB19C2] ${isGeneratingScript ? 'animate-spin' : ''}`} />
            <span>{isGeneratingScript ? 'Generating Script...' : segments.length === 0 ? 'Generate Detailed Script' : 'Regenerate Script with AI'}</span>
          </button>
        </div>
      </div>

      {/* Legacy Plain Text Fallback Container (if segments not yet built) */}
      {segments.length === 0 && legacyScriptText && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-700" />
              <span>Existing Unstructured Script / Concept Draft</span>
            </span>
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
              Legacy Plain Text
            </span>
          </div>
          <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap bg-white/90 p-3 rounded-lg border border-amber-200/80 leading-relaxed font-mono">
            {legacyScriptText}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-amber-800">
              Click <strong>Generate Detailed Script</strong> above to transform this into an editable, timestamped multi-column production table.
            </span>
            <button
              type="button"
              onClick={handleAddSegment}
              className="btn-secondary text-xs px-3 py-1 font-bold flex items-center gap-1 bg-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start Manual Table</span>
            </button>
          </div>
        </div>
      )}

      {/* Structured Timestamped Script Table */}
      {segments.length > 0 ? (
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#160857] text-white font-bold text-[10px] uppercase tracking-wider divide-x divide-white/10">
                    <th className="py-2.5 px-3 w-28 whitespace-nowrap">Timestamp</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Visual / Shot Direction</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Voiceover / Dialogue (Darija)</th>
                    <th className="py-2.5 px-3 min-w-[170px]">On-Screen Text</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Camera / Action Notes</th>
                    <th className="py-2.5 px-2 w-20 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {segments.map((seg, idx) => (
                    <tr
                      key={seg.id || idx}
                      className="hover:bg-indigo-50/20 transition group/row divide-x divide-slate-100"
                    >
                      {/* 1. Timestamp Column */}
                      <td className="py-2.5 px-2.5 align-top bg-slate-50/50">
                        <div className="flex items-center gap-1 font-mono">
                          <input
                            type="text"
                            value={seg.startTime}
                            disabled={isLocked}
                            onChange={(e) => handleUpdateSegment(idx, 'startTime', e.target.value)}
                            placeholder="00:00"
                            className="w-12 px-1.5 py-1 bg-white border border-slate-200 rounded text-center text-xs font-bold text-[#160857] focus:ring-1 focus:ring-[#172DC3]"
                          />
                          <span className="text-slate-400 font-bold">-</span>
                          <input
                            type="text"
                            value={seg.endTime}
                            disabled={isLocked}
                            onChange={(e) => handleUpdateSegment(idx, 'endTime', e.target.value)}
                            placeholder="00:03"
                            className="w-12 px-1.5 py-1 bg-white border border-slate-200 rounded text-center text-xs font-bold text-[#160857] focus:ring-1 focus:ring-[#172DC3]"
                          />
                        </div>
                        <span className="block text-[9px] text-slate-400 font-bold mt-1 text-center">
                          Shot #{idx + 1}
                        </span>
                      </td>

                      {/* 2. Visual / Shot Column */}
                      <td className="py-2 px-2.5 align-top">
                        <textarea
                          rows={3}
                          value={seg.visual}
                          disabled={isLocked}
                          onChange={(e) => handleUpdateSegment(idx, 'visual', e.target.value)}
                          placeholder="Describe visual scene, 3D printer nozzle, CAD screen..."
                          className="w-full p-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 leading-snug font-medium focus:ring-1 focus:ring-[#172DC3] transition resize-y"
                        />
                      </td>

                      {/* 3. Voiceover / Dialogue (Tunisian Darija) Column */}
                      <td className="py-2 px-2.5 align-top">
                        <textarea
                          rows={3}
                          value={seg.voiceover}
                          disabled={isLocked}
                          onChange={(e) => handleUpdateSegment(idx, 'voiceover', e.target.value)}
                          placeholder="Tunisian Darija dialogue / narration..."
                          dir="auto"
                          className="w-full p-2 bg-indigo-50/30 hover:bg-white focus:bg-white border border-indigo-100 focus:border-indigo-300 rounded-lg text-xs text-[#15192B] font-semibold leading-snug focus:ring-1 focus:ring-[#172DC3] transition resize-y"
                        />
                      </td>

                      {/* 4. On-Screen Text Column */}
                      <td className="py-2 px-2.5 align-top">
                        <textarea
                          rows={2}
                          value={seg.onScreenText}
                          disabled={isLocked}
                          onChange={(e) => handleUpdateSegment(idx, 'onScreenText', e.target.value)}
                          placeholder="English / French punchy subtitle..."
                          className="w-full p-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-bold leading-snug focus:ring-1 focus:ring-[#172DC3] transition resize-y"
                        />
                      </td>

                      {/* 5. Camera / Action Notes Column */}
                      <td className="py-2 px-2.5 align-top">
                        <textarea
                          rows={2}
                          value={seg.cameraNotes}
                          disabled={isLocked}
                          onChange={(e) => handleUpdateSegment(idx, 'cameraNotes', e.target.value)}
                          placeholder="e.g. Macro lens 4k, push-in, snap transition..."
                          className="w-full p-2 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 italic leading-snug focus:ring-1 focus:ring-[#172DC3] transition resize-y"
                        />
                      </td>

                      {/* 6. Actions Column */}
                      <td className="py-2 px-1 align-top text-center">
                        <div className="flex flex-col items-center gap-1 pt-1">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveUp(idx)}
                              disabled={isLocked || idx === 0}
                              title="Move Up"
                              className="p-1 rounded text-slate-400 hover:text-[#172DC3] hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(idx)}
                              disabled={isLocked || idx === segments.length - 1}
                              title="Move Down"
                              className="p-1 rounded text-slate-400 hover:text-[#172DC3] hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSegment(idx)}
                            disabled={isLocked}
                            title="Delete Shot"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Row Button below table */}
          {!isLocked && (
            <button
              type="button"
              onClick={handleAddSegment}
              className="btn-secondary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 border-dashed border-slate-300 hover:border-[#172DC3] bg-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#172DC3]" />
              <span>+ Add Script Segment / Shot</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
};
