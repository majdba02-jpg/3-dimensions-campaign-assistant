import React from 'react';
import { StoryFrame, StoryInteractionElement, FactualStatus } from '../../types';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Smartphone,
  MessageCircle,
  Eye,
  Type as TypeIcon,
  HelpCircle,
  Link as LinkIcon,
  BarChart2,
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Music,
} from 'lucide-react';

interface StoryFrameEditorProps {
  frames: StoryFrame[];
  legacyCaptionText?: string;
  onChangeFrames: (frames: StoryFrame[]) => void;
  onGenerateFrames: () => Promise<void>;
  isGeneratingFrames: boolean;
  isLocked: boolean;
  factualStatus?: FactualStatus;
}

const COMMON_PURPOSES = [
  'Hook / Question',
  'Behind the Scenes',
  'Feature & Detail Highlight',
  'Micro-Demo / Process',
  'Interactive Poll / Quiz',
  'Customer Proof / Result',
  'DM / Swipe Up CTA',
];

const INTERACTION_OPTIONS: { value: StoryInteractionElement; label: string; icon: any }[] = [
  { value: 'None', label: 'None', icon: HelpCircle },
  { value: 'Poll', label: 'Poll Sticker', icon: BarChart2 },
  { value: 'Question', label: 'Question Box', icon: MessageCircle },
  { value: 'Slider', label: 'Emoji Slider', icon: Sliders },
  { value: 'Link / CTA', label: 'Link / CTA Sticker', icon: LinkIcon },
];

export const StoryFrameEditor: React.FC<StoryFrameEditorProps> = ({
  frames,
  legacyCaptionText,
  onChangeFrames,
  onGenerateFrames,
  isGeneratingFrames,
  isLocked,
  factualStatus,
}) => {
  // Update a single field on a frame
  const handleUpdateFrame = (
    index: number,
    field: keyof StoryFrame,
    value: any
  ) => {
    if (isLocked) return;
    const updated = frames.map((frame, i) => {
      if (i === index) {
        return { ...frame, [field]: value };
      }
      return frame;
    });
    onChangeFrames(updated);
  };

  // Add a new frame to the story sequence
  const handleAddFrame = () => {
    if (isLocked) return;
    const newFrameNum = frames.length + 1;
    let defaultPurpose = 'Feature & Detail Highlight';
    let defaultInteraction: StoryInteractionElement = 'None';
    if (frames.length === 0) defaultPurpose = 'Hook / Question';
    else if (frames.length >= 3) {
      defaultPurpose = 'DM / Swipe Up CTA';
      defaultInteraction = 'Link / CTA';
    }

    const newFrame: StoryFrame = {
      id: `frame_${Date.now()}_${newFrameNum}`,
      frameNumber: newFrameNum,
      purpose: defaultPurpose,
      visualDirection: '',
      onScreenText: '',
      interactionElement: defaultInteraction,
      cta: '',
      notes: '',
    };

    const updated = [...frames, newFrame].map((f, idx) => ({
      ...f,
      frameNumber: idx + 1,
    }));
    onChangeFrames(updated);
  };

  // Delete a frame
  const handleDeleteFrame = (index: number) => {
    if (isLocked) return;
    const updated = frames
      .filter((_, i) => i !== index)
      .map((f, idx) => ({
        ...f,
        frameNumber: idx + 1,
      }));
    onChangeFrames(updated);
  };

  // Move frame up
  const handleMoveUp = (index: number) => {
    if (isLocked || index === 0) return;
    const updated = [...frames];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChangeFrames(
      updated.map((f, idx) => ({
        ...f,
        frameNumber: idx + 1,
      }))
    );
  };

  // Move frame down
  const handleMoveDown = (index: number) => {
    if (isLocked || index === frames.length - 1) return;
    const updated = [...frames];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChangeFrames(
      updated.map((f, idx) => ({
        ...f,
        frameNumber: idx + 1,
      }))
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-fuchsia-50 border border-fuchsia-100 flex items-center justify-center text-fuchsia-700">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-[#15192B] uppercase tracking-wider">
                STRUCTURED STORY PLAN
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/80">
                {frames.length} {frames.length === 1 ? 'Frame' : 'Frames'} (9:16)
              </span>
              {factualStatus && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                    factualStatus === 'grounded'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : factualStatus === 'creative'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {factualStatus === 'grounded' ? (
                    <ShieldCheck className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  <span>
                    {factualStatus === 'grounded'
                      ? 'Grounded in Specs'
                      : factualStatus === 'creative'
                      ? 'Creative Angle'
                      : 'Requires Confirmation'}
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Vertical 9:16 story sequence, on-screen text overlays, interactive stickers, and mobile CTAs.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddFrame}
            disabled={isLocked}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Add a new story frame"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Frame</span>
          </button>

          <button
            type="button"
            onClick={onGenerateFrames}
            disabled={isLocked || isGeneratingFrames}
            className="px-3.5 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shadow-fuchsia-600/20 cursor-pointer disabled:opacity-50"
            title={
              isLocked
                ? 'Unlock content item to allow AI regeneration'
                : 'Generate structured story sequence tailored to this topic'
            }
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingFrames ? 'animate-spin' : ''}`} />
            <span>
              {isGeneratingFrames
                ? 'Generating Frames...'
                : frames.length > 0
                ? 'Regenerate Story (AI)'
                : 'Generate Story (AI)'}
            </span>
          </button>
        </div>
      </div>

      {/* Lock Notice if locked */}
      {isLocked && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium flex items-center gap-2">
          <span>🔒 Content item is locked. Unlock in the top bar to edit frames or run AI regeneration.</span>
        </div>
      )}

      {/* Empty State */}
      {frames.length === 0 && (
        <div className="p-8 bg-slate-50/70 border border-dashed border-slate-300 rounded-2xl text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center mx-auto">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#15192B]">No Structured Story Frames Configured</h4>
            <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto mt-0.5">
              Click Generate Story (AI) to create a high-engagement 9:16 frame sequence with on-screen copy, visual cues, and interactive stickers, or build frames manually.
            </p>
          </div>

          {legacyCaptionText && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl max-w-lg mx-auto text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Existing Draft Reference:
              </span>
              <p className="text-xs text-slate-700 italic line-clamp-3">"{legacyCaptionText}"</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onGenerateFrames}
              disabled={isLocked || isGeneratingFrames}
              className="btn-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Structured Story (AI)</span>
            </button>
            <button
              type="button"
              onClick={handleAddFrame}
              disabled={isLocked}
              className="btn-secondary text-xs px-4 py-2 font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Frame</span>
            </button>
          </div>
        </div>
      )}

      {/* Frame Cards List */}
      <div className="space-y-3">
        {frames.map((frame, index) => {
          const isFirst = index === 0;
          const isLast = index === frames.length - 1;

          return (
            <div
              key={frame.id || `frame_${index}`}
              className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-3 shadow-2xs hover:border-slate-300 transition"
            >
              {/* Frame Header / Badge & Ordering Tools */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-fuchsia-600 text-white text-[11px] font-black tracking-wide">
                    Frame {index + 1}
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      list={`story_purposes_${index}`}
                      value={frame.purpose || ''}
                      disabled={isLocked}
                      onChange={(e) => handleUpdateFrame(index, 'purpose', e.target.value)}
                      placeholder="e.g. Hook / Behind the Scenes"
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-fuchsia-500 transition"
                    />
                    <datalist id={`story_purposes_${index}`}>
                      {COMMON_PURPOSES.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>
                  {frame.interactionElement && frame.interactionElement !== 'None' && (
                    <span className="text-[10px] font-bold text-fuchsia-700 bg-fuchsia-50 px-2 py-0.5 rounded-full border border-fuchsia-200/60 flex items-center gap-1">
                      <span>{frame.interactionElement}</span>
                    </span>
                  )}
                </div>

                {/* Move & Delete Controls */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={isLocked || isFirst}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition cursor-pointer"
                    title="Move frame up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={isLocked || isLast}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition cursor-pointer"
                    title="Move frame down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFrame(index)}
                    disabled={isLocked}
                    className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-30 transition cursor-pointer ml-1"
                    title="Delete frame"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* On-Screen Text (Mobile Overlay) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <TypeIcon className="w-3 h-3 text-slate-400" />
                    <span>On-Screen Text (9:16 Overlay)</span>
                  </label>
                  <textarea
                    rows={2}
                    dir="auto"
                    value={frame.onScreenText || ''}
                    disabled={isLocked}
                    onChange={(e) => handleUpdateFrame(index, 'onScreenText', e.target.value)}
                    placeholder="Short, punchy mobile text overlay (read in <3s)..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#15192B] focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 transition leading-snug"
                  />
                </div>

                {/* Visual Direction (Filming Angle / 9:16 Shot) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-purple-600" />
                    <span>Visual Direction (9:16 Mobile Shot)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={frame.visualDirection || ''}
                    disabled={isLocked}
                    onChange={(e) => handleUpdateFrame(index, 'visualDirection', e.target.value)}
                    placeholder="e.g. Phone POV peeling support from SLA resin print, rotating on turntable..."
                    className="w-full px-3 py-1.5 bg-purple-50/30 border border-purple-100 rounded-xl text-xs text-purple-950 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
                  />
                </div>

                {/* Interaction Sticker & CTA */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-fuchsia-500" />
                    <span>Interactive Element</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={frame.interactionElement || 'None'}
                      disabled={isLocked}
                      onChange={(e) =>
                        handleUpdateFrame(
                          index,
                          'interactionElement',
                          e.target.value as StoryInteractionElement
                        )
                      }
                      className="w-full px-2.5 py-1.5 bg-fuchsia-50/50 border border-fuchsia-100 rounded-xl text-xs font-bold text-fuchsia-950 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 transition cursor-pointer"
                    >
                      {INTERACTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      dir="auto"
                      value={frame.cta || ''}
                      disabled={isLocked}
                      onChange={(e) => handleUpdateFrame(index, 'cta', e.target.value)}
                      placeholder="Sticker / DM CTA..."
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 transition"
                    />
                  </div>
                </div>

                {/* Audio / Production Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Music className="w-3 h-3 text-indigo-500" />
                    <span>Production / Audio Notes</span>
                  </label>
                  <input
                    type="text"
                    value={frame.notes || ''}
                    disabled={isLocked}
                    onChange={(e) => handleUpdateFrame(index, 'notes', e.target.value)}
                    placeholder="e.g. Upbeat lo-fi track, place sticker in lower third..."
                    className="w-full px-3 py-1.5 bg-indigo-50/30 border border-indigo-100 rounded-xl text-xs font-medium text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
