import React from 'react';
import { CarouselSlide, FactualStatus } from '../../types';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  FileText,
  Eye,
  Type as TypeIcon,
  ShieldCheck,
  AlertTriangle,
  Sparkle,
} from 'lucide-react';

interface CarouselSlideEditorProps {
  slides: CarouselSlide[];
  legacyCaptionText?: string;
  onChangeSlides: (slides: CarouselSlide[]) => void;
  onGenerateSlides: () => Promise<void>;
  isGeneratingSlides: boolean;
  isLocked: boolean;
  factualStatus?: FactualStatus;
}

const COMMON_PURPOSES = [
  'Cover / Hook',
  'Problem / Pain Point',
  'Solution Breakdown',
  'Technical Specs & Materials',
  'Process / Before & After',
  'Customer Use Case',
  'Final CTA / Next Step',
];

export const CarouselSlideEditor: React.FC<CarouselSlideEditorProps> = ({
  slides,
  legacyCaptionText,
  onChangeSlides,
  onGenerateSlides,
  isGeneratingSlides,
  isLocked,
  factualStatus,
}) => {
  // Update a single field on a slide
  const handleUpdateSlide = (
    index: number,
    field: keyof CarouselSlide,
    value: any
  ) => {
    if (isLocked) return;
    const updated = slides.map((slide, i) => {
      if (i === index) {
        return { ...slide, [field]: value };
      }
      return slide;
    });
    onChangeSlides(updated);
  };

  // Add a new slide to the carousel
  const handleAddSlide = () => {
    if (isLocked) return;
    const newSlideNum = slides.length + 1;
    let defaultPurpose = 'Feature & Value';
    if (slides.length === 0) defaultPurpose = 'Cover / Hook';
    else if (slides.length >= 4) defaultPurpose = 'Final CTA / Next Step';

    const newSlide: CarouselSlide = {
      id: `slide_${Date.now()}_${newSlideNum}`,
      slideNumber: newSlideNum,
      purpose: defaultPurpose,
      headline: '',
      bodyCopy: '',
      visualDirection: '',
      onSlideText: '',
    };

    const updated = [...slides, newSlide].map((s, idx) => ({
      ...s,
      slideNumber: idx + 1,
    }));
    onChangeSlides(updated);
  };

  // Delete a slide
  const handleDeleteSlide = (index: number) => {
    if (isLocked) return;
    const updated = slides
      .filter((_, i) => i !== index)
      .map((s, idx) => ({
        ...s,
        slideNumber: idx + 1,
      }));
    onChangeSlides(updated);
  };

  // Move slide up
  const handleMoveUp = (index: number) => {
    if (isLocked || index === 0) return;
    const updated = [...slides];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChangeSlides(
      updated.map((s, idx) => ({
        ...s,
        slideNumber: idx + 1,
      }))
    );
  };

  // Move slide down
  const handleMoveDown = (index: number) => {
    if (isLocked || index === slides.length - 1) return;
    const updated = [...slides];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChangeSlides(
      updated.map((s, idx) => ({
        ...s,
        slideNumber: idx + 1,
      }))
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-[#15192B] uppercase tracking-wider">
                STRUCTURED CAROUSEL PLAN
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                {slides.length} {slides.length === 1 ? 'Slide' : 'Slides'}
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
              Sequence of visual cards, punchy on-slide copy, and clear art direction for graphic design.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddSlide}
            disabled={isLocked}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Add a new slide"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slide</span>
          </button>

          <button
            type="button"
            onClick={onGenerateSlides}
            disabled={isLocked || isGeneratingSlides}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            title={
              isLocked
                ? 'Unlock content item to allow AI regeneration'
                : 'Generate structured carousel slides tailored to this topic'
            }
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingSlides ? 'animate-spin' : ''}`} />
            <span>
              {isGeneratingSlides
                ? 'Generating Slides...'
                : slides.length > 0
                ? 'Regenerate Slides (AI)'
                : 'Generate Carousel (AI)'}
            </span>
          </button>
        </div>
      </div>

      {/* Lock Notice if locked */}
      {isLocked && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium flex items-center gap-2">
          <span>🔒 Content item is locked. Unlock in the top bar to edit slides or run AI regeneration.</span>
        </div>
      )}

      {/* Empty State */}
      {slides.length === 0 && (
        <div className="p-8 bg-slate-50/70 border border-dashed border-slate-300 rounded-2xl text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#15192B]">No Structured Slides Configured</h4>
            <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto mt-0.5">
              Click Generate Carousel (AI) to create an expert slide-by-slide sequence with headlines, visual instructions, and on-slide text, or add your first slide manually.
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
              onClick={onGenerateSlides}
              disabled={isLocked || isGeneratingSlides}
              className="btn-primary text-xs px-4 py-2 font-bold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Structured Carousel (AI)</span>
            </button>
            <button
              type="button"
              onClick={handleAddSlide}
              disabled={isLocked}
              className="btn-secondary text-xs px-4 py-2 font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Slide</span>
            </button>
          </div>
        </div>
      )}

      {/* Slide Cards List */}
      <div className="space-y-3">
        {slides.map((slide, index) => {
          const isFirst = index === 0;
          const isLast = index === slides.length - 1;

          return (
            <div
              key={slide.id || `slide_${index}`}
              className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-3 shadow-2xs hover:border-slate-300 transition"
            >
              {/* Slide Header / Badge & Ordering Tools */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white text-[11px] font-black tracking-wide">
                    Slide {index + 1}
                  </span>
                  <div className="relative">
                    <input
                      type="text"
                      list={`purposes_${index}`}
                      value={slide.purpose || ''}
                      disabled={isLocked}
                      onChange={(e) => handleUpdateSlide(index, 'purpose', e.target.value)}
                      placeholder="e.g. Cover / Hook"
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                    />
                    <datalist id={`purposes_${index}`}>
                      {COMMON_PURPOSES.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>
                  {isFirst && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
                      Cover Slide
                    </span>
                  )}
                  {isLast && slides.length > 1 && (
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
                      CTA Slide
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
                    title="Move slide up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={isLocked || isLast}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition cursor-pointer"
                    title="Move slide down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(index)}
                    disabled={isLocked}
                    className="p-1 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-30 transition cursor-pointer ml-1"
                    title="Delete slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Headline */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <TypeIcon className="w-3 h-3 text-slate-400" />
                    <span>Headline</span>
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={slide.headline || ''}
                    disabled={isLocked}
                    onChange={(e) => handleUpdateSlide(index, 'headline', e.target.value)}
                    placeholder="Punchy slide headline..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#15192B] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>

                {/* On-Slide Overlay Text */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Sparkle className="w-3 h-3 text-indigo-500" />
                    <span>On-Slide Overlay / Badge Text</span>
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    value={slide.onSlideText || ''}
                    disabled={isLocked}
                    onChange={(e) => handleUpdateSlide(index, 'onSlideText', e.target.value)}
                    placeholder="Short stat, bullet point, or badge..."
                    className="w-full px-3 py-1.5 bg-indigo-50/40 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>

                {/* Body Copy */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>Body Copy</span>
                  </label>
                  <textarea
                    rows={2}
                    dir="auto"
                    value={slide.bodyCopy || ''}
                    disabled={isLocked}
                    onChange={(e) => handleUpdateSlide(index, 'bodyCopy', e.target.value)}
                    placeholder="Supporting educational or technical text for this slide..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>

                {/* Visual Direction for Designer */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-purple-600" />
                    <span>Visual Direction (Designer Notes)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={slide.visualDirection || ''}
                    disabled={isLocked}
                    onChange={(e) => handleUpdateSlide(index, 'visualDirection', e.target.value)}
                    placeholder="e.g. 3D render, macro nozzle shot, dimension lines overlay..."
                    className="w-full px-3 py-1.5 bg-purple-50/30 border border-purple-100 rounded-xl text-xs text-purple-950 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
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
