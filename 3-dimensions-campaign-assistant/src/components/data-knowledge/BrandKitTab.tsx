import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Building2,
  Palette,
  Sparkles,
  Tag,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  Check,
  Upload,
  X,
  Languages,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Edit2,
  Image as ImageIcon,
  HelpCircle,
} from 'lucide-react';
import { BrandKit, BrandColorItem, LanguageStyleExample } from '../../types';

interface BrandKitTabProps {
  brandKit?: BrandKit | null;
  onSaveBrandKit: (kit: BrandKit) => Promise<void>;
}

export const BrandKitTab: React.FC<BrandKitTabProps> = ({ brandKit, onSaveBrandKit }) => {
  // Local editable state with defensive defaults
  const [formData, setFormData] = useState<BrandKit>({
    companyName: brandKit?.companyName || '3 Dimensions',
    companyDescription: brandKit?.companyDescription || '',
    brandTone: brandKit?.brandTone || '',
    logoUrl: brandKit?.logoUrl,
    logoFileName: brandKit?.logoFileName,
    primaryColorHex: brandKit?.primaryColorHex || '#160857',
    accentColorHex: brandKit?.accentColorHex || '#CB19C2',
    secondaryColorHex: brandKit?.secondaryColorHex || '#6344BF',
    brandColors: Array.isArray(brandKit?.brandColors) && brandKit.brandColors.length > 0
      ? brandKit.brandColors
      : [
          { id: 'col_1', hex: brandKit?.primaryColorHex || '#160857', label: 'Primary Deep Indigo' },
          { id: 'col_2', hex: brandKit?.accentColorHex || '#CB19C2', label: 'Vibrant Magenta Accent' },
          { id: 'col_3', hex: brandKit?.secondaryColorHex || '#6344BF', label: 'Secondary Violet' },
        ],
    preferredTerminology: Array.isArray(brandKit?.preferredTerminology) ? brandKit.preferredTerminology : [],
    approvedClaims: Array.isArray(brandKit?.approvedClaims) ? brandKit.approvedClaims : [],
    wordsToAvoid: Array.isArray(brandKit?.wordsToAvoid) ? brandKit.wordsToAvoid : [],
    englishStyleExamples: Array.isArray(brandKit?.englishStyleExamples) ? brandKit.englishStyleExamples : [],
    darijaStyleExamples: Array.isArray(brandKit?.darijaStyleExamples) ? brandKit.darijaStyleExamples : [],
    frenchStyleExamples: Array.isArray(brandKit?.frenchStyleExamples) ? brandKit.frenchStyleExamples : [],
    additionalBrandInstructions: brandKit?.additionalBrandInstructions || '',
  });
  const [brandSavedNotice, setBrandSavedNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // New tag inputs
  const [newTermInput, setNewTermInput] = useState('');
  const [newAvoidInput, setNewAvoidInput] = useState('');
  const [newApprovedClaimInput, setNewApprovedClaimInput] = useState('');

  // Language example active subtab
  const [activeLangTab, setActiveLangTab] = useState<'darija' | 'english' | 'french'>('darija');
  const [newExampleTitle, setNewExampleTitle] = useState('');
  const [newExampleText, setNewExampleText] = useState('');
  const [newExampleNote, setNewExampleNote] = useState('');
  const [isAddingExample, setIsAddingExample] = useState(false);
  const [editingExampleId, setEditingExampleId] = useState<string | null>(null);

  // Logo file input ref
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Synchronize when brandKit changes externally
  useEffect(() => {
    if (!brandKit) return;
    setFormData((prev) => {
      const colors: BrandColorItem[] = Array.isArray(brandKit.brandColors) && brandKit.brandColors.length > 0
        ? [...brandKit.brandColors]
        : Array.isArray(prev.brandColors) && prev.brandColors.length > 0
        ? [...prev.brandColors]
        : [
            { id: 'col_1', hex: brandKit.primaryColorHex || prev.primaryColorHex || '#160857', label: 'Primary Deep Indigo' },
            { id: 'col_2', hex: brandKit.accentColorHex || prev.accentColorHex || '#CB19C2', label: 'Vibrant Magenta Accent' },
            { id: 'col_3', hex: brandKit.secondaryColorHex || prev.secondaryColorHex || '#6344BF', label: 'Secondary Violet' },
          ];

      return {
        ...prev,
        ...brandKit,
        brandColors: colors,
        preferredTerminology: Array.isArray(brandKit.preferredTerminology) ? brandKit.preferredTerminology : prev.preferredTerminology || [],
        approvedClaims: Array.isArray(brandKit.approvedClaims) ? brandKit.approvedClaims : prev.approvedClaims || [],
        wordsToAvoid: Array.isArray(brandKit.wordsToAvoid) ? brandKit.wordsToAvoid : prev.wordsToAvoid || [],
        englishStyleExamples: Array.isArray(brandKit.englishStyleExamples) ? brandKit.englishStyleExamples : prev.englishStyleExamples || [],
        darijaStyleExamples: Array.isArray(brandKit.darijaStyleExamples) ? brandKit.darijaStyleExamples : prev.darijaStyleExamples || [],
        frenchStyleExamples: Array.isArray(brandKit.frenchStyleExamples) ? brandKit.frenchStyleExamples : prev.frenchStyleExamples || [],
      };
    });
  }, [brandKit]);

  // Copy HEX to clipboard
  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  // Logo Upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        logoUrl: dataUrl,
        logoFileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: undefined,
      logoFileName: undefined,
    }));
  };

  // Color management
  const handleAddColor = () => {
    const newColor: BrandColorItem = {
      id: `col_${Date.now()}`,
      hex: '#3B82F6',
      label: 'New Accent',
    };
    setFormData((prev) => ({
      ...prev,
      brandColors: [...(prev.brandColors || []), newColor],
    }));
  };

  const handleUpdateColor = (id: string, updates: Partial<BrandColorItem>) => {
    setFormData((prev) => {
      const updated = (prev.brandColors || []).map((c) => (c.id === id ? { ...c, ...updates } : c));
      // Sync legacy fields
      const primary = updated[0]?.hex || prev.primaryColorHex;
      const accent = updated[1]?.hex || prev.accentColorHex;
      const secondary = updated[2]?.hex || prev.secondaryColorHex;
      return {
        ...prev,
        brandColors: updated,
        primaryColorHex: primary,
        accentColorHex: accent,
        secondaryColorHex: secondary,
      };
    });
  };

  const handleRemoveColor = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      brandColors: (prev.brandColors || []).filter((c) => c.id !== id),
    }));
  };

  // Preferred Terminology
  const handleAddTerm = () => {
    if (!newTermInput.trim()) return;
    const current = formData.preferredTerminology || [];
    if (!current.includes(newTermInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        preferredTerminology: [...(prev.preferredTerminology || []), newTermInput.trim()],
      }));
    }
    setNewTermInput('');
  };

  const handleRemoveTerm = (term: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredTerminology: (prev.preferredTerminology || []).filter((t) => t !== term),
    }));
  };

  // Approved Claims
  const handleAddApprovedClaim = () => {
    if (!newApprovedClaimInput.trim()) return;
    const current = formData.approvedClaims || [];
    if (!current.includes(newApprovedClaimInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        approvedClaims: [...current, newApprovedClaimInput.trim()],
      }));
    }
    setNewApprovedClaimInput('');
  };

  const handleRemoveApprovedClaim = (claim: string) => {
    setFormData((prev) => ({
      ...prev,
      approvedClaims: (prev.approvedClaims || []).filter((c) => c !== claim),
    }));
  };

  // Words to Avoid
  const handleAddAvoidWord = () => {
    if (!newAvoidInput.trim()) return;
    const current = formData.wordsToAvoid || [];
    if (!current.includes(newAvoidInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        wordsToAvoid: [...(prev.wordsToAvoid || []), newAvoidInput.trim()],
      }));
    }
    setNewAvoidInput('');
  };

  const handleRemoveAvoidWord = (word: string) => {
    setFormData((prev) => ({
      ...prev,
      wordsToAvoid: (prev.wordsToAvoid || []).filter((w) => w !== word),
    }));
  };

  // Language Examples
  const normalizeExamples = (list: (string | LanguageStyleExample)[]): LanguageStyleExample[] => {
    if (!list) return [];
    return list.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          id: `ex_${idx}_${item.slice(0, 10)}`,
          title: `Example #${idx + 1}`,
          text: item,
          note: 'Approved tone reference',
        };
      }
      return item;
    });
  };

  const currentLangExamples =
    activeLangTab === 'darija'
      ? normalizeExamples(formData.darijaStyleExamples)
      : activeLangTab === 'english'
      ? normalizeExamples(formData.englishStyleExamples)
      : normalizeExamples(formData.frenchStyleExamples || []);

  const handleSaveExample = () => {
    if (!newExampleText.trim()) return;
    const newEx: LanguageStyleExample = {
      id: editingExampleId || `ex_${Date.now()}`,
      title: newExampleTitle.trim() || 'Style Reference',
      text: newExampleText.trim(),
      note: newExampleNote.trim() || undefined,
    };

    setFormData((prev) => {
      const fieldKey =
        activeLangTab === 'darija'
          ? 'darijaStyleExamples'
          : activeLangTab === 'english'
          ? 'englishStyleExamples'
          : 'frenchStyleExamples';

      const current = normalizeExamples(prev[fieldKey] as any);
      let updated: LanguageStyleExample[];
      if (editingExampleId) {
        updated = current.map((e) => (e.id === editingExampleId ? newEx : e));
      } else {
        updated = [...current, newEx];
      }

      return {
        ...prev,
        [fieldKey]: updated,
      };
    });

    setIsAddingExample(false);
    setEditingExampleId(null);
    setNewExampleTitle('');
    setNewExampleText('');
    setNewExampleNote('');
  };

  const handleStartEditExample = (ex: LanguageStyleExample) => {
    setEditingExampleId(ex.id);
    setNewExampleTitle(ex.title);
    setNewExampleText(ex.text);
    setNewExampleNote(ex.note || '');
    setIsAddingExample(true);
  };

  const handleDeleteExample = (id: string) => {
    setFormData((prev) => {
      const fieldKey =
        activeLangTab === 'darija'
          ? 'darijaStyleExamples'
          : activeLangTab === 'english'
          ? 'englishStyleExamples'
          : 'frenchStyleExamples';

      const current = normalizeExamples(prev[fieldKey] as any);
      return {
        ...prev,
        [fieldKey]: current.filter((e) => e.id !== id),
      };
    });
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveBrandKit(formData);
      setBrandSavedNotice(true);
      setTimeout(() => setBrandSavedNotice(false), 3000);
    } catch (err) {
      console.error('Failed to save brand kit:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Completeness calculations
  const hasProfile = !!formData.companyName && !!formData.companyDescription;
  const hasTone = !!formData.brandTone;
  const hasLogo = !!formData.logoUrl;
  const colorsCount = formData.brandColors?.length || 0;
  const claimsCount = formData.approvedClaims?.length || 0;
  const termsCount = formData.preferredTerminology?.length || 0;
  const avoidCount = formData.wordsToAvoid?.length || 0;
  const examplesCount =
    (formData.darijaStyleExamples?.length || 0) +
    (formData.englishStyleExamples?.length || 0) +
    (formData.frenchStyleExamples?.length || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Toast Notification */}
      {brandSavedNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm font-semibold animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Brand Kit specifications and style guidelines successfully updated in IndexedDB.</span>
          </div>
          <button type="button" onClick={() => setBrandSavedNotice(false)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Brand Kit Header & Completeness Overview */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-[#6344BF]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-[#15192B] text-base">Brand Kit & Style Guidelines</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Authoritative brand identity, tone of voice, approved terminology, and language examples for campaign generation.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-xs shrink-0"
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Brand Kit</span>
              </>
            )}
          </button>
        </div>

        {/* Completeness Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className={`p-3 rounded-xl border flex items-center gap-2 ${hasProfile ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            <Building2 className={`w-4 h-4 shrink-0 ${hasProfile ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div>
              <div className="font-bold text-[11px]">Company Profile</div>
              <div className="text-[10px]">{hasProfile ? 'Configured' : 'Missing'}</div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-2 ${hasTone ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            <Sparkles className={`w-4 h-4 shrink-0 ${hasTone ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div>
              <div className="font-bold text-[11px]">Voice & Tone</div>
              <div className="text-[10px]">{hasTone ? 'Configured' : 'Missing'}</div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-2 ${hasLogo ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            <ImageIcon className={`w-4 h-4 shrink-0 ${hasLogo ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div>
              <div className="font-bold text-[11px]">Official Logo</div>
              <div className="text-[10px]">{hasLogo ? 'Uploaded' : 'None'}</div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-2 ${colorsCount > 0 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            <Palette className={`w-4 h-4 shrink-0 ${colorsCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div>
              <div className="font-bold text-[11px]">Brand Colors</div>
              <div className="text-[10px]">{colorsCount} Defined</div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-2 ${claimsCount > 0 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            <ShieldCheck className={`w-4 h-4 shrink-0 ${claimsCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div>
              <div className="font-bold text-[11px]">Approved Claims</div>
              <div className="text-[10px]">{claimsCount} Defined</div>
            </div>
          </div>

          <div className={`p-3 rounded-xl border flex items-center gap-2 ${examplesCount > 0 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            <Languages className={`w-4 h-4 shrink-0 ${examplesCount > 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div>
              <div className="font-bold text-[11px]">Style Examples</div>
              <div className="text-[10px]">{examplesCount} Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Company Profile & Official Logo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-tier-1 p-6 space-y-4">
          <div className="border-b border-slate-200/80 pb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#172DC3]" />
            <h4 className="font-black text-[#15192B] text-sm">Company Identity & Voice</h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                placeholder="e.g. 3 Dimensions"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Company Description & Core Mission
              </label>
              <textarea
                rows={3}
                value={formData.companyDescription}
                onChange={(e) => setFormData({ ...formData, companyDescription: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed"
                placeholder="Describe what 3 Dimensions does, its expertise in 3D printing and digital fabrication in Tunisia..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Brand Tone of Voice & Personality
              </label>
              <textarea
                rows={2}
                value={formData.brandTone}
                onChange={(e) => setFormData({ ...formData, brandTone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed"
                placeholder="e.g. Modern, high-precision engineering, approachable tech-forward tone, authentic Tunisian entrepreneurship..."
              />
            </div>
          </div>
        </div>

        {/* Official Logo Upload */}
        <div className="card-tier-1 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-200/80 pb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#CB19C2]" />
              <h4 className="font-black text-[#15192B] text-sm">Official Logo</h4>
            </div>

            <div className="mt-4 space-y-3">
              {formData.logoUrl ? (
                <div className="space-y-3">
                  <div className="h-32 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center p-3 relative overflow-hidden group">
                    <img
                      src={formData.logoUrl}
                      alt="Brand Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[160px] font-medium">{formData.logoFileName || 'Logo asset'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="text-[#172DC3] hover:underline font-bold text-xs"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-rose-600 hover:underline font-bold text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 flex flex-col items-center justify-center gap-2 cursor-pointer transition p-4 text-center"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">Upload Brand Logo</span>
                  <span className="text-[10px] text-slate-400">PNG, SVG, or JPG</span>
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            Used as reference for creative briefs, asset mockups, and campaign branding assets.
          </p>
        </div>
      </div>

      {/* Section 2: Brand Colors */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div>
            <h4 className="font-black text-[#15192B] text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#172DC3]" />
              <span>Brand Color Palette</span>
            </h4>
            <p className="text-xs text-slate-500">
              Official company brand colors used for design briefs, post aesthetic guidance, and visual direction.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddColor}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Brand Color</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(formData.brandColors || []).map((col, idx) => (
            <div
              key={col.id}
              className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3 relative group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl shadow-xs border border-black/10 shrink-0 relative overflow-hidden flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: col.hex }}
                >
                  <input
                    type="color"
                    value={col.hex}
                    onChange={(e) => handleUpdateColor(col.id, { hex: e.target.value })}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <input
                    type="text"
                    value={col.label || ''}
                    onChange={(e) => handleUpdateColor(col.id, { label: e.target.value })}
                    placeholder={`Color ${idx + 1}`}
                    className="w-full text-xs font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-hidden px-1"
                  />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={col.hex.toUpperCase()}
                      onChange={(e) => handleUpdateColor(col.id, { hex: e.target.value })}
                      className="w-20 font-mono text-[11px] uppercase font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyHex(col.hex)}
                      className="p-1 text-slate-400 hover:text-slate-700 transition"
                      title="Copy HEX"
                    >
                      {copiedHex === col.hex ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {(formData.brandColors?.length || 0) > 1 && (
                <div className="flex justify-end pt-1 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(col.id)}
                    className="text-[11px] text-slate-400 hover:text-rose-600 transition flex items-center gap-1 font-medium"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Approved Claims, Preferred Terminology & Words to Avoid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Approved Claims */}
        <div className="card-tier-1 p-5 space-y-3">
          <div className="border-b border-slate-200/80 pb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h4 className="font-black text-[#15192B] text-xs uppercase tracking-wider">Approved Marketing Claims</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Verified factual statements Gemini is authorized to mention in captions and briefs.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newApprovedClaimInput}
              onChange={(e) => setNewApprovedClaimInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddApprovedClaim();
                }
              }}
              placeholder="e.g. 24h turnaround for prototypes"
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleAddApprovedClaim}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition"
            >
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {(formData.approvedClaims || []).length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-2">No approved claims defined yet.</p>
            ) : (
              (formData.approvedClaims || []).map((claim, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs flex items-center justify-between gap-2 text-emerald-950"
                >
                  <span className="text-[11px] leading-tight font-medium">✓ {claim}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveApprovedClaim(claim)}
                    className="text-emerald-700 hover:text-rose-600 p-0.5 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preferred Terminology */}
        <div className="card-tier-1 p-5 space-y-3">
          <div className="border-b border-slate-200/80 pb-2 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-[#172DC3]" />
            <h4 className="font-black text-[#15192B] text-xs uppercase tracking-wider">Preferred Terminology</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Preferred vocabulary and technical terms (e.g. PLA+, Resin, FDM, CAD Prototyping).
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTermInput}
              onChange={(e) => setNewTermInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTerm();
                }
              }}
              placeholder="e.g. Rapid Prototyping"
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddTerm}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#172DC3] border border-indigo-200 rounded-xl text-xs font-bold transition"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
            {(formData.preferredTerminology || []).length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-2">No terminology tags added yet.</p>
            ) : (
              (formData.preferredTerminology || []).map((term, idx) => (
                <span
                  key={idx}
                  className="bg-indigo-50 text-[#172DC3] border border-indigo-200/80 text-[11px] px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1.5"
                >
                  <span>{term}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTerm(term)}
                    className="hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Words / Claims to Avoid */}
        <div className="card-tier-1 p-5 space-y-3">
          <div className="border-b border-slate-200/80 pb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h4 className="font-black text-[#15192B] text-xs uppercase tracking-wider">Words & Claims to Avoid</h4>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Phrases, clichés, or false promises Gemini must strictly avoid in copy.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={newAvoidInput}
              onChange={(e) => setNewAvoidInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAvoidWord();
                }
              }}
              placeholder="e.g. Cheap plastic, overseas shipping"
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
            />
            <button
              type="button"
              onClick={handleAddAvoidWord}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
            {(formData.wordsToAvoid || []).length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-2">No restricted words specified.</p>
            ) : (
              (formData.wordsToAvoid || []).map((word, idx) => (
                <span
                  key={idx}
                  className="bg-rose-50 text-rose-700 border border-rose-200/80 text-[11px] px-2.5 py-1 rounded-lg font-semibold inline-flex items-center gap-1.5"
                >
                  <span>{word}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAvoidWord(word)}
                    className="hover:text-rose-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Language Style Examples */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div>
            <h4 className="font-black text-[#15192B] text-sm flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#6344BF]" />
              <span>Language Style & Tone Examples</span>
            </h4>
            <p className="text-xs text-slate-500">
              Benchmark approved copy examples provided as in-context style prompts for campaign generation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveLangTab('darija');
                  setIsAddingExample(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${activeLangTab === 'darija' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Tunisian Darija ({formData.darijaStyleExamples?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveLangTab('english');
                  setIsAddingExample(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${activeLangTab === 'english' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                English ({formData.englishStyleExamples?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveLangTab('french');
                  setIsAddingExample(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${activeLangTab === 'french' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                French ({formData.frenchStyleExamples?.length || 0})
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAddingExample(true);
                setEditingExampleId(null);
                setNewExampleTitle('');
                setNewExampleText('');
                setNewExampleNote('');
              }}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#172DC3] text-xs font-bold rounded-xl transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Example</span>
            </button>
          </div>
        </div>

        {/* Add/Edit Modal or Form */}
        {isAddingExample && (
          <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#15192B]">
                {editingExampleId ? 'Edit Style Example' : `Add New ${activeLangTab === 'darija' ? 'Tunisian Darija' : activeLangTab === 'english' ? 'English' : 'French'} Example`}
              </span>
              <button
                type="button"
                onClick={() => setIsAddingExample(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Example Label / Context</label>
                <input
                  type="text"
                  value={newExampleTitle}
                  onChange={(e) => setNewExampleTitle(e.target.value)}
                  placeholder="e.g. B2B CAD Prototyping Hook"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Why this style is recommended</label>
                <input
                  type="text"
                  value={newExampleNote}
                  onChange={(e) => setNewExampleNote(e.target.value)}
                  placeholder="e.g. Natural blend of Arabic script with technical French/English terms"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Approved Copy Text ({activeLangTab === 'darija' ? 'Arabic Script' : activeLangTab === 'english' ? 'English' : 'French'})
              </label>
              <textarea
                rows={3}
                value={newExampleText}
                onChange={(e) => setNewExampleText(e.target.value)}
                placeholder={activeLangTab === 'darija' ? 'علاش تستنى جمعات باش تجرب الـ Prototype متاعك؟ مع 3 Dimensions...' : 'Turn your 3D CAD design into a physical prototype in under 24 hours in Tunisia.'}
                dir={activeLangTab === 'darija' ? 'rtl' : 'ltr'}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingExample(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveExample}
                disabled={!newExampleText.trim()}
                className="btn-primary px-4 py-1.5 text-xs font-bold"
              >
                Save Example
              </button>
            </div>
          </div>
        )}

        {/* List of examples */}
        <div className="space-y-3">
          {currentLangExamples.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No style examples added for {activeLangTab === 'darija' ? 'Tunisian Darija' : activeLangTab === 'english' ? 'English' : 'French'} yet.
            </div>
          ) : (
            currentLangExamples.map((ex) => (
              <div
                key={ex.id}
                className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2 hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{ex.title}</span>
                    {ex.note && (
                      <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {ex.note}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEditExample(ex)}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteExample(ex.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-800 leading-relaxed font-sans"
                  dir={activeLangTab === 'darija' ? 'rtl' : 'ltr'}
                >
                  {ex.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 5: Additional Special Brand Instructions */}
      <div className="card-tier-1 p-6 space-y-3">
        <div className="border-b border-slate-200/80 pb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-600" />
          <h4 className="font-black text-[#15192B] text-sm">Additional Brand Directives & Guardrails</h4>
        </div>
        <p className="text-xs text-slate-500">
          Any specific contextual notes or cultural formatting guidelines passed to Gemini generation context.
        </p>

        <textarea
          rows={3}
          value={formData.additionalBrandInstructions || ''}
          onChange={(e) => setFormData({ ...formData, additionalBrandInstructions: e.target.value })}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Always emphasize that 3 Dimensions is physically located in Tunisia with fast local turnaround. Keep calls-to-action focused on direct STL/CAD file submission..."
        />
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <span className="text-xs text-slate-500 font-medium">
          Changes will take effect immediately in the New Campaign generator and Campaign Workspace context.
        </span>
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary px-6 py-2 text-xs font-bold shadow-xs"
        >
          {isSaving ? 'Saving Changes...' : 'Save All Brand Kit Changes'}
        </button>
      </div>
    </form>
  );
};
