import React, { useState, useEffect } from 'react';
import {
  CampaignBrief,
  CampaignDirection,
  CampaignType,
  AudienceSegment,
  PlatformType,
  ContentFormat,
  LanguageOption,
  ProductService,
  BrandKit,
  CampaignReference,
} from '../types';
import { AssumptionModal } from '../components/common/AssumptionModal';
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  Loader2,
  Check,
  RefreshCw,
} from 'lucide-react';

interface NewCampaignProps {
  products: ProductService[];
  brandKit?: BrandKit | null;
  campaignReferences?: CampaignReference[];
  onGenerateDirections: (
    brief: CampaignBrief
  ) => Promise<CampaignDirection[]>;
  onSelectDirectionAndBuildPlan: (
    brief: CampaignBrief,
    selectedDirection: CampaignDirection
  ) => Promise<void>;
  isGenerating: boolean;
}

export const NewCampaign: React.FC<NewCampaignProps> = ({
  products,
  brandKit,
  campaignReferences,
  onGenerateDirections,
  onSelectDirectionAndBuildPlan,
  isGenerating,
}) => {
  // Step State: 1 = Brief Form, 2 = Directions Selection
  const [step, setStep] = useState<1 | 2>(1);

  // Form state
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [type, setType] = useState<CampaignType>('' as CampaignType);
  const [audienceSegment, setAudienceSegment] = useState<AudienceSegment>('' as AudienceSegment);
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || 'custom');
  const [customProduct, setCustomProduct] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [audienceAge, setAudienceAge] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [platforms, setPlatforms] = useState<PlatformType[]>(['Instagram', 'Facebook']);
  const [language, setLanguage] = useState<LanguageOption>('Multilingual (English & Darija)');
  const [desiredFormats, setDesiredFormats] = useState<ContentFormat[]>([]);
  const [cta, setCta] = useState('');

  // Content Pillars state
  const [contentPillars, setContentPillars] = useState<string[]>([]);
  const [rejectedPillars, setRejectedPillars] = useState<string[]>([]);
  const [newPillarInput, setNewPillarInput] = useState('');
  const [isSuggestingPillars, setIsSuggestingPillars] = useState(false);

  // Validation & Error states
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [generationError, setGenerationError] = useState<{ message: string; is503?: boolean } | null>(null);

  // Optional fields
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  const [buyerPersona, setBuyerPersona] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [campaignTone, setCampaignTone] = useState('');
  const [desiredKPIs, setDesiredKPIs] = useState('');
  const [promotionDetails, setPromotionDetails] = useState('');
  const [seasonalContext, setSeasonalContext] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Generated state
  const [activeBrief, setActiveBrief] = useState<CampaignBrief | null>(null);
  const [generatedDirections, setGeneratedDirections] = useState<CampaignDirection[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<CampaignDirection | null>(null);

  // Assumption Modal State
  const [isAssumptionModalOpen, setIsAssumptionModalOpen] = useState(false);
  const [missingOptionalFields, setMissingOptionalFields] = useState<
    { fieldKey: string; label: string; proposedValue: string }[]
  >([]);

  // Duration calculation
  const durationDays = Math.max(
    1,
    Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24))
  );

  useEffect(() => {
    if ((!selectedProductId || selectedProductId === 'custom') && products.length > 0 && !customProduct) {
      setSelectedProductId(products[0].id);
    }
  }, [products]);

  const getActiveProductName = () => {
    if (products.length === 0) {
      return customProduct || '';
    }
    if (selectedProductId === 'custom') {
      return customProduct || '';
    }
    const p = products.find((prod) => prod.id === selectedProductId);
    if (p) return p.name;
    if (products[0]) return products[0].name;
    return customProduct || '';
  };

  const togglePlatform = (p: PlatformType) => {
    setValidationErrors((prev) => ({ ...prev, platforms: '' }));
    if (platforms.includes(p)) {
      setPlatforms(platforms.filter((item) => item !== p));
    } else {
      setPlatforms([...platforms, p]);
    }
  };

  const toggleFormat = (f: ContentFormat) => {
    setValidationErrors((prev) => ({ ...prev, desiredFormats: '' }));
    if (desiredFormats.includes(f)) {
      setDesiredFormats(desiredFormats.filter((item) => item !== f));
    } else {
      setDesiredFormats([...desiredFormats, f]);
    }
  };

  // Manual pillar addition with trim, empty check, and duplicate rejection
  const handleAddPillar = () => {
    const trimmed = newPillarInput.trim();
    if (!trimmed) return;
    if (contentPillars.some((p) => p.trim().toLowerCase() === trimmed.toLowerCase())) {
      setNewPillarInput('');
      return;
    }
    setContentPillars((prev) => [...prev, trimmed]);
    setNewPillarInput('');
  };

  // Pillar removal (records removed pillar in rejectedPillars so AI won't re-suggest it)
  const handleRemovePillar = (index: number) => {
    const removedPillar = contentPillars[index];
    if (removedPillar) {
      setRejectedPillars((prev) => [...prev, removedPillar.trim()]);
    }
    setContentPillars((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Independent validation logic for AI Content Pillar suggestions
  const activeProductName = getActiveProductName();
  const isProductServiceFilled = Boolean(activeProductName.trim());
  const isObjectiveFilled = Boolean(objective.trim());
  const isAudienceSegmentFilled = Boolean(audienceSegment && String(audienceSegment).trim() !== '');
  const isTargetAudienceFilled = Boolean(targetAudience.trim());

  const hasSufficientContextForPillars =
    isProductServiceFilled &&
    isObjectiveFilled &&
    isAudienceSegmentFilled &&
    isTargetAudienceFilled;

  const missingPillarFields: string[] = [];
  if (!isProductServiceFilled) missingPillarFields.push('Product or Service');
  if (!isObjectiveFilled) missingPillarFields.push('Primary Campaign Objective');
  if (!isAudienceSegmentFilled) missingPillarFields.push('Audience Segment');
  if (!isTargetAudienceFilled) missingPillarFields.push('Target Audience Description');

  // AI Pillar Suggestion using Gemini backend API
  const handleSuggestPillars = async () => {
    if (!hasSufficientContextForPillars) return;
    setIsSuggestingPillars(true);
    setGenerationError(null);
    try {
      const res = await fetch('/api/gemini/suggest-pillars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          audienceSegment,
          objective,
          productOrService: activeProductName,
          targetAudience,
          language,
          platforms,
          existingPillars: contentPillars,
          rejectedPillars,
          additionalInstructions,
          brandKit,
          products,
          campaignReferences,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to suggest pillars');
      }

      const rawPillars = data.pillars || [];
      const newTitles: string[] = rawPillars
        .map((p: any) => (typeof p === 'string' ? p : p?.title))
        .filter(Boolean);

      const existingSet = new Set(contentPillars.map((p) => p.trim().toLowerCase()));
      const rejectedSet = new Set(rejectedPillars.map((p) => p.trim().toLowerCase()));

      const freshUnique = newTitles.filter(
        (t) => !existingSet.has(t.trim().toLowerCase()) && !rejectedSet.has(t.trim().toLowerCase())
      );

      if (freshUnique.length > 0) {
        setContentPillars((prev) => [...prev, ...freshUnique]);
      }
    } catch (err: any) {
      console.error('Suggest pillars error:', err);
      setGenerationError({
        message: err.message || 'Gemini is temporarily busy. Please try again.',
        is503: true,
      });
    } finally {
      setIsSuggestingPillars(false);
    }
  };

  // Submit Brief -> Check for mandatory validation & assumptions!
  const handleSubmitBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerationError(null);

    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Campaign Title is required.';
    }

    if (!type) {
      errors.type = 'Campaign Type is required.';
    }

    if (!audienceSegment) {
      errors.audienceSegment = 'Audience Segment (B2C, B2B, or Both) is required.';
    }

    const activeProductName = getActiveProductName();
    if (!activeProductName.trim()) {
      errors.product = 'Product or Service is required.';
    }

    if (!objective.trim()) {
      errors.objective = 'Primary Campaign Objective is required.';
    }

    if (!targetAudience.trim()) {
      errors.targetAudience = 'Target Audience Description is required.';
    }

    if (audienceSegment === 'B2C' && !audienceAge.trim()) {
      errors.audienceAge = 'Audience Age is required for B2C campaigns.';
    }

    if (!startDate) {
      errors.startDate = 'Start Date is required.';
    }

    if (!endDate) {
      errors.endDate = 'End Date is required.';
    }

    if (!language) {
      errors.language = 'Language selection is required.';
    }

    if (platforms.length === 0) {
      errors.platforms = 'At least one target marketing platform must be selected.';
    }

    if (desiredFormats.length === 0) {
      errors.desiredFormats = 'At least one content format must be selected.';
    }

    if (!cta.trim()) {
      errors.cta = 'Primary Call to Action (CTA) is required.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    // Check optional missing fields for proposed assumptions
    const missing: { fieldKey: string; label: string; proposedValue: string }[] = [];

    if (!location) {
      missing.push({ fieldKey: 'location', label: 'Campaign Location Scope', proposedValue: 'Greater Tunis Area & Nationwide Tunisia Shipping' });
    }
    if (!industry) {
      missing.push({
        fieldKey: 'industry',
        label: 'Target Industry / Domain',
        proposedValue: audienceSegment === 'B2B' ? 'Industrial Prototyping, Corporate Events & Architects' : 'Consumer Tech, Gaming, Lifestyle & Gifts',
      });
    }
    if (!buyerPersona) {
      missing.push({
        fieldKey: 'buyerPersona',
        label: 'Buyer Persona Focus',
        proposedValue: audienceSegment === 'B2B' ? 'Operations Manager, Architect or Event Organizer needing premium local custom manufacturing' : 'Tech-savvy student, gamer, or young professional seeking innovative gadgets',
      });
    }
    if (!brandTone) {
      missing.push({ fieldKey: 'brandTone', label: 'Brand Voice Tone', proposedValue: 'Innovative, Expert, High-Precision, Energetic & Accessible' });
    }
    if (!desiredKPIs) {
      missing.push({ fieldKey: 'desiredKPIs', label: 'Primary Target KPIs', proposedValue: 'Reach, Website Click-Through Rate (CTR), and Direct Messages (DMs)' });
    }

    const createdBrief: CampaignBrief = {
      id: activeBrief?.id || `camp_${Date.now()}`,
      name,
      objective,
      type,
      audienceSegment,
      productOrService: activeProductName,
      targetAudience,
      audienceAge,
      startDate,
      endDate,
      durationDays,
      platforms,
      language,
      desiredFormats,
      cta,
      location,
      industry,
      buyerPersona,
      brandTone,
      campaignTone,
      desiredKPIs,
      promotionDetails,
      seasonalContext,
      additionalInstructions,
      contentPillars: contentPillars.filter((p) => p.trim().length > 0),
      status: 'Draft',
      createdAt: activeBrief?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveBrief(createdBrief);

    if (missing.length > 0) {
      setMissingOptionalFields(missing);
      setIsAssumptionModalOpen(true);
    } else {
      await processGenerateDirections(createdBrief);
    }
  };

  const handleConfirmAssumptions = async (confirmedAssumptions: Record<string, string>) => {
    setIsAssumptionModalOpen(false);
    if (!activeBrief) return;

    const updatedBrief: CampaignBrief = {
      ...activeBrief,
      assumptionsConfirmed: true,
      usedAssumptions: confirmedAssumptions,
    };

    setActiveBrief(updatedBrief);
    await processGenerateDirections(updatedBrief);
  };

  const processGenerateDirections = async (briefToUse: CampaignBrief) => {
    setGenerationError(null);
    try {
      const directions = await onGenerateDirections(briefToUse);
      if (directions && directions.length > 0) {
        setGeneratedDirections(directions);
        setSelectedDirection(null); // Explicit single selection: initially NONE selected!
        setStep(2);
      }
    } catch (err: any) {
      console.error('Failed to generate directions:', err);
      setGenerationError({
        message: err.message || 'Gemini is temporarily unavailable due to high demand. Your brief data has been preserved. Please try again.',
        is503: err.is503,
      });
    }
  };

  const handleFinalBuildPlan = async () => {
    if (!activeBrief || !selectedDirection) return;
    setGenerationError(null);
    try {
      await onSelectDirectionAndBuildPlan(activeBrief, selectedDirection);
    } catch (err: any) {
      console.error('Failed to generate plan:', err);
      setGenerationError({
        message: err.message || 'Gemini is temporarily unavailable due to high demand. Your brief and selected direction have been preserved. Please try again.',
        is503: err.is503,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="card-tier-1 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#172DC3] to-[#6344BF] text-white flex items-center justify-center font-black text-sm shadow-sm">
            {step}
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#15192B]">
              {step === 1 ? '1. Define Campaign Brief' : '2. Select Strategic Direction'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {step === 1
                ? 'Fill specifications and confirm proposed assumptions'
                : 'Review 3 distinct AI proposal directions powered by Gemini'}
            </p>
          </div>
        </div>

        {step === 2 && (
          <button
            onClick={() => setStep(1)}
            className="btn-secondary text-xs px-3.5 py-1.5 font-semibold"
          >
            ← Back to Brief
          </button>
        )}
      </div>

      {/* Global 503 / Gemini Generation Error Banner */}
      {generationError && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {generationError.is503
                  ? 'Gemini is temporarily busy due to high demand'
                  : 'Generation Notice'}
              </span>
            </div>
            <button
              onClick={() => {
                if (step === 2 && activeBrief && selectedDirection) {
                  handleFinalBuildPlan();
                } else if (activeBrief) {
                  processGenerateDirections(activeBrief);
                }
              }}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Try Again</span>
            </button>
          </div>
          <p className="text-amber-800 font-medium">
            {generationError.message} Your campaign brief, content pillars, and selected direction remain fully preserved.
          </p>
        </div>
      )}

      {/* STEP 1: BRIEF FORM */}
      {step === 1 && (
        <form onSubmit={handleSubmitBrief} noValidate className="card-tier-1 p-6 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-bold text-[#15192B] text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#CB19C2]" />
              <span>Campaign Brief Specifications</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Required fields ensure campaign fidelity. Optional missing details trigger explicit confirmation.
            </p>
          </div>

          {/* Validation Alert Banner */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Please complete all required fields before proceeding:</span>
              </div>
              <ul className="list-disc list-inside pl-2 space-y-0.5 text-rose-700 font-medium">
                {Object.values(validationErrors).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Campaign Name */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Campaign Title / Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Rapid Prototyping Launch"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationErrors.name) setValidationErrors({ ...validationErrors, name: '' });
                }}
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 text-slate-900 transition ${
                  validationErrors.name ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-[#172DC3]'
                }`}
              />
              {validationErrors.name && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.name}</p>
              )}
            </div>

            {/* Campaign Type */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Campaign Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as CampaignType);
                  if (validationErrors.type) setValidationErrors({ ...validationErrors, type: '' });
                }}
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition ${
                  validationErrors.type ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-[#172DC3]'
                }`}
              >
                <option value="" disabled>
                  Select campaign type...
                </option>
                <option value="Product Launch">Product Launch</option>
                <option value="Promotional Offer">Promotional Offer</option>
                <option value="Seasonal Campaign">Seasonal Campaign</option>
                <option value="Brand Awareness">Brand Awareness</option>
                <option value="Educational Content">Educational Content</option>
                <option value="B2B Corporate Campaign">B2B Corporate Campaign</option>
                <option value="Customer Success / Testimonial">Customer Success / Testimonial</option>
                <option value="Behind the Scenes">Behind the Scenes</option>
                <option value="Event / Exhibition">Event / Exhibition</option>
              </select>
              {validationErrors.type && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.type}</p>
              )}
            </div>

            {/* Audience Segment (B2B, B2C, Both) Segmented Control */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Audience Segment <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                {(['B2C', 'B2B', 'Both'] as AudienceSegment[]).map((seg) => {
                  const isSel = audienceSegment === seg;
                  return (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => {
                        setAudienceSegment(seg);
                        if (validationErrors.audienceSegment) setValidationErrors({ ...validationErrors, audienceSegment: '' });
                        if (seg === 'B2B' && validationErrors.audienceAge) setValidationErrors({ ...validationErrors, audienceAge: '' });
                      }}
                      className={`py-2 rounded-lg text-xs font-bold transition-all duration-150 text-center ${
                        isSel
                          ? 'bg-[#160857] text-white shadow-xs'
                          : 'text-slate-600 hover:text-[#160857] hover:bg-slate-200/60'
                      }`}
                    >
                      {seg === 'B2C' ? 'B2C' : seg === 'B2B' ? 'B2B' : 'Both'}
                    </button>
                  );
                })}
              </div>
              {validationErrors.audienceSegment && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.audienceSegment}</p>
              )}
            </div>

            {/* Product/Service Selection */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Product or Service <span className="text-rose-500">*</span>
              </label>
              {products.length === 0 ? (
                <input
                  type="text"
                  placeholder="e.g. Custom 3D Printing & Batch Prototyping"
                  value={customProduct}
                  onChange={(e) => {
                    setCustomProduct(e.target.value);
                    if (validationErrors.product) setValidationErrors({ ...validationErrors, product: '' });
                  }}
                  className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 ${
                    validationErrors.product ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
              ) : (
                <>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      if (validationErrors.product) setValidationErrors({ ...validationErrors, product: '' });
                    }}
                    className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition ${
                      validationErrors.product ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                    }`}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category})
                      </option>
                    ))}
                    <option value="custom">Custom Service / Product...</option>
                  </select>

                  {selectedProductId === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom product or service name..."
                      value={customProduct}
                      onChange={(e) => {
                        setCustomProduct(e.target.value);
                        if (validationErrors.product) setValidationErrors({ ...validationErrors, product: '' });
                      }}
                      className={`w-full mt-2 px-3.5 py-2 bg-white border rounded-xl text-xs ${
                        validationErrors.product ? 'border-rose-400 bg-rose-50/30' : 'border-indigo-300'
                      }`}
                    />
                  )}
                </>
              )}
              {validationErrors.product && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.product}</p>
              )}
            </div>

            {/* Objective */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Primary Campaign Objective <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Generate client inquiries for rapid prototyping and raise awareness of local 3D fabrication capabilities."
                value={objective}
                onChange={(e) => {
                  setObjective(e.target.value);
                  if (validationErrors.objective) setValidationErrors({ ...validationErrors, objective: '' });
                }}
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition ${
                  validationErrors.objective ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-[#172DC3]'
                }`}
              />
              {validationErrors.objective && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.objective}</p>
              )}
            </div>

            {/* Target Audience & Age */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Target Audience Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Local businesses, architects, engineering students, product designers"
                value={targetAudience}
                onChange={(e) => {
                  setTargetAudience(e.target.value);
                  if (validationErrors.targetAudience) setValidationErrors({ ...validationErrors, targetAudience: '' });
                }}
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition ${
                  validationErrors.targetAudience ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-[#172DC3]'
                }`}
              />
              {validationErrors.targetAudience && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.targetAudience}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Audience Age Group{' '}
                {audienceSegment === 'B2C' ? (
                  <span className="text-rose-500">*</span>
                ) : audienceSegment === 'Both' ? (
                  <span className="text-slate-400 font-normal">(Optional)</span>
                ) : (
                  <span className="text-slate-400 font-normal">(Not required for B2B)</span>
                )}
              </label>
              <input
                type="text"
                value={audienceAge}
                onChange={(e) => {
                  setAudienceAge(e.target.value);
                  if (validationErrors.audienceAge) setValidationErrors({ ...validationErrors, audienceAge: '' });
                }}
                placeholder="e.g. 20-45"
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition ${
                  validationErrors.audienceAge ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-[#172DC3]'
                }`}
              />
              {validationErrors.audienceAge && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.audienceAge}</p>
              )}
            </div>

            {/* Dates & Duration */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Start Date & End Date ({durationDays} days) <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (validationErrors.startDate) setValidationErrors({ ...validationErrors, startDate: '' });
                  }}
                  className={`px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 ${
                    validationErrors.startDate ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (validationErrors.endDate) setValidationErrors({ ...validationErrors, endDate: '' });
                  }}
                  className={`px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 ${
                    validationErrors.endDate ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                  }`}
                />
              </div>
              {(validationErrors.startDate || validationErrors.endDate) && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">
                  {validationErrors.startDate || validationErrors.endDate}
                </p>
              )}
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Language & Cultural Style <span className="text-rose-500">*</span>
              </label>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value as LanguageOption);
                  if (validationErrors.language) setValidationErrors({ ...validationErrors, language: '' });
                }}
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 ${
                  validationErrors.language ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                }`}
              >
                <option value="Multilingual (English & Darija)">Multilingual (English & Darija)</option>
                <option value="Tunisian Darija (Arabic Script)">Tunisian Darija (Arabic Script)</option>
                <option value="English">English</option>
              </select>
              {validationErrors.language && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.language}</p>
              )}
            </div>

            {/* Platforms Multi-select */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#15192B] mb-1.5">
                Target Marketing Platforms <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Instagram', 'Facebook'] as PlatformType[]).map((p) => {
                  const isSel = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-indigo-50 text-[#172DC3] border-[#172DC3]/40 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 text-[#172DC3]" />}
                      <span>{p}</span>
                    </button>
                  );
                })}
              </div>
              {validationErrors.platforms && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.platforms}</p>
              )}
            </div>

            {/* Content Formats Multi-select */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#15192B] mb-1.5">
                Desired Content Formats <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Reel / Video', 'Carousel', 'Story', 'Feed Photo', 'Feed Post'] as ContentFormat[]).map((f) => {
                  const isSel = desiredFormats.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => toggleFormat(f)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isSel
                          ? 'bg-violet-50 text-[#6344BF] border-[#6344BF]/40 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 text-[#6344BF]" />}
                      <span>{f}</span>
                    </button>
                  );
                })}
              </div>
              {validationErrors.desiredFormats && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.desiredFormats}</p>
              )}
            </div>

            {/* CTA */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Primary Call to Action (CTA) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={cta}
                onChange={(e) => {
                  setCta(e.target.value);
                  if (validationErrors.cta) setValidationErrors({ ...validationErrors, cta: '' });
                }}
                placeholder="e.g. Send us a message for custom project quotes"
                className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition ${
                  validationErrors.cta ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-[#172DC3]'
                }`}
              />
              {validationErrors.cta && (
                <p className="text-[11px] font-medium text-rose-600 mt-1">{validationErrors.cta}</p>
              )}
            </div>
          </div>

          {/* Optional Directives & Content Pillars Section */}
          <div className="border-t border-slate-200 pt-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Optional Context & Directives (Leave blank to use proposed assumptions)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Scope
                </label>
                <input
                  type="text"
                  placeholder="e.g. Greater Tunis, Sousse, Sfax, Nationwide shipping"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Industry / Category Focus
                </label>
                <input
                  type="text"
                  placeholder="e.g. Architectural, B2B Prototyping, Gaming"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>

              {/* CONTENT PILLARS MANAGEMENT SECTION */}
              <div className="md:col-span-2 space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#15192B]">
                    Content Pillars <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestPillars}
                    disabled={!hasSufficientContextForPillars || isSuggestingPillars}
                    className="btn-secondary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      !hasSufficientContextForPillars
                        ? 'Add more campaign context first (Product/Service, Objective, Audience Segment, Target Audience).'
                        : ''
                    }
                  >
                    {isSuggestingPillars ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CB19C2]" />
                        <span>Generating Suggestions...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#CB19C2]" />
                        <span>
                          {contentPillars.length === 0 ? 'Suggest Content Pillars' : 'Suggest 3 More'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {!hasSufficientContextForPillars && (
                  <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200/80 px-3.5 py-2.5 rounded-xl font-medium flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Add more campaign context first. Please provide the product/service, objective, audience segment, and target audience so the assistant can suggest relevant content pillars.
                      {missingPillarFields.length > 0 && (
                        <span className="block text-amber-950 font-bold mt-1">
                          Missing required fields: {missingPillarFields.join(', ')}
                        </span>
                      )}
                    </span>
                  </p>
                )}

                <p className="text-[11px] text-slate-500">
                  Key marketing themes or content pillars for this campaign. Type manually or click suggest to generate complementary pillars.
                </p>

                {/* Input for Manual Pillar Addition */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a custom pillar and press Enter or click Add Pillar..."
                    value={newPillarInput}
                    onChange={(e) => setNewPillarInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPillar();
                      }
                    }}
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddPillar}
                    className="btn-secondary px-4 py-2 text-xs font-bold"
                  >
                    Add Pillar
                  </button>
                </div>

                {/* Render Editable State Array of Chips */}
                {contentPillars.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {contentPillars.map((pillar, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-[#172DC3] rounded-lg text-xs font-semibold"
                      >
                        <span>{pillar}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePillar(idx)}
                          className="text-[#6344BF] hover:text-[#160857] font-bold ml-1 text-sm leading-none transition"
                          title="Remove pillar"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Creative Directives
                </label>
                <input
                  type="text"
                  placeholder="e.g. Add any specific creative instructions, constraints, or messages to emphasize."
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isGenerating}
              className="btn-primary flex items-center gap-2 px-6 py-3 text-xs font-bold"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Proposal Directions with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Review Assumptions & Propose 3 Directions</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: 3 PROPOSAL DIRECTIONS COMPARISON */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-[#160857] text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#8478E2] uppercase tracking-widest">
                AI Strategy Proposal
              </span>
              <h2 className="text-lg font-black mt-0.5">3 Strategic Directions Generated</h2>
              <p className="text-xs text-slate-300 mt-1">
                Please select exactly one (1) campaign direction below to proceed to complete plan generation.
              </p>
            </div>
          </div>

          {/* 3 Direction Cards with Strict Single Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {generatedDirections.map((dir, idx) => {
              const isSelected = selectedDirection !== null && (selectedDirection.id === dir.id || selectedDirection.title === dir.title);

              return (
                <div
                  key={dir.id || dir.title + idx}
                  onClick={() => setSelectedDirection(dir)}
                  className={`card-tier-1 p-5 shadow-xs cursor-pointer transition-all duration-200 flex flex-col justify-between relative ${
                    isSelected
                      ? 'border-2 border-[#172DC3] ring-2 ring-[#172DC3]/20 shadow-md bg-indigo-50/20'
                      : 'border-slate-200 hover:border-[#6344BF]/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#172DC3] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                        Direction 0{idx + 1}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-[#172DC3] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-[#15192B] text-base">{dir.title}</h3>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Concept</span>
                      <p className="text-xs text-slate-700 font-medium mt-0.5">{dir.concept}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Core Message</span>
                      <p className="text-xs text-slate-800 bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/80 font-semibold mt-0.5">
                        "{dir.coreMessage}"
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Strategic Rationale</span>
                      <p className="text-xs text-slate-600 mt-0.5">{dir.strategicRationale}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Suggested Pillars</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dir.suggestedPillars.map((p, pIdx) => (
                          <span
                            key={pIdx}
                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDirection(dir);
                    }}
                    className={`mt-5 w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{isSelected ? 'Selected Direction' : 'Select Direction'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Build Full Plan CTA */}
          <div className="card-tier-1 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-[#15192B] text-sm">Ready to Build Complete Campaign Plan?</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {selectedDirection ? (
                  <span>Selected: <strong className="text-[#172DC3]">{selectedDirection.title}</strong></span>
                ) : (
                  <span className="text-amber-700 font-semibold">Please select 1 direction above to enable plan generation.</span>
                )}
              </p>
            </div>

            <button
              onClick={handleFinalBuildPlan}
              disabled={!selectedDirection || isGenerating}
              className="btn-primary flex items-center gap-2 px-6 py-3 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Full Plan & Calendar...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Detailed Campaign Plan & Calendar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Assumption Confirmation Modal */}
      <AssumptionModal
        isOpen={isAssumptionModalOpen}
        onClose={() => setIsAssumptionModalOpen(false)}
        missingFields={missingOptionalFields}
        onConfirm={handleConfirmAssumptions}
      />
    </div>
  );
};

