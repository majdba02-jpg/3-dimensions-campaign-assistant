import React, { useState } from 'react';
import { BrandKit } from '../../types';
import { Palette, Sparkles, Plus, Trash2, Copy, Check, RefreshCw, AlertCircle, X } from 'lucide-react';

interface ColorPaletteSectionProps {
  brandKit: BrandKit | null;
  campaignPalette: string[];
  onChangeCampaignPalette: (colors: string[]) => void;
  onRequestSuggestPalette: () => Promise<Array<{ name: string; hex: string; rationale: string }>>;
  isSuggestingPalette: boolean;
}

export const ColorPaletteSection: React.FC<ColorPaletteSectionProps> = ({
  brandKit,
  campaignPalette,
  onChangeCampaignPalette,
  onRequestSuggestPalette,
  isSuggestingPalette,
}) => {
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [tempColorHex, setTempColorHex] = useState('#6366F1');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [suggestedModalOpen, setSuggestedModalOpen] = useState(false);
  const [suggestedPalette, setSuggestedPalette] = useState<
    Array<{ name: string; hex: string; rationale: string }>
  >([]);

  // Collect genuine Brand Kit colors strictly from verified stored brand kit without fabricating defaults
  const genuineBrandColors: string[] = [];
  if (brandKit) {
    if (brandKit.primaryColorHex && /^#[0-9A-F]{6}$/i.test(brandKit.primaryColorHex)) {
      genuineBrandColors.push(brandKit.primaryColorHex.toUpperCase());
    }
    if (
      brandKit.accentColorHex &&
      /^#[0-9A-F]{6}$/i.test(brandKit.accentColorHex) &&
      !genuineBrandColors.includes(brandKit.accentColorHex.toUpperCase())
    ) {
      genuineBrandColors.push(brandKit.accentColorHex.toUpperCase());
    }
    if (
      brandKit.secondaryColorHex &&
      /^#[0-9A-F]{6}$/i.test(brandKit.secondaryColorHex) &&
      !genuineBrandColors.includes(brandKit.secondaryColorHex.toUpperCase())
    ) {
      genuineBrandColors.push(brandKit.secondaryColorHex.toUpperCase());
    }
    if (Array.isArray(brandKit.primaryColors)) {
      brandKit.primaryColors.forEach((c) => {
        if (
          typeof c === 'string' &&
          /^#[0-9A-F]{6}$/i.test(c) &&
          !genuineBrandColors.includes(c.toUpperCase())
        ) {
          genuineBrandColors.push(c.toUpperCase());
        }
      });
    }
  }

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleConfirmAddColor = () => {
    const formatted = tempColorHex.trim().toUpperCase();
    if (/^#[0-9A-F]{6}$/i.test(formatted) && !campaignPalette.includes(formatted)) {
      onChangeCampaignPalette([...campaignPalette, formatted]);
    }
    setShowAddPicker(false);
  };

  const handleRemoveColor = (hexToRemove: string) => {
    onChangeCampaignPalette(campaignPalette.filter((c) => c !== hexToRemove));
  };

  const handleOpenSuggestPalette = async () => {
    const suggestions = await onRequestSuggestPalette();
    if (suggestions && suggestions.length > 0) {
      setSuggestedPalette(suggestions);
      setSuggestedModalOpen(true);
    }
  };

  const handleApplySuggested = () => {
    const hexes = suggestedPalette.map((p) => p.hex.toUpperCase());
    const merged = Array.from(new Set([...campaignPalette, ...hexes]));
    onChangeCampaignPalette(merged);
    setSuggestedModalOpen(false);
  };

  return (
    <div className="space-y-4" id="color-palette-section">
      {/* 1. Brand Colors (Read-only company knowledge) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Brand Colors — Inherited
          </label>
          <span className="text-[11px] text-slate-400 font-medium">Read-only company knowledge</span>
        </div>
        {genuineBrandColors.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
            {genuineBrandColors.map((color, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs"
              >
                <div
                  className="w-4 h-4 rounded-full border border-slate-300 shadow-inner"
                  style={{ backgroundColor: color }}
                />
                <span className="font-mono text-xs text-slate-800 font-bold">{color}</span>
                <button
                  type="button"
                  onClick={() => handleCopyHex(color)}
                  className="text-slate-400 hover:text-[#172DC3] p-0.5 cursor-pointer transition"
                  title="Copy HEX"
                >
                  {copiedHex === color ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Brand Kit colors not configured in Data & Knowledge → Brand Kit</span>
          </div>
        )}
      </div>

      {/* 2. Campaign-Specific Palette */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Campaign Palette {campaignPalette.length > 0 ? `(${campaignPalette.length} Colors)` : ''}
          </label>
          <button
            type="button"
            onClick={handleOpenSuggestPalette}
            disabled={isSuggestingPalette}
            className="btn-ai inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold disabled:opacity-60 cursor-pointer"
          >
            {isSuggestingPalette ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#6344BF]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#CB19C2]" />
            )}
            <span>AI Suggest Campaign Palette</span>
          </button>
        </div>

        {/* Selected Swatches Container */}
        <div className="flex flex-wrap items-center gap-2 min-h-12 p-3 bg-white border border-slate-200/90 rounded-xl mb-2">
          {campaignPalette.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              No campaign-specific colors added yet. (Optional — add accents below or request AI suggestions).
            </span>
          ) : (
            campaignPalette.map((hex, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs group"
              >
                <div
                  className="w-4 h-4 rounded-full border border-slate-300 shadow-inner"
                  style={{ backgroundColor: hex }}
                />
                <span className="font-mono text-xs text-slate-800 font-bold">{hex}</span>
                <button
                  type="button"
                  onClick={() => handleCopyHex(hex)}
                  className="text-slate-400 hover:text-[#172DC3] p-0.5 cursor-pointer transition"
                  title="Copy HEX"
                >
                  {copiedHex === hex ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveColor(hex)}
                  className="text-slate-300 hover:text-rose-600 p-0.5 cursor-pointer transition"
                  title="Remove color"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Color Interactive Controls */}
        {!showAddPicker ? (
          <button
            type="button"
            onClick={() => setShowAddPicker(true)}
            className="btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5 text-[#172DC3]" />
            <span>Add Color Accent</span>
          </button>
        ) : (
          <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5 max-w-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Pick Color Accent</span>
              <button
                type="button"
                onClick={() => setShowAddPicker(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={tempColorHex}
                onChange={(e) => setTempColorHex(e.target.value.toUpperCase())}
                className="w-10 h-10 p-0.5 bg-white border border-slate-200 rounded-xl cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={tempColorHex}
                onChange={(e) => setTempColorHex(e.target.value)}
                placeholder="#6366F1"
                maxLength={7}
                className="w-28 px-3 py-2 text-xs font-mono border border-slate-200/90 rounded-xl uppercase bg-white focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
              />
              <button
                type="button"
                onClick={handleConfirmAddColor}
                className="btn-primary px-3.5 py-2 text-xs font-bold"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddPicker(false)}
                className="btn-secondary px-3 py-2 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Palette Preview Modal */}
      {suggestedModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200/90 overflow-hidden animate-slide-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#6344BF]" />
                <h3 className="text-sm font-black text-[#15192B]">
                  AI Suggested Campaign Palette Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSuggestedModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                The following cohesive color accents were proposed to complement the 3D printing subject and tone:
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {suggestedPalette.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200/90 rounded-xl"
                  >
                    <div
                      className="w-8 h-8 rounded-xl border border-slate-300 shadow-inner shrink-0"
                      style={{ backgroundColor: item.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{item.name}</span>
                        <span className="font-mono text-xs text-slate-600 font-semibold">{item.hex}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSuggestedModalOpen(false)}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplySuggested}
                className="btn-primary px-4 py-2 text-xs font-bold"
              >
                Apply Palette
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
