import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CampaignBrief,
  StrategicDirection,
  CampaignDirection,
  CampaignType,
  AudienceSegment,
  PlatformType,
  ContentFormat,
  LanguageOption,
  ProductService,
  BrandKit,
  CampaignReference,
  CampaignPromotionItem,
  CampaignUploadedAsset,
  AvailableResources,
  AssumptionItem,
  CustomCampaignType,
  CustomTargetAudience,
  LocationGroup,
  FeedbackMemoryItem,
} from '../types';
import { repository } from '../services/repository';
import {
  DEFAULT_CAMPAIGN_TYPES,
  DEFAULT_LOCATION_GROUPS,
  TUNISIA_GOVERNORATES,
  COMMON_CTAS,
  CAMPAIGN_TONES,
  PRIMARY_KPIS,
  AVAILABLE_RESOURCES_CONFIG,
  PLATFORM_OPTIONS,
  FORMAT_OPTIONS,
  LANGUAGE_OPTIONS,
  AGE_MIN_OPTIONS,
  AGE_MAX_OPTIONS,
} from '../data/campaignConstants';
import { PromotionSelector } from '../components/campaign/PromotionSelector';
import { LocationSelector } from '../components/campaign/LocationSelector';
import { ColorPaletteSection } from '../components/campaign/ColorPaletteSection';
import { StrategicDirectionCard } from '../components/campaign/StrategicDirectionCard';
import { AIContextStickyPanel } from '../components/campaign/AIContextStickyPanel';
import { AssumptionsSection } from '../components/campaign/AssumptionsSection';
import {
  ManageCampaignTypesModal,
  ManageTargetAudiencesModal,
} from '../components/campaign/CustomTypesAndAudiencesModals';
import {
  FlagTunisia,
  FlagUK,
  FlagFrance,
  IconInstagram,
  IconFacebook,
  IconTikTok,
  IconMetaCombined,
} from '../components/campaign/CampaignIcons';
import {
  Sparkles,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Upload,
  Calendar,
  Layers,
  HelpCircle,
  FileText,
  Compass,
  BookmarkCheck,
  Settings2,
  Eye,
  Info,
  ChevronDown,
  ChevronUp,
  Save,
  CheckCircle2,
  Search,
  Sliders,
  ExternalLink,
  Target,
  Clock,
  Tv,
  Film,
  Image as ImageIcon,
  MessageSquare,
  Share2,
  Zap,
} from 'lucide-react';

interface NewCampaignProps {
  products: ProductService[];
  brandKit?: BrandKit | null;
  campaignReferences?: CampaignReference[];
  onGenerateDirections: (brief: CampaignBrief) => Promise<any[]>;
  onSelectDirectionAndBuildPlan: (
    brief: CampaignBrief,
    selectedDirection: any
  ) => Promise<void>;
  isGenerating: boolean;
}

export const NewCampaign: React.FC<NewCampaignProps> = ({
  products,
  brandKit,
  campaignReferences = [],
  onGenerateDirections,
  onSelectDirectionAndBuildPlan,
  isGenerating,
}) => {
  // Navigation Stage: 1 = Brief Builder, 2 = Assumptions Review, 3 = Strategic Directions
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);

  // Active Draft ID (to preserve across saves and prevent duplicate records)
  const [draftId, setDraftId] = useState<string>(() => `camp_${Date.now()}`);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const hasSavedOnce = useRef(false);

  // Accordion open/close state
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: false,
    6: false,
  });

  const toggleSection = (sectionIndex: number) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex],
    }));
  };

  // Custom data states (loaded from IndexedDB)
  const [customCampaignTypes, setCustomCampaignTypes] = useState<CustomCampaignType[]>([]);
  const [customTargetAudiences, setCustomTargetAudiences] = useState<CustomTargetAudience[]>([]);
  const [customLocationGroups, setCustomLocationGroups] = useState<LocationGroup[]>([]);
  const [existingCampaigns, setExistingCampaigns] = useState<CampaignBrief[]>([]);
  const [feedbackMemory, setFeedbackMemory] = useState<FeedbackMemoryItem[]>([]);

  // Modals
  const [isTypesModalOpen, setIsTypesModalOpen] = useState(false);
  const [isAudiencesModalOpen, setIsAudiencesModalOpen] = useState(false);

  // --- SECTION 1: Campaign Basics ---
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<string>(''); // Initially empty / unselected
  const [audienceSegment, setAudienceSegment] = useState<AudienceSegment | ''>(''); // Initially unselected
  const [promotingType, setPromotingType] = useState<'Product' | 'Service' | 'Both'>('Product');
  const [promotionItems, setPromotionItems] = useState<CampaignPromotionItem[]>([]);
  const [objective, setObjective] = useState('');
  const [isImprovingObjective, setIsImprovingObjective] = useState(false);
  const [objectiveImprovementModal, setObjectiveImprovementModal] = useState<{
    original: string;
    suggestion: string;
  } | null>(null);

  // --- SECTION 2: Audience & Market ---
  const [audienceSearchTerm, setAudienceSearchTerm] = useState('');
  const [targetAudiences, setTargetAudiences] = useState<string[]>([]);
  const [audienceNotes, setAudienceNotes] = useState('');
  const [minAge, setMinAge] = useState<string>(''); // Dropdown, initially empty
  const [maxAge, setMaxAge] = useState<string>(''); // Dropdown, initially empty
  const [selectedGovernorates, setSelectedGovernorates] = useState<string[]>([]); // Initially empty
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]); // Initially empty (Tunisian Darija, English, French)

  // --- SECTION 3: Channels & Timing ---
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState<number>(14);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 13); // 14 inclusive days
    return d.toISOString().slice(0, 10);
  });

  const [targetPlatforms, setTargetPlatforms] = useState<string[]>([]); // Initially empty
  const [desiredFormats, setDesiredFormats] = useState<string[]>([]); // Initially empty
  const [isRecommendingFormats, setIsRecommendingFormats] = useState(false);
  const [formatRecommendationModal, setFormatRecommendationModal] = useState<{
    formats: string[];
    rationale: string;
  } | null>(null);

  const [cta, setCta] = useState(''); // Searchable combobox + custom, initially empty
  const [customCtaInput, setCustomCtaInput] = useState('');
  const [isSuggestingCta, setIsSuggestingCta] = useState(false);
  const [suggestedCtaModal, setSuggestedCtaModal] = useState<string[] | null>(null);

  // --- SECTION 4: Campaign Strategy ---
  const [campaignToneList, setCampaignToneList] = useState<string[]>([]); // Initially empty
  const [customToneInput, setCustomToneInput] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [isImprovingKeyMessage, setIsImprovingKeyMessage] = useState(false);
  const [keyMessageImprovementModal, setKeyMessageImprovementModal] = useState<{
    original: string;
    suggestion: string;
  } | null>(null);
  const [primaryKPIs, setPrimaryKPIs] = useState<string[]>([]); // Initially empty
  const [kpiSearchTerm, setKpiSearchTerm] = useState('');
  const [funnelIntent, setFunnelIntent] = useState<'Awareness' | 'Consideration' | 'Conversion' | 'Retention' | ''>('');
  const [promotionOffer, setPromotionOffer] = useState('');
  const [seasonalContext, setSeasonalContext] = useState('');

  // --- SECTION 5: Creative Direction & Visual Assets ---
  const [contentPillars, setContentPillars] = useState<string[]>([]); // Optional, initially empty!
  const [newPillarInput, setNewPillarInput] = useState('');
  const [isSuggestingPillars, setIsSuggestingPillars] = useState(false);
  const [suggestedPillarsModal, setSuggestedPillarsModal] = useState<string[] | null>(null);

  const [campaignPalette, setCampaignPalette] = useState<string[]>([]); // Initially empty
  const [isSuggestingPalette, setIsSuggestingPalette] = useState(false);

  const [uploadedAssets, setUploadedAssets] = useState<CampaignUploadedAsset[]>([]);
  const [additionalDirectives, setAdditionalDirectives] = useState('');

  // --- SECTION 6: References & Available Content ---
  const [availableResources, setAvailableResources] = useState<AvailableResources>({
    hasProductPhotos: false,
    hasVideoFootage: false,
    hasExistingGraphics: false,
    hasProductForShooting: false,
    hasTeamOnCamera: false,
    hasTestimonialMaterial: false,
    notes: '',
  });
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([]);
  const [customReferenceNotes, setCustomReferenceNotes] = useState('');

  // --- Stage 2 & 3 States ---
  const [assumptions, setAssumptions] = useState<AssumptionItem[]>([]);
  const [isLoadingAssumptions, setIsLoadingAssumptions] = useState(false);
  const [directions, setDirections] = useState<StrategicDirection[]>([]);
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | null>(null);
  const [isLoadingDirections, setIsLoadingDirections] = useState(false);
  const [replacingDirectionId, setReplacingDirectionId] = useState<string | null>(null);
  const [isCombiningDirections, setIsCombiningDirections] = useState(false);

  // Validation
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load custom data from IndexedDB
  useEffect(() => {
    async function loadCustomData() {
      try {
        const [cTypes, cAudiences, cLocGroups, allCampaigns, fbMem] = await Promise.all([
          repository.getCustomCampaignTypes(),
          repository.getCustomTargetAudiences(),
          repository.getCustomLocationGroups(),
          repository.getCampaignBriefs(),
          repository.getFeedbackMemory(),
        ]);
        setCustomCampaignTypes(cTypes);
        setCustomTargetAudiences(cAudiences);
        setCustomLocationGroups(cLocGroups);
        setExistingCampaigns(allCampaigns);
        setFeedbackMemory(fbMem);
      } catch (err) {
        console.error('Failed to load custom data:', err);
      }
    }
    loadCustomData();
  }, []);

  // Synchronized inclusive date calculations
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    // If end is before new start, bump end to start + duration - 1
    const sDate = new Date(newStart);
    if (isNaN(sDate.getTime())) return;
    const eDate = new Date(endDate);
    if (isNaN(eDate.getTime()) || eDate < sDate) {
      const nextEnd = new Date(sDate);
      nextEnd.setDate(nextEnd.getDate() + Math.max(0, durationDays - 1));
      setEndDate(nextEnd.toISOString().slice(0, 10));
    } else {
      // Recalculate duration
      const diffTime = eDate.getTime() - sDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
      setDurationDays(Math.max(1, diffDays));
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    const sDate = new Date(startDate);
    const eDate = new Date(newEnd);
    if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return;
    if (eDate < sDate) {
      // Prevent End date before start date
      setEndDate(startDate);
      setDurationDays(1);
      return;
    }
    const diffTime = eDate.getTime() - sDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    setDurationDays(Math.max(1, diffDays));
  };

  const handleDurationChange = (newDuration: number) => {
    const safeDuration = Math.max(1, newDuration || 1);
    setDurationDays(safeDuration);
    const sDate = new Date(startDate);
    if (isNaN(sDate.getTime())) return;
    const nextEnd = new Date(sDate);
    nextEnd.setDate(nextEnd.getDate() + safeDuration - 1);
    setEndDate(nextEnd.toISOString().slice(0, 10));
  };

  // Grammatically and mathematically correct duration label
  const durationLabel = useMemo(() => {
    if (durationDays === 1) return '1 day';
    if (durationDays === 7) return '7 days (1 week)';
    if (durationDays === 14) return '14 days (2 weeks)';
    if (durationDays % 7 === 0) {
      return `${durationDays} days (${durationDays / 7} weeks)`;
    }
    return `${durationDays} days`;
  }, [durationDays]);

  // Platform selection rules (Meta conflicts with standalone Instagram/Facebook)
  const togglePlatform = (p: string) => {
    if (p === 'Meta') {
      if (targetPlatforms.includes('Meta')) {
        setTargetPlatforms(targetPlatforms.filter((item) => item !== 'Meta'));
      } else {
        // Unselect Instagram and Facebook when Meta is selected
        const remaining = targetPlatforms.filter(
          (item) => item !== 'Instagram' && item !== 'Facebook'
        );
        setTargetPlatforms([...remaining, 'Meta']);
      }
    } else if (p === 'Instagram' || p === 'Facebook') {
      if (targetPlatforms.includes(p)) {
        setTargetPlatforms(targetPlatforms.filter((item) => item !== p));
      } else {
        // Remove Meta if selecting standalone Instagram or Facebook
        const remaining = targetPlatforms.filter((item) => item !== 'Meta');
        setTargetPlatforms([...remaining, p]);
      }
    } else {
      // TikTok or others
      if (targetPlatforms.includes(p)) {
        setTargetPlatforms(targetPlatforms.filter((item) => item !== p));
      } else {
        setTargetPlatforms([...targetPlatforms, p]);
      }
    }
  };

  // Content format toggle
  const toggleFormat = (f: string) => {
    if (desiredFormats.includes(f)) {
      setDesiredFormats(desiredFormats.filter((item) => item !== f));
    } else {
      setDesiredFormats([...desiredFormats, f]);
    }
  };

  // Language toggle
  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  // Tone toggle
  const toggleTone = (tone: string) => {
    if (campaignToneList.includes(tone)) {
      setCampaignToneList(campaignToneList.filter((t) => t !== tone));
    } else {
      setCampaignToneList([...campaignToneList, tone]);
    }
  };

  const handleAddCustomTone = () => {
    const trimmed = customToneInput.trim();
    if (trimmed && !campaignToneList.includes(trimmed)) {
      setCampaignToneList([...campaignToneList, trimmed]);
      setCustomToneInput('');
    }
  };

  // KPI toggle
  const toggleKPI = (k: string) => {
    if (primaryKPIs.includes(k)) {
      setPrimaryKPIs(primaryKPIs.filter((item) => item !== k));
    } else {
      setPrimaryKPIs([...primaryKPIs, k]);
    }
  };

  // Build current campaign brief object
  const buildCurrentBrief = (): CampaignBrief => {
    return {
      id: draftId,
      name: campaignName.trim() || 'Untitled Campaign',
      objective: objective.trim(),
      type: (campaignType || 'Product Launch') as CampaignType,
      audienceSegment: (audienceSegment || 'Both') as AudienceSegment,
      productOrService: promotionItems.map((p) => p.name).join(', ') || '3D Printing',
      targetAudience: targetAudiences.join(', ') || audienceNotes || 'Tunisian Audience',
      targetAudiences,
      audienceAge:
        audienceSegment !== 'B2B' && minAge
          ? `${minAge}-${maxAge || '65+'}`
          : 'All Ages',
      audienceNotes,
      minAge: audienceSegment !== 'B2B' && minAge ? minAge : undefined,
      maxAge: audienceSegment !== 'B2B' && maxAge ? maxAge : undefined,
      locations: selectedGovernorates,
      locationGroups: [],
      languages: selectedLanguages as any,
      language: selectedLanguages.join(' & ') || 'Tunisian Darija',
      startDate,
      endDate,
      durationDays,
      platforms: targetPlatforms as PlatformType[],
      targetPlatforms: targetPlatforms as any,
      desiredFormats: desiredFormats as ContentFormat[],
      cta: cta.trim() || 'Learn More',

      // Strategy
      campaignToneList,
      campaignTone: campaignToneList.join(', ') || 'Professional & Technical',
      keyMessage: keyMessage.trim(),
      primaryKPIs,
      primaryKPI: primaryKPIs[0] || 'Reach',
      funnelIntent: funnelIntent || undefined,
      promotionOffer: promotionOffer.trim() || undefined,
      seasonalContext: seasonalContext.trim() || undefined,

      // Visuals & Pillars
      contentPillars,
      campaignPalette,
      uploadedAssets,
      additionalInstructions: additionalDirectives.trim() || undefined,

      // References & Resources
      selectedReferenceIds,
      customReferenceNotes: customReferenceNotes.trim() || undefined,
      availableResources,

      // Status
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      draftSavedAt: lastSavedTime || new Date().toISOString(),
    };
  };

  // Save Draft handler
  const handleSaveDraft = async () => {
    setSaveStatus('saving');
    try {
      const briefToSave = buildCurrentBrief();
      await repository.saveCampaignBrief(briefToSave);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);
      setSaveStatus('saved');
      hasSavedOnce.current = true;
    } catch (err) {
      console.error('Failed to save draft:', err);
      setSaveStatus('error');
    }
  };

  // Debounced autosave after first save
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!hasSavedOnce.current) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const briefToSave = buildCurrentBrief();
        await repository.saveCampaignBrief(briefToSave);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(timeStr);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    campaignName,
    campaignType,
    audienceSegment,
    promotionItems,
    objective,
    targetAudiences,
    audienceNotes,
    minAge,
    maxAge,
    selectedGovernorates,
    selectedLanguages,
    startDate,
    endDate,
    durationDays,
    targetPlatforms,
    desiredFormats,
    cta,
    campaignToneList,
    keyMessage,
    primaryKPIs,
    funnelIntent,
    promotionOffer,
    seasonalContext,
    contentPillars,
    campaignPalette,
    uploadedAssets,
    availableResources,
    selectedReferenceIds,
  ]);

  // Form Validation for proceeding to Stage 2
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!campaignName.trim()) {
      errors.campaignName = 'Campaign name is required.';
    }
    if (!campaignType) {
      errors.campaignType = 'Please select a campaign type.';
    }
    if (!audienceSegment) {
      errors.audienceSegment = 'Please select an audience segment (B2B, B2C, or Both).';
    }
    if (promotionItems.length === 0) {
      errors.promotionItems = 'Please select at least one product or service to promote.';
    }
    if (!objective.trim()) {
      errors.objective = 'Campaign objective is required.';
    }

    // Age validation
    if (audienceSegment === 'B2C' && !minAge) {
      errors.minAge = 'Minimum age is required for B2C campaigns.';
    }

    // Dates validation
    if (new Date(endDate) < new Date(startDate)) {
      errors.endDate = 'End Date cannot be before Start Date.';
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setGeneralError('Please fill in the required fields highlighted below before proceeding.');
      // Automatically open Section 1 if basics are missing
      if (errors.campaignName || errors.campaignType || errors.audienceSegment || errors.promotionItems || errors.objective) {
        setOpenSections((prev) => ({ ...prev, 1: true }));
      }
      return false;
    }

    setGeneralError(null);
    return true;
  };

  // AI Improve Objective
  const handleImproveObjective = async () => {
    if (!objective.trim()) {
      setValidationErrors((prev) => ({
        ...prev,
        objective: 'Type a few words or rough intent first for AI to polish.',
      }));
      return;
    }

    setIsImprovingObjective(true);
    try {
      const res = await fetch('/api/gemini/improve-objective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective: objective.trim(),
          campaignType,
          audienceSegment,
          productOrService: promotionItems.map((p) => p.name).join(', '),
          targetAudience: targetAudiences.join(', ') || audienceNotes,
          campaignTone: campaignToneList,
          keyMessage,
        }),
      });

      if (!res.ok) throw new Error('Failed to improve objective');
      const data = await res.json();
      if (data.suggestedObjective) {
        setObjectiveImprovementModal({
          original: objective,
          suggestion: data.suggestedObjective,
        });
      }
    } catch (err) {
      console.error(err);
      const refined = `Drive quantifiable inquiries for 3 Dimensions ${promotionItems.map((p) => p.name).join(' & ') || 'custom manufacturing'} by demonstrating rapid turnaround and precision quality to ${audienceSegment === 'B2B' ? 'Tunisian industrial engineers' : 'local creators'}.`;
      setObjectiveImprovementModal({
        original: objective,
        suggestion: refined,
      });
    } finally {
      setIsImprovingObjective(false);
    }
  };

  // AI Recommend Formats
  const handleRecommendFormats = async () => {
    if (targetPlatforms.length === 0) {
      setValidationErrors((prev) => ({
        ...prev,
        platforms: 'Select at least one platform first to get format recommendations.',
      }));
      return;
    }

    setIsRecommendingFormats(true);
    try {
      const res = await fetch('/api/gemini/recommend-formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          audience: targetAudiences.join(', ') || audienceNotes,
          productOrService: promotionItems.map((p) => p.name).join(', '),
          campaignType,
          platforms: targetPlatforms,
          languages: selectedLanguages,
          availableResources,
          references: selectedReferenceIds,
        }),
      });

      if (!res.ok) throw new Error('Failed to recommend formats');
      const data = await res.json();
      setFormatRecommendationModal({
        formats: data.recommendedFormats || ['Reel / Video', 'Carousel'],
        rationale: data.rationale || 'Optimal for visual engagement on selected platforms.',
      });
    } catch (err) {
      const recommended = targetPlatforms.includes('TikTok')
        ? ['Reel / Video']
        : ['Reel / Video', 'Carousel', 'Feed Photo'];
      setFormatRecommendationModal({
        formats: recommended,
        rationale: 'High-performing visual formats recommended for 3D printing demonstrations in Tunisia.',
      });
    } finally {
      setIsRecommendingFormats(false);
    }
  };

  // AI Suggest CTA
  const handleSuggestCta = async () => {
    setIsSuggestingCta(true);
    try {
      const res = await fetch('/api/gemini/suggest-cta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          audience: targetAudiences.join(', ') || audienceNotes,
          productOrService: promotionItems.map((p) => p.name).join(', '),
          platforms: targetPlatforms,
          campaignType,
          funnelIntent,
          keyMessage,
        }),
      });

      if (!res.ok) throw new Error('Failed to suggest CTA');
      const data = await res.json();
      const suggestions = (data.suggestedCTAs || []).map((c: any) =>
        typeof c === 'string' ? c : c.cta
      );
      setSuggestedCtaModal(suggestions.length > 0 ? suggestions : COMMON_CTAS.slice(0, 3));
    } catch (err) {
      setSuggestedCtaModal([
        'Request Free 3D Prototype Consultation',
        'Send Us a Direct Message for Quotes',
        'Explore 3D Printed Solutions',
      ]);
    } finally {
      setIsSuggestingCta(false);
    }
  };

  // AI Polish Key Message
  const handleImproveKeyMessage = async () => {
    if (!keyMessage.trim()) return;
    setIsImprovingKeyMessage(true);
    try {
      const res = await fetch('/api/gemini/improve-key-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyMessage: keyMessage.trim(),
          campaignType,
          audienceSegment,
          productOrService: promotionItems.map((p) => p.name).join(', '),
          targetAudience: targetAudiences.join(', ') || audienceNotes,
        }),
      });
      const data = await res.json();
      if (data.suggestedMessage) {
        setKeyMessageImprovementModal({
          original: keyMessage,
          suggestion: data.suggestedMessage,
        });
      }
    } catch (err) {
      setKeyMessageImprovementModal({
        original: keyMessage,
        suggestion: `${keyMessage} — crafted with micron-level precision and rapid local delivery right here in Tunisia.`,
      });
    } finally {
      setIsImprovingKeyMessage(false);
    }
  };

  // AI Suggest Content Pillars
  const handleSuggestPillars = async () => {
    setIsSuggestingPillars(true);
    try {
      const res = await fetch('/api/gemini/suggest-pillars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: campaignType,
          audienceSegment,
          objective,
          productOrService: promotionItems.map((p) => p.name).join(', '),
          targetAudience: targetAudiences.join(', ') || audienceNotes,
          language: selectedLanguages.join(' & '),
          platforms: targetPlatforms,
          existingPillars: contentPillars,
          brandKit,
          products,
          campaignReferences,
        }),
      });
      const data = await res.json();
      const pillarTitles = (data.pillars || []).map((p: any) =>
        typeof p === 'string' ? p : p.title
      );
      setSuggestedPillarsModal(
        pillarTitles.length > 0
          ? pillarTitles
          : [
              'Precision Engineering & Tolerances',
              'Local Tunisian Turnaround Speed',
              'Versatile Material Testing',
            ]
      );
    } catch (err) {
      setSuggestedPillarsModal([
        'Precision Engineering & Tolerances',
        'Local Tunisian Turnaround Speed',
        'Versatile Material Testing',
      ]);
    } finally {
      setIsSuggestingPillars(false);
    }
  };

  // AI Suggest Palette
  const handleSuggestPalette = async (): Promise<Array<{ name: string; hex: string; rationale: string }>> => {
    setIsSuggestingPalette(true);
    try {
      const res = await fetch('/api/gemini/suggest-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandColors: brandKit?.primaryColors || [],
          campaignType,
          objective,
          audience: targetAudiences.join(', ') || audienceNotes,
          productOrService: promotionItems.map((p) => p.name).join(', '),
          tone: campaignToneList,
          platforms: targetPlatforms,
        }),
      });
      const data = await res.json();
      return (
        data.palette || [
          { name: 'Industrial Cobalt', hex: '#1E40AF', rationale: 'Authoritative B2B engineering presence' },
          { name: 'Precision Cyan', hex: '#06B6D4', rationale: 'Modern laser & 3D filament accent' },
          { name: 'Titanium Slate', hex: '#475569', rationale: 'Clean structural neutral' },
        ]
      );
    } catch (err) {
      return [
        { name: 'Industrial Cobalt', hex: '#1E40AF', rationale: 'Authoritative B2B engineering presence' },
        { name: 'Precision Cyan', hex: '#06B6D4', rationale: 'Modern laser & 3D filament accent' },
        { name: 'Titanium Slate', hex: '#475569', rationale: 'Clean structural neutral' },
      ];
    } finally {
      setIsSuggestingPalette(false);
    }
  };

  // File Upload handler for visual assets
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = (event.target?.result as string) || '';
        const newAsset: CampaignUploadedAsset = {
          id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          fileName: file.name,
          dataUrl: base64Url,
          url: base64Url,
          type: 'Product Image',
          fileType: file.type.startsWith('image/')
            ? 'image'
            : file.type.startsWith('video/')
            ? 'video'
            : 'document',
          size: file.size,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        };
        setUploadedAssets((prev) => [...prev, newAsset]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Custom Campaign Type & Audience handlers
  const handleAddCustomType = async (name: string) => {
    const item = await repository.saveCustomCampaignType(name);
    setCustomCampaignTypes((prev) => [...prev.filter((t) => t.id !== item.id), item]);
    setCampaignType(item.name);
    return item;
  };

  const handleUpdateCustomType = async (id: string, newName: string) => {
    const res = await repository.updateCustomCampaignType(id, newName);
    if (res.success && res.item) {
      setCustomCampaignTypes((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: newName } : t))
      );
      if (campaignType === id || campaignType === res.item.name) {
        setCampaignType(newName);
      }
    }
    return res;
  };

  const handleDeleteCustomType = async (id: string) => {
    const res = await repository.deleteCustomCampaignType(id);
    if (res.success) {
      setCustomCampaignTypes((prev) => prev.filter((t) => t.id !== id));
      if (campaignType === id) {
        setCampaignType('');
      }
    }
    return res;
  };

  const handleAddCustomAudience = async (name: string, description?: string) => {
    const item = await repository.saveCustomTargetAudience(name, description);
    setCustomTargetAudiences((prev) => [...prev.filter((a) => a.id !== item.id), item]);
    setTargetAudiences((prev) => [...prev, item.name]);
    return item;
  };

  const handleUpdateCustomAudience = async (id: string, name: string, description?: string) => {
    const res = await repository.updateCustomTargetAudience(id, name, description);
    if (res.success && res.item) {
      setCustomTargetAudiences((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name, description } : a))
      );
    }
    return res;
  };

  const handleDeleteCustomAudience = async (id: string) => {
    const res = await repository.deleteCustomTargetAudience(id);
    if (res.success) {
      setCustomTargetAudiences((prev) => prev.filter((a) => a.id !== id));
    }
    return res;
  };

  // Reusable audience list strictly driven by saved custom audiences in IndexedDB
  const allAudienceProfiles = useMemo(() => {
    return customTargetAudiences.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
    }));
  }, [customTargetAudiences]);

  const filteredAudienceProfiles = allAudienceProfiles.filter((a) =>
    a.name.toLowerCase().includes(audienceSearchTerm.toLowerCase())
  );

  // Recently used CTAs from actual historical campaigns (no fabricated history)
  const recentlyUsedCtas = useMemo(() => {
    const history = existingCampaigns
      .map((c) => c.cta?.trim())
      .filter((val): val is string => !!val && !COMMON_CTAS.includes(val));
    return Array.from(new Set(history)).slice(0, 5);
  }, [existingCampaigns]);

  // Stage 1 -> Stage 2 Navigation
  const handleProceedToAssumptions = async () => {
    if (!validateForm()) return;

    setIsLoadingAssumptions(true);
    const fullBrief = buildCurrentBrief();

    try {
      const res = await fetch('/api/gemini/assumptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: fullBrief,
          brandKit,
          products,
          feedbackMemory,
        }),
      });

      if (!res.ok) throw new Error('Failed to derive assumptions');
      const data = await res.json();
      setAssumptions(data.assumptions || []);
      setCurrentStage(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      // Deterministic rule-based assumptions
      const derived: AssumptionItem[] = [
        {
          id: 'asm_lang',
          category: 'Language & Nuance',
          proposedValue: selectedLanguages.length > 0 ? selectedLanguages.join(' & ') : 'Tunisian Darija',
          rationale: 'Derived from target market selection.',
          sourceTags: ['Campaign Brief'],
          status: 'Accepted',
        },
        {
          id: 'asm_turnaround',
          category: 'Delivery Grounding',
          proposedValue: 'Fast local delivery across Tunisia (48-72h standard)',
          rationale: 'Standard workshop capability for rapid prototyping.',
          sourceTags: ['Brand Kit'],
          status: 'Accepted',
        },
      ];
      setAssumptions(derived);
      setCurrentStage(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoadingAssumptions(false);
    }
  };

  // Stage 2 -> Stage 3 Navigation (Generate Strategic Directions)
  const handleGenerateDirections = async () => {
    setIsLoadingDirections(true);
    const fullBrief = buildCurrentBrief();
    fullBrief.assumptions = assumptions;

    try {
      const generated = await onGenerateDirections(fullBrief);
      setDirections(generated);
      setCurrentStage(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed generating directions:', err);
      setGeneralError('Failed to generate strategic directions. Please verify server connection.');
    } finally {
      setIsLoadingDirections(false);
    }
  };

  // Stage 3: Handoff into Campaign Plan
  const handleSelectDirection = async (selected: StrategicDirection) => {
    const fullBrief = buildCurrentBrief();
    fullBrief.assumptions = assumptions;
    fullBrief.selectedDirection = selected;

    const convertedDirection: CampaignDirection = {
      id: selected.id,
      campaignId: fullBrief.id,
      title: selected.title,
      concept: selected.concept,
      coreMessage: selected.coreMessage,
      strategicRationale: selected.strategicRationale,
      suggestedPillars: selected.campaignPillars || contentPillars,
      highLevelDirection: selected.strategicAngle,
    };

    await onSelectDirectionAndBuildPlan(fullBrief, convertedDirection);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20" id="new-campaign-page">
      {/* ========================================================================= */}
      {/* STICKY TOP PAGE HEADER (Section W)                                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentStage > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStage((prev) => (prev - 1) as 1 | 2)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Back to previous step"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-[#15192B] leading-none">
                  New Campaign Creation
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-[#172DC3] border border-indigo-200/80">
                  {currentStage === 1
                    ? '1. Brief Builder'
                    : currentStage === 2
                    ? '2. Assumptions Review'
                    : '3. Strategic Directions'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                3 Dimensions Marketing Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Autosave / Save Draft status */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="hidden md:inline">Saving draft...</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden md:inline">Saved {lastSavedTime}</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Save failed — retry</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saveStatus === 'saving'}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>Save Draft</span>
            </button>

            {currentStage === 1 && (
              <button
                type="button"
                onClick={handleProceedToAssumptions}
                disabled={isLoadingAssumptions}
                className="btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold disabled:opacity-60"
              >
                {isLoadingAssumptions ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>Review Assumptions</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Global Error Banner */}
        {generalError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Action Required:</span> {generalError}
            </div>
            <button
              type="button"
              onClick={() => setGeneralError(null)}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STAGE 1: CAMPAIGN BRIEF BUILDER (Accordions)                          */}
        {/* ===================================================================== */}
        {currentStage === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Accordions (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-4">

              {/* ----------------------------------------------------------------- */}
              {/* ACCORDION 1: CAMPAIGN BASICS (Section B, C, D)                    */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(1)}
                  className="w-full px-6 py-4.5 bg-white hover:bg-slate-50/80 flex items-center justify-between transition cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-50 text-[#172DC3] border border-indigo-100/80 text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <div className="text-left">
                      <h2 className="text-sm font-black text-[#15192B]">Campaign Basics</h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Identity, campaign classification, promoted items, and core objective
                      </p>
                    </div>
                  </div>
                  {openSections[1] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {openSections[1] && (
                  <div className="p-6 space-y-5">
                    {/* 1.1 Campaign Name */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Campaign Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={campaignName}
                        onChange={(e) => {
                          setCampaignName(e.target.value);
                          if (validationErrors.campaignName) {
                            setValidationErrors((prev) => ({ ...prev, campaignName: '' }));
                          }
                        }}
                        placeholder="e.g. Q3 Industrial Rapid Prototyping Launch"
                        className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition ${
                          validationErrors.campaignName
                            ? 'border-rose-400 bg-rose-50/30'
                            : 'border-slate-200/90'
                        }`}
                      />
                      {validationErrors.campaignName && (
                        <p className="mt-1.5 text-xs text-rose-600 font-bold">
                          {validationErrors.campaignName}
                        </p>
                      )}
                    </div>

                    {/* 1.2 Campaign Type + Manage Types Modal */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Campaign Type <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsTypesModalOpen(true)}
                          className="inline-flex items-center gap-1 text-xs text-[#172DC3] hover:text-[#201B9F] font-bold cursor-pointer transition"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>Manage Types</span>
                        </button>
                      </div>

                      <select
                        value={campaignType}
                        onChange={(e) => {
                          setCampaignType(e.target.value);
                          if (validationErrors.campaignType) {
                            setValidationErrors((prev) => ({ ...prev, campaignType: '' }));
                          }
                        }}
                        className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition ${
                          validationErrors.campaignType
                            ? 'border-rose-400 bg-rose-50/30'
                            : 'border-slate-200/90'
                        }`}
                      >
                        <option value="" disabled>
                          Select campaign type...
                        </option>
                        <optgroup label="Standard Types">
                          {DEFAULT_CAMPAIGN_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </optgroup>
                        {customCampaignTypes.length > 0 && (
                          <optgroup label="Custom Types">
                            {customCampaignTypes.map((t) => (
                              <option key={t.id} value={t.name}>
                                {t.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {validationErrors.campaignType && (
                        <p className="mt-1.5 text-xs text-rose-600 font-bold">
                          {validationErrors.campaignType}
                        </p>
                      )}
                    </div>

                    {/* 1.3 Audience Segment: B2B, B2C, Both (No default preselected) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Audience Segment <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['B2B', 'B2C', 'Both'] as AudienceSegment[]).map((seg) => (
                          <button
                            key={seg}
                            type="button"
                            onClick={() => {
                              setAudienceSegment(seg);
                              if (validationErrors.audienceSegment) {
                                setValidationErrors((prev) => ({ ...prev, audienceSegment: '' }));
                              }
                            }}
                            className={`p-3.5 rounded-xl border text-center transition cursor-pointer ${
                              audienceSegment === seg
                                ? 'bg-indigo-50/80 border-[#172DC3] text-[#160857] font-black ring-1 ring-[#172DC3]/30 shadow-2xs'
                                : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-bold'
                            }`}
                          >
                            <div className="text-xs sm:text-sm font-black">{seg}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                              {seg === 'B2B'
                                ? 'Industrial & Corporate'
                                : seg === 'B2C'
                                ? 'Consumer & Creators'
                                : 'Hybrid / Dual Market'}
                            </div>
                          </button>
                        ))}
                      </div>
                      {validationErrors.audienceSegment && (
                        <p className="mt-1.5 text-xs text-rose-600 font-bold">
                          {validationErrors.audienceSegment}
                        </p>
                      )}
                    </div>

                    {/* 1.4 Product / Service Selection (Section C) */}
                    <div className="pt-3 border-t border-slate-100">
                      <PromotionSelector
                        promotingType={promotingType}
                        onChangePromotingType={setPromotingType}
                        approvedCatalog={products}
                        promotionItems={promotionItems}
                        onChangePromotionItems={(items) => {
                          setPromotionItems(items);
                          if (validationErrors.promotionItems && items.length > 0) {
                            setValidationErrors((prev) => ({ ...prev, promotionItems: '' }));
                          }
                        }}
                      />
                      {validationErrors.promotionItems && (
                        <p className="mt-1.5 text-xs text-rose-600 font-bold">
                          {validationErrors.promotionItems}
                        </p>
                      )}
                    </div>

                    {/* 1.5 Campaign Objective (Section D) */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Campaign Objective <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleImproveObjective}
                          disabled={isImprovingObjective}
                          className="btn-ai inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          {isImprovingObjective ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-[#6344BF]" />
                          )}
                          <span>AI Improve Objective</span>
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={objective}
                        onChange={(e) => {
                          setObjective(e.target.value);
                          if (validationErrors.objective) {
                            setValidationErrors((prev) => ({ ...prev, objective: '' }));
                          }
                        }}
                        placeholder="State what this campaign should accomplish (e.g. Generate 20 qualified prototype requests from Tunisian engineering firms within 2 weeks)..."
                        className={`w-full px-3.5 py-2.5 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition ${
                          validationErrors.objective
                            ? 'border-rose-400 bg-rose-50/30'
                            : 'border-slate-200/90'
                        }`}
                      />
                      {validationErrors.objective && (
                        <p className="mt-1.5 text-xs text-rose-600 font-bold">
                          {validationErrors.objective}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* ACCORDION 2: AUDIENCE & MARKET (Section E, F, G, H)               */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(2)}
                  className="w-full px-6 py-4.5 bg-white hover:bg-slate-50/80 flex items-center justify-between transition cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-50 text-[#172DC3] border border-indigo-100/80 text-xs font-black flex items-center justify-center">
                      2
                    </span>
                    <div className="text-left">
                      <h2 className="text-sm font-black text-[#15192B]">Audience & Market</h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Target profiles, age demographics, Tunisian governorates, and language
                      </p>
                    </div>
                  </div>
                  {openSections[2] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {openSections[2] && (
                  <div className="p-6 space-y-5">
                    {/* 2.1 Reusable Target Audience Multi-Select (Section E) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Target Audience Profiles ({targetAudiences.length} Selected)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAudiencesModalOpen(true)}
                            className="inline-flex items-center gap-1 text-xs text-[#172DC3] hover:text-[#201B9F] font-bold cursor-pointer transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Manage Audiences</span>
                          </button>
                        </div>
                      </div>

                      {/* Audience Profiles List or Empty State */}
                      {allAudienceProfiles.length === 0 ? (
                        <div className="p-4 bg-slate-50/80 border border-dashed border-slate-200 rounded-xl text-center my-1.5">
                          <p className="text-xs font-bold text-slate-700 mb-0.5">No saved audience profiles yet</p>
                          <p className="text-[11px] text-slate-500 mb-2.5 font-medium">
                            Save reusable buyer personas to your workspace library, or specify custom target details below.
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAudiencesModalOpen(true)}
                            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#172DC3]" />
                            <span>+ Add Audience Profile</span>
                          </button>
                        </div>
                      ) : (
                        <div className="border border-slate-200/90 rounded-xl p-3 bg-slate-50/50">
                          <div className="relative mb-2">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={audienceSearchTerm}
                              onChange={(e) => setAudienceSearchTerm(e.target.value)}
                              placeholder="Filter audience profiles..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                            {filteredAudienceProfiles.map((aud) => {
                              const checked = targetAudiences.includes(aud.name);
                              return (
                                <label
                                  key={aud.id}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer border select-none transition ${
                                    checked
                                      ? 'bg-indigo-50/80 text-[#160857] border-[#172DC3] font-bold shadow-2xs ring-1 ring-[#172DC3]/20'
                                      : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 font-medium'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      if (checked) {
                                        setTargetAudiences(targetAudiences.filter((a) => a !== aud.name));
                                      } else {
                                        setTargetAudiences([...targetAudiences, aud.name]);
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded text-[#172DC3] border-slate-300 focus:ring-[#172DC3] cursor-pointer"
                                  />
                                  <span className="truncate">{aud.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Free-text Audience Details / Specific Notes */}
                      <div className="mt-2.5">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Audience Details / Specific Notes (Optional free text)
                        </label>
                        <textarea
                          rows={2}
                          value={audienceNotes}
                          onChange={(e) => setAudienceNotes(e.target.value)}
                          placeholder="Add custom buyer persona nuances, specific industries (e.g. Sfax automotive tier-2 suppliers, Tunis design schools)..."
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                        />
                      </div>
                    </div>

                    {/* 2.2 Age Range (Section F: Dropdowns, B2B hidden, B2C required, Both optional) */}
                    {audienceSegment !== 'B2B' && (
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Age Range {audienceSegment === 'B2C' ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Minimum Age</label>
                            <select
                              value={minAge}
                              onChange={(e) => {
                                setMinAge(e.target.value);
                                if (maxAge && maxAge !== 'No upper limit' && Number(maxAge) <= Number(e.target.value)) {
                                  setMaxAge('');
                                }
                              }}
                              className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition ${
                                validationErrors.minAge ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200/90'
                              }`}
                            >
                              <option value="">Select min age...</option>
                              {AGE_MIN_OPTIONS.map((age) => (
                                <option key={age} value={age}>
                                  {age} years old
                                </option>
                              ))}
                            </select>
                            {validationErrors.minAge && (
                              <p className="mt-1 text-[11px] text-rose-600 font-bold">{validationErrors.minAge}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Maximum Age</label>
                            <select
                              value={maxAge}
                              onChange={(e) => setMaxAge(e.target.value)}
                              disabled={!minAge}
                              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] disabled:bg-slate-100 disabled:opacity-60 transition"
                            >
                              <option value="">Select max age...</option>
                              {AGE_MAX_OPTIONS.filter((age) =>
                                typeof age === 'number' ? age > (Number(minAge) || 0) : true
                              ).map((age) => (
                                <option key={age} value={age}>
                                  {typeof age === 'number' ? `${age} years old` : 'No upper limit'}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2.3 Target Location — Tunisia (Section G) */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <span>Target Location — Tunisia</span>
                            <FlagTunisia className="w-4 h-3 rounded-2xs inline-block shadow-2xs" />
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {selectedGovernorates.length > 0
                            ? `${selectedGovernorates.length} of 24 governorates selected`
                            : 'Tunisia — no specific governorate targeting selected'}
                        </span>
                      </div>

                      <LocationSelector
                        selectedGovernorates={selectedGovernorates}
                        onChangeGovernorates={setSelectedGovernorates}
                        customLocationGroups={customLocationGroups}
                        onSaveCustomGroup={async (group) => {
                          await repository.saveCustomLocationGroup(group);
                          setCustomLocationGroups((prev) => [
                            ...prev.filter((g) => g.id !== group.id),
                            group,
                          ]);
                        }}
                        onDeleteCustomGroup={async (id) => {
                          const res = await repository.deleteCustomLocationGroup(id);
                          if (res.success) {
                            setCustomLocationGroups((prev) => prev.filter((g) => g.id !== id));
                          }
                        }}
                      />
                    </div>

                    {/* 2.4 Campaign Languages (Section H: ONLY Tunisian Darija, English, French) */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Languages
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Multi-selection enabled (makes campaign multilingual)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {LANGUAGE_OPTIONS.map((lang) => {
                          const checked = selectedLanguages.includes(lang.label);
                          return (
                            <label
                              key={lang.id}
                              className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition ${
                                checked
                                  ? 'bg-indigo-50/80 border-[#172DC3] text-[#160857] font-bold shadow-2xs ring-1 ring-[#172DC3]/30'
                                  : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 font-medium'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleLanguage(lang.label)}
                                className="w-4 h-4 rounded text-[#172DC3] border-slate-300 focus:ring-[#172DC3] cursor-pointer"
                              />
                              {lang.id === 'Tunisian Darija' && (
                                <FlagTunisia className="w-5 h-3.5 rounded-2xs shadow-2xs shrink-0" />
                              )}
                              {lang.id === 'English' && (
                                <FlagUK className="w-5 h-3.5 rounded-2xs shadow-2xs shrink-0" />
                              )}
                              {lang.id === 'French' && (
                                <FlagFrance className="w-5 h-3.5 rounded-2xs shadow-2xs shrink-0" />
                              )}
                              <span className="text-xs font-bold">{lang.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* ACCORDION 3: CHANNELS & TIMING (Section I, J, K, L)               */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(3)}
                  className="w-full px-6 py-4.5 bg-white hover:bg-slate-50/80 flex items-center justify-between transition cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-50 text-[#172DC3] border border-indigo-100/80 text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <div className="text-left">
                      <h2 className="text-sm font-black text-[#15192B]">Channels & Timing</h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Campaign duration dates, target platforms, content formats, and CTA
                      </p>
                    </div>
                  </div>
                  {openSections[3] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {openSections[3] && (
                  <div className="p-6 space-y-5">
                    {/* 3.1 Dates & Duration (Section I: Synchronized & Inclusive) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Campaign Schedule
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => handleStartDateChange(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Duration ({durationLabel})
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={durationDays}
                            onChange={(e) => handleDurationChange(parseInt(e.target.value, 10))}
                            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">End Date</label>
                          <input
                            type="date"
                            min={startDate}
                            value={endDate}
                            onChange={(e) => handleEndDateChange(e.target.value)}
                            className={`w-full px-3.5 py-2 text-xs bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition ${
                              validationErrors.endDate ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200/90'
                            }`}
                          />
                          {validationErrors.endDate && (
                            <p className="mt-1 text-[11px] text-rose-600 font-bold">{validationErrors.endDate}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3.2 Target Platforms (Section J: ONLY Meta, Instagram, Facebook, TikTok) */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Target Platforms
                        </label>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Meta provides simultaneous Instagram & Facebook cross-posting
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {PLATFORM_OPTIONS.map((plat) => {
                          const checked = targetPlatforms.includes(plat);
                          return (
                            <button
                              key={plat}
                              type="button"
                              onClick={() => togglePlatform(plat)}
                              className={`p-3.5 rounded-xl border text-center transition cursor-pointer ${
                                checked
                                  ? 'bg-indigo-50/80 border-[#172DC3] text-[#160857] font-bold shadow-2xs ring-1 ring-[#172DC3]/30'
                                  : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 font-medium'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                                {plat === 'Meta' && (
                                  <IconMetaCombined className="w-5 h-5 text-[#172DC3]" />
                                )}
                                {plat === 'Instagram' && (
                                  <IconInstagram className="w-5 h-5" />
                                )}
                                {plat === 'Facebook' && (
                                  <IconFacebook className="w-5 h-5 text-[#172DC3]" />
                                )}
                                {plat === 'TikTok' && (
                                  <IconTikTok className="w-5 h-5 text-slate-900" />
                                )}
                              </div>
                              <div className="text-xs font-bold">{plat}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                {plat === 'Meta' ? 'Cross-posted' : 'Standalone'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3.3 Content Formats (Section K: ONLY Reel / Video, Carousel, Story, Feed Photo, Feed Post) */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Content Formats
                        </label>
                        <button
                          type="button"
                          onClick={handleRecommendFormats}
                          disabled={isRecommendingFormats}
                          className="btn-ai inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          {isRecommendingFormats ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-[#6344BF]" />
                          )}
                          <span>AI Recommend Formats</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                        {FORMAT_OPTIONS.map((fmt) => {
                          const checked = desiredFormats.includes(fmt);
                          return (
                            <label
                              key={fmt}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center cursor-pointer select-none transition ${
                                checked
                                  ? 'bg-indigo-50/80 border-[#172DC3] text-[#160857] font-bold shadow-2xs ring-1 ring-[#172DC3]/30'
                                  : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFormat(fmt)}
                                className="sr-only"
                              />
                              <div className="mb-1.5 text-slate-500">
                                {fmt === 'Reel / Video' && <Film className="w-4 h-4 text-[#172DC3]" />}
                                {fmt === 'Carousel' && <Layers className="w-4 h-4 text-[#6344BF]" />}
                                {fmt === 'Story' && <Zap className="w-4 h-4 text-amber-500" />}
                                {fmt === 'Feed Photo' && <ImageIcon className="w-4 h-4 text-emerald-600" />}
                                {fmt === 'Feed Post' && <FileText className="w-4 h-4 text-slate-600" />}
                              </div>
                              <span className="text-xs font-bold">{fmt}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3.4 Call To Action (Section L: Combobox, Built-ins, Recent, Custom, AI) */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Call To Action (CTA)
                        </label>
                        <button
                          type="button"
                          onClick={handleSuggestCta}
                          disabled={isSuggestingCta}
                          className="btn-ai inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          {isSuggestingCta ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-[#6344BF]" />
                          )}
                          <span>AI Suggest CTA</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <select
                          value={COMMON_CTAS.includes(cta as any) ? cta : (cta ? 'CUSTOM' : '')}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM') {
                              setCta(customCtaInput || 'Contact Us');
                            } else {
                              setCta(e.target.value);
                            }
                          }}
                          className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                        >
                          <option value="">Select standard CTA or write custom...</option>
                          <optgroup label="Standard Actions">
                            {COMMON_CTAS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </optgroup>
                          {recentlyUsedCtas.length > 0 && (
                            <optgroup label="Recently Used in Campaigns">
                              {recentlyUsedCtas.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <option value="CUSTOM">Custom CTA...</option>
                        </select>

                        {(!COMMON_CTAS.includes(cta as any) || cta === '') && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={cta}
                              onChange={(e) => setCta(e.target.value)}
                              placeholder="Or type custom CTA (e.g. Request Custom 3D Prototype)..."
                              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* ACCORDION 4: CAMPAIGN STRATEGY (Section M)                        */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(4)}
                  className="w-full px-6 py-4.5 bg-white hover:bg-slate-50/80 flex items-center justify-between transition cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-50 text-[#172DC3] border border-indigo-100/80 text-xs font-black flex items-center justify-center">
                      4
                    </span>
                    <div className="text-left">
                      <h2 className="text-sm font-black text-[#15192B]">Campaign Strategy</h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Tone, value proposition, primary KPIs, funnel intent, offer, and seasonal context
                      </p>
                    </div>
                  </div>
                  {openSections[4] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {openSections[4] && (
                  <div className="p-6 space-y-5">
                    {/* 4.1 Campaign Tone (Multi-select / custom) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Campaign Tone ({campaignToneList.length} Selected)
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2.5">
                        {CAMPAIGN_TONES.map((tone) => {
                          const checked = campaignToneList.includes(tone);
                          return (
                            <button
                              key={tone}
                              type="button"
                              onClick={() => toggleTone(tone)}
                              className={`px-3 py-1.5 text-xs rounded-xl border transition cursor-pointer ${
                                checked
                                  ? 'bg-[#172DC3] text-white border-[#172DC3] font-bold shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 font-medium'
                              }`}
                            >
                              {tone}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customToneInput}
                          onChange={(e) => setCustomToneInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTone())}
                          placeholder="Add custom tone (e.g. Technical & Premium)..."
                          className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomTone}
                          className="btn-secondary px-3.5 py-2 text-xs font-bold"
                        >
                          Add Tone
                        </button>
                      </div>
                    </div>

                    {/* 4.2 Key Message / Value Proposition */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Key Message / Value Proposition
                        </label>
                        <button
                          type="button"
                          onClick={handleImproveKeyMessage}
                          disabled={isImprovingKeyMessage}
                          className="btn-ai inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          {isImprovingKeyMessage ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-[#6344BF]" />
                          )}
                          <span>AI Polish Message</span>
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={keyMessage}
                        onChange={(e) => setKeyMessage(e.target.value)}
                        placeholder="State the core value proposition (e.g. High-strength functional prototypes manufactured in Tunis in 48 hours without expensive tooling)..."
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                      />
                    </div>

                    {/* 4.3 Primary KPIs (Searchable Multi-Select) */}
                    <div className="pt-3 border-t border-slate-100">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Primary KPIs ({primaryKPIs.length} Selected)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {PRIMARY_KPIS.map((kpi) => {
                          const checked = primaryKPIs.includes(kpi);
                          return (
                            <label
                              key={kpi}
                              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs cursor-pointer select-none transition ${
                                checked
                                  ? 'bg-indigo-50/80 border-[#172DC3] text-[#160857] font-bold shadow-2xs ring-1 ring-[#172DC3]/20'
                                  : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 font-medium'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleKPI(kpi)}
                                className="w-3.5 h-3.5 rounded text-[#172DC3] border-slate-300 focus:ring-[#172DC3] cursor-pointer"
                              />
                              <span>{kpi}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4.4 Funnel Intent */}
                    <div className="pt-3 border-t border-slate-100">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Funnel Intent
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(['Awareness', 'Consideration', 'Conversion', 'Retention'] as const).map((intent) => (
                          <button
                            key={intent}
                            type="button"
                            onClick={() => setFunnelIntent(intent === funnelIntent ? '' : intent)}
                            className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                              funnelIntent === intent
                                ? 'bg-indigo-50/80 border-[#172DC3] text-[#160857] font-black shadow-2xs ring-1 ring-[#172DC3]/30'
                                : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 font-bold'
                            }`}
                          >
                            <div className="text-xs font-bold">{intent}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4.5 Promotion / Offer & Seasonal Context (Optional) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Promotion / Special Offer (Optional)
                        </label>
                        <input
                          type="text"
                          value={promotionOffer}
                          onChange={(e) => setPromotionOffer(e.target.value)}
                          placeholder="e.g. Free 3D file CAD validation + 10% first batch..."
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Seasonal Context (Optional)
                        </label>
                        <input
                          type="text"
                          value={seasonalContext}
                          onChange={(e) => setSeasonalContext(e.target.value)}
                          placeholder="e.g. Graduation project season, Ramadan schedule, Expo..."
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* ACCORDION 5: CREATIVE DIRECTION & VISUAL ASSETS (Section O, P, Q, R) */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(5)}
                  className="w-full px-6 py-4.5 bg-white hover:bg-slate-50/80 flex items-center justify-between transition cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-50 text-[#172DC3] border border-indigo-100/80 text-xs font-black flex items-center justify-center">
                      5
                    </span>
                    <div className="text-left">
                      <h2 className="text-sm font-black text-[#15192B]">Creative Direction & Visual Assets</h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Content pillars, brand colors, campaign palette accents, asset upload, and directives
                      </p>
                    </div>
                  </div>
                  {openSections[5] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {openSections[5] && (
                  <div className="p-6 space-y-5">
                    {/* 5.1 Authoritative Content Pillars (Section N: OPTIONAL, begins empty) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Campaign Content Pillars (Optional)
                          </label>
                          <p className="text-[11px] text-slate-400 font-medium">
                            User-created pillars are authoritative for AI planning.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSuggestPillars}
                          disabled={isSuggestingPillars}
                          className="btn-ai inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 disabled:opacity-60 cursor-pointer"
                        >
                          {isSuggestingPillars ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-[#6344BF]" />
                          )}
                          <span>AI Suggest Content Pillars</span>
                        </button>
                      </div>

                      {contentPillars.length === 0 ? (
                        <div className="p-4 bg-slate-50/80 border border-dashed border-slate-200/90 rounded-xl text-xs font-medium text-slate-500 text-center mb-2.5">
                          No custom content pillars defined yet. (Add custom pillars or request AI suggestions).
                        </div>
                      ) : (
                        <div className="space-y-2 mb-2.5">
                          {contentPillars.map((pillar, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800"
                            >
                              <span className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-lg bg-indigo-100/80 text-[#172DC3] text-[10px] flex items-center justify-center font-black">
                                  {idx + 1}
                                </span>
                                {pillar}
                              </span>
                              <button
                                type="button"
                                onClick={() => setContentPillars(contentPillars.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition rounded-md"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newPillarInput}
                          onChange={(e) => setNewPillarInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newPillarInput.trim()) {
                                setContentPillars([...contentPillars, newPillarInput.trim()]);
                                setNewPillarInput('');
                              }
                            }
                          }}
                          placeholder="Type custom pillar (e.g. Rapid Local Turnaround & Material Versatility)..."
                          className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newPillarInput.trim()) {
                              setContentPillars([...contentPillars, newPillarInput.trim()]);
                              setNewPillarInput('');
                            }
                          }}
                          className="btn-secondary px-3.5 py-2 text-xs font-bold"
                        >
                          Add Pillar
                        </button>
                      </div>
                    </div>

                    {/* 5.2 Brand Kit Colors & Campaign Palette (Section P & Q) */}
                    <div className="pt-3 border-t border-slate-100">
                      <ColorPaletteSection
                        brandKit={brandKit || null}
                        campaignPalette={campaignPalette}
                        onChangeCampaignPalette={setCampaignPalette}
                        onRequestSuggestPalette={handleSuggestPalette}
                        isSuggestingPalette={isSuggestingPalette}
                      />
                    </div>

                    {/* 5.3 Upload Visual Assets / References (Section R) */}
                    <div className="pt-3 border-t border-slate-100">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Upload Visual Assets / References ({uploadedAssets.length})
                      </label>
                      <div className="border-2 border-dashed border-slate-200/90 hover:border-[#172DC3]/40 rounded-2xl p-5 text-center transition bg-slate-50/50">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*,.pdf"
                          id="visual-asset-file-input"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="visual-asset-file-input"
                          className="flex flex-col items-center cursor-pointer"
                        >
                          <Upload className="w-7 h-7 text-[#172DC3] mb-1.5" />
                          <span className="text-xs font-bold text-slate-800">
                            Click to browse or drop campaign visual assets
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Product photos, workshop videos, vector designs, or reference examples
                          </span>
                        </label>
                      </div>

                      {uploadedAssets.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                          {uploadedAssets.map((asset) => (
                            <div
                              key={asset.id}
                              className="relative group border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-2xs p-2.5"
                            >
                              {asset.fileType === 'image' && asset.dataUrl && (
                                <img
                                  src={asset.dataUrl}
                                  alt={asset.name}
                                  className="w-full h-20 object-cover rounded-lg mb-1.5"
                                />
                              )}
                              <div className="text-[11px] font-bold text-slate-800 truncate">
                                {asset.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : 'Asset'}
                              </div>
                              <button
                                type="button"
                                onClick={() => setUploadedAssets(uploadedAssets.filter((a) => a.id !== asset.id))}
                                className="absolute top-1.5 right-1.5 p-1 bg-white/95 rounded-lg text-slate-400 hover:text-rose-600 shadow-xs cursor-pointer opacity-0 group-hover:opacity-100 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 5.4 Additional Creative Directives */}
                    <div className="pt-3 border-t border-slate-100">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Additional Creative Directives (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={additionalDirectives}
                        onChange={(e) => setAdditionalDirectives(e.target.value)}
                        placeholder="Any explicit creative guidelines, music styling, pacing, visual framing, or technical disclaimers..."
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* ACCORDION 6: REFERENCES & AVAILABLE CONTENT (Section S & T)       */}
              {/* ----------------------------------------------------------------- */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(6)}
                  className="w-full px-6 py-4.5 bg-white hover:bg-slate-50/80 flex items-center justify-between transition cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-indigo-50 text-[#172DC3] border border-indigo-100/80 text-xs font-black flex items-center justify-center">
                      6
                    </span>
                    <div className="text-left">
                      <h2 className="text-sm font-black text-[#15192B]">References & Available Content</h2>
                      <p className="text-xs text-slate-500 font-medium">
                        Historical references from Data & Knowledge, and production availability declarations
                      </p>
                    </div>
                  </div>
                  {openSections[6] ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {openSections[6] && (
                  <div className="p-6 space-y-5">
                    {/* 6.1 Available Content & Resources (Section S) */}
                    <div>
                      <div className="mb-2.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Available Content & Resources
                        </label>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Declare what studio and footage resources are on-hand so Gemini plans realistic productions.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {AVAILABLE_RESOURCES_CONFIG.map((res) => {
                          const checked = !!availableResources[res.key];
                          return (
                            <label
                              key={res.key}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition ${
                                checked
                                  ? 'bg-indigo-50/80 border-[#172DC3] text-[#160857] shadow-2xs ring-1 ring-[#172DC3]/30'
                                  : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setAvailableResources({
                                    ...availableResources,
                                    [res.key]: !checked,
                                  })
                                }
                                className="w-4 h-4 mt-0.5 rounded text-[#172DC3] border-slate-300 focus:ring-[#172DC3] cursor-pointer"
                              />
                              <div>
                                <div className="text-xs font-bold">{res.label}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{res.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="mt-3">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Resource Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={availableResources.notes || ''}
                          onChange={(e) =>
                            setAvailableResources({
                              ...availableResources,
                              notes: e.target.value,
                            })
                          }
                          placeholder="e.g. High-speed macro camera available this Thursday for close-up nozzle filming..."
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                        />
                      </div>
                    </div>

                    {/* 6.2 Campaign References from Data & Knowledge (Section T) */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="mb-2.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                          Campaign References ({selectedReferenceIds.length} Attached)
                        </label>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Attach past benchmark campaigns from Data & Knowledge → Campaign References.
                        </p>
                      </div>

                      {campaignReferences.length === 0 ? (
                        <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-500 flex items-center gap-2.5">
                          <Info className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>No past campaign references stored yet in Data & Knowledge → Campaign References.</span>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                          {campaignReferences.map((ref) => {
                            const checked = selectedReferenceIds.includes(ref.id);
                            return (
                              <label
                                key={ref.id}
                                className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                                  checked
                                    ? 'bg-indigo-50/80 border-[#172DC3] text-[#160857] shadow-2xs ring-1 ring-[#172DC3]/30'
                                    : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 font-medium'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    if (checked) {
                                      setSelectedReferenceIds(selectedReferenceIds.filter((id) => id !== ref.id));
                                    } else {
                                      setSelectedReferenceIds([...selectedReferenceIds, ref.id]);
                                    }
                                  }}
                                  className="w-4 h-4 mt-0.5 rounded text-[#172DC3] border-slate-300 focus:ring-[#172DC3] cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-[#15192B]">{ref.title}</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold">
                                      {ref.type} • {ref.audienceSegment}
                                    </span>
                                  </div>
                                  {ref.keyTakeaway && (
                                    <p className="text-[11px] text-slate-600 mt-1 font-medium">{ref.keyTakeaway}</p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-3">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Campaign-Specific Reference Notes (Optional, not saved permanently)
                        </label>
                        <textarea
                          rows={2}
                          value={customReferenceNotes}
                          onChange={(e) => setCustomReferenceNotes(e.target.value)}
                          placeholder="Notes on specific angles, inspirations, or competitor campaigns to reference for this brief..."
                          className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3] transition"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Card */}
              <div className="bg-indigo-50/70 border border-indigo-100/90 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                <div>
                  <h3 className="text-sm font-black text-[#160857]">
                    Ready to evaluate strategic creative directions?
                  </h3>
                  <p className="text-xs text-indigo-900/80 font-medium mt-0.5">
                    Proceed to review pre-generation assumptions and generate 3 distinct strategic angles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleProceedToAssumptions}
                  disabled={isLoadingAssumptions}
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold shrink-0"
                >
                  {isLoadingAssumptions ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing Context...</span>
                    </>
                  ) : (
                    <>
                      <span>Review Assumptions & Framing</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Sticky Live AI Context Panel (Section X & Y) (lg:col-span-4) */}
            <div className="lg:col-span-4 self-start sticky top-6">
              <AIContextStickyPanel
                brandKit={brandKit || null}
                brief={buildCurrentBrief()}
                promotionItems={promotionItems}
                uploadedAssets={uploadedAssets}
                campaignReferences={campaignReferences}
                feedbackMemoryCount={feedbackMemory.length}
              />
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* STAGE 2: ASSUMPTIONS & CREATIVE FRAMING REVIEW                        */}
        {/* ===================================================================== */}
        {currentStage === 2 && (
          <div className="max-w-4xl mx-auto space-y-6">
            <AssumptionsSection
              assumptions={assumptions}
              onUpdateAssumption={(updated) =>
                setAssumptions(assumptions.map((a) => (a.id === updated.id ? updated : a)))
              }
              onProceedToDirections={handleGenerateDirections}
              onBackToBrief={() => setCurrentStage(1)}
              isLoadingDirections={isLoadingDirections}
            />
          </div>
        )}

        {/* ===================================================================== */}
        {/* STAGE 3: 3 STRATEGIC DIRECTIONS WORKSPACE                             */}
        {/* ===================================================================== */}
        {currentStage === 3 && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#15192B]">
                  Strategic Creative Directions
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select, customize, or combine directions to build the complete campaign execution plan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStage(2)}
                className="btn-secondary inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Assumptions</span>
              </button>
            </div>

            <div className="space-y-4">
              {directions.map((dir, idx) => (
                <StrategicDirectionCard
                  key={dir.id}
                  direction={dir}
                  index={idx}
                  isSelected={selectedDirectionId === dir.id}
                  onSelectForPlan={() => handleSelectDirection(dir)}
                  onToggleShortlist={() => {
                    setDirections(
                      directions.map((d) =>
                        d.id === dir.id ? { ...d, shortlisted: !d.shortlisted } : d
                      )
                    );
                  }}
                  onUpdateDirection={(updated) => {
                    setDirections(
                      directions.map((d) => (d.id === updated.id ? updated : d))
                    );
                  }}
                  isGeneratingPlan={isGenerating}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODALS & PREVIEWS                                                         */}
      {/* ========================================================================= */}

      {/* Objective Improvement Preview Modal */}
      {objectiveImprovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200/90 overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6344BF]" />
                <h3 className="text-sm font-black text-[#15192B]">AI Improved Objective Preview</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Original Input
                </div>
                <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 font-medium">
                  {objectiveImprovementModal.original}
                </p>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#6344BF] mb-1.5">
                  AI Improved Proposal
                </div>
                <p className="text-xs font-bold text-slate-900 bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 leading-relaxed">
                  {objectiveImprovementModal.suggestion}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setObjectiveImprovementModal(null)}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Keep Original
              </button>
              <button
                type="button"
                onClick={() => {
                  setObjective(objectiveImprovementModal.suggestion);
                  setObjectiveImprovementModal(null);
                }}
                className="btn-ai px-4.5 py-2 text-xs font-bold"
              >
                Accept Proposal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Format Recommendation Preview Modal */}
      {formatRecommendationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200/90 overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6344BF]" />
                <h3 className="text-sm font-black text-[#15192B]">Recommended Formats Preview</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium">{formatRecommendationModal.rationale}</p>
              <div className="flex flex-wrap gap-2">
                {formatRecommendationModal.formats.map((fmt) => (
                  <span
                    key={fmt}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-900 border border-purple-200 rounded-full text-xs font-bold"
                  >
                    <Check className="w-3 h-3 text-[#6344BF]" />
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setFormatRecommendationModal(null)}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDesiredFormats(formatRecommendationModal.formats);
                  setFormatRecommendationModal(null);
                }}
                className="btn-ai px-4.5 py-2 text-xs font-bold"
              >
                Apply Recommended Formats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested CTA Modal */}
      {suggestedCtaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200/90 overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6344BF]" />
                <h3 className="text-sm font-black text-[#15192B]">AI Suggested Call To Actions</h3>
              </div>
            </div>
            <div className="p-6 space-y-2.5">
              <p className="text-xs text-slate-600 font-medium mb-2">
                Select one of the context-tailored CTA options:
              </p>
              {suggestedCtaModal.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCta(sug);
                    setSuggestedCtaModal(null);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-200/90 hover:border-[#6344BF]/40 hover:bg-purple-50/50 text-xs font-bold text-slate-800 transition flex items-center justify-between cursor-pointer"
                >
                  <span>{sug}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#6344BF] shrink-0" />
                </button>
              ))}
            </div>
            <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSuggestedCtaModal(null)}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggested Pillars Modal */}
      {suggestedPillarsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200/90 overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6344BF]" />
                <h3 className="text-sm font-black text-[#15192B]">AI Suggested Content Pillars</h3>
              </div>
            </div>
            <div className="p-6 space-y-2.5">
              <p className="text-xs text-slate-600 font-medium mb-2">
                Proposed pillars grounded in 3 Dimensions capabilities:
              </p>
              {suggestedPillarsModal.map((pillar, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50/80 border border-slate-200/90 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2.5"
                >
                  <span className="w-5 h-5 rounded-lg bg-purple-100 text-[#6344BF] text-[10px] flex items-center justify-center font-black">
                    {idx + 1}
                  </span>
                  <span>{pillar}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSuggestedPillarsModal(null)}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const combined = Array.from(new Set([...contentPillars, ...suggestedPillarsModal]));
                  setContentPillars(combined);
                  setSuggestedPillarsModal(null);
                }}
                className="btn-ai px-4.5 py-2 text-xs font-bold"
              >
                Append to Pillars
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Message Improvement Preview Modal */}
      {keyMessageImprovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200/90 overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6344BF]" />
                <h3 className="text-sm font-black text-[#15192B]">Polished Value Proposition</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Original
                </div>
                <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200/90 font-medium">
                  {keyMessageImprovementModal.original}
                </p>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#6344BF] mb-1.5">
                  Polished
                </div>
                <p className="text-xs font-bold text-slate-900 bg-purple-50/60 p-3.5 rounded-xl border border-purple-200 leading-relaxed">
                  {keyMessageImprovementModal.suggestion}
                </p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setKeyMessageImprovementModal(null)}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setKeyMessage(keyMessageImprovementModal.suggestion);
                  setKeyMessageImprovementModal(null);
                }}
                className="btn-ai px-4.5 py-2 text-xs font-bold"
              >
                Apply Polished Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Custom Campaign Types Modal */}
      <ManageCampaignTypesModal
        isOpen={isTypesModalOpen}
        onClose={() => setIsTypesModalOpen(false)}
        customTypes={customCampaignTypes}
        campaigns={existingCampaigns}
        onAddType={handleAddCustomType}
        onUpdateType={handleUpdateCustomType}
        onDeleteType={handleDeleteCustomType}
      />

      {/* Manage Custom Target Audiences Modal */}
      <ManageTargetAudiencesModal
        isOpen={isAudiencesModalOpen}
        onClose={() => setIsAudiencesModalOpen(false)}
        customAudiences={customTargetAudiences}
        campaigns={existingCampaigns}
        onAddAudience={handleAddCustomAudience}
        onUpdateAudience={handleUpdateCustomAudience}
        onDeleteAudience={handleDeleteCustomAudience}
      />
    </div>
  );
};
