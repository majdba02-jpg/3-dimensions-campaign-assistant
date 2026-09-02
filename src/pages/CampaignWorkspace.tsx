import React, { useState, useEffect, useMemo } from 'react';
import {
  CampaignBrief,
  CampaignPlan as CampaignPlanType,
  CalendarItem,
  StaffMember,
  CampaignStatus,
  ProductionStatus,
  FactualStatus,
  ContentAsset,
  FeedbackMemoryItem,
  ProductService,
  BrandKit,
} from '../types';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Sparkles,
  LayoutDashboard,
  Lock,
  Unlock,
  RefreshCw,
  List,
  Grid,
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  AlertTriangle,
  Edit3,
  X,
  Globe,
  Users,
  Target,
  Megaphone,
  Palette,
  Package,
  Layers,
  Clock,
  MapPin,
  CheckCircle2,
  FolderKanban,
  FileText,
  ChevronDown,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ContentReview } from './ContentReview';
import { StaffProfilePopover } from '../components/StaffProfilePopover';
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
  resolveAuthoritativeCta,
  detectUnsupportedClaimsInText,
} from '../utils/planValidation';

interface CampaignWorkspaceProps {
  brief: CampaignBrief | null;
  plan: CampaignPlanType | null;
  staffMembers: StaffMember[];
  contentAssets?: ContentAsset[];
  brandKit?: BrandKit | null;
  products?: ProductService[];
  onBackToLibrary: () => void;
  onEditDraft: (brief: CampaignBrief) => void;
  onSavePlan: (updatedPlan: CampaignPlanType) => Promise<void>;
  onSaveBrief?: (updatedBrief: CampaignBrief) => Promise<void>;
  onSaveAsset?: (updatedAsset: ContentAsset) => Promise<void>;
  onSaveFeedbackMemory?: (item: FeedbackMemoryItem) => Promise<void>;
  onRegenerateComponent: (
    componentKey: string,
    lockedKeys: string[],
    instructions?: string
  ) => Promise<void>;
  isGenerating: boolean;
  onOpenContentReview?: (item: CalendarItem) => void;
  initialTab?: 'overview' | 'strategy' | 'calendar' | 'review';
  initialAssetId?: string;
}

export const CampaignWorkspace: React.FC<CampaignWorkspaceProps> = ({
  brief,
  plan,
  staffMembers,
  contentAssets = [],
  brandKit,
  products = [],
  onBackToLibrary,
  onEditDraft,
  onSavePlan,
  onSaveBrief,
  onSaveAsset,
  onSaveFeedbackMemory,
  onRegenerateComponent,
  isGenerating,
  onOpenContentReview,
  initialTab = 'overview',
  initialAssetId,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'strategy' | 'calendar' | 'review'>(
    initialTab
  );
  const [inspectedAssetId, setInspectedAssetId] = useState<string | undefined>(initialAssetId);
  const [calendarView, setCalendarView] = useState<'table' | 'grid'>('table');
  const [lockedComponents, setLockedComponents] = useState<Record<string, boolean>>({});
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(brief?.name || '');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialAssetId) {
      setInspectedAssetId(initialAssetId);
    }
  }, [initialAssetId]);

  useEffect(() => {
    if (brief) {
      setNameInput(brief.name);
      setIsEditingName(false);
    }
  }, [brief?.id, brief?.name]);

  // Derive approved knowledge strings for factual grounding verification
  const approvedKnowledgeStrings = useMemo(() => {
    const brandStrings = [
      brandKit?.companyName || '3 Dimensions',
      brandKit?.companyDescription || '',
      ...(brandKit?.preferredTerminology || []),
    ];
    const productStrings = (products || []).flatMap((p) => [
      p.name,
      p.description || '',
      p.technicalDetails || '',
      ...(p.keyStrengths || []),
      ...(p.supportedMaterials || []),
    ]);
    return [...brandStrings, ...productStrings].filter(Boolean);
  }, [brandKit, products]);

  // Derive active plan scoped assets
  const scopedAssets: ContentAsset[] = useMemo(() => {
    if (!plan?.calendar) return [];
    return plan.calendar.map((item) => {
      const existing = contentAssets.find(
        (a) =>
          a.campaignId === brief?.id &&
          (a.contentItemId === item.id ||
            a.id === `ast_${item.id}` ||
            (a.scheduledDate === item.date && a.title === item.topic))
      );

      const effectiveCta = resolveAuthoritativeCta(item.cta, brief?.cta);

      if (existing) {
        return {
          ...existing,
          title: item.topic,
          format: item.format,
          platform: item.platform,
          scheduledDate: item.date,
          concernedPeopleIds: item.concernedPeopleIds || existing.concernedPeopleIds,
          factualStatus: existing.factualStatus || item.factualStatus,
          contentItemId: item.id,
          cta: resolveAuthoritativeCta(existing.cta, effectiveCta),
          carouselSlides: existing.carouselSlides || item.carouselSlides || [],
          storyFrames: existing.storyFrames || item.storyFrames || [],
        };
      }

      return {
        id: `ast_${item.id}`,
        campaignId: brief?.id || '',
        campaignName: brief?.name || '',
        planVersionId: plan.planVersionId || brief?.activePlanVersionId || `plan_${brief?.id}`,
        contentItemId: item.id,
        title: item.topic,
        format: item.format,
        platform: item.platform,
        scheduledDate: item.date,
        hook: item.hook,
        caption: item.caption,
        scriptOrStoryboard: item.reelScript || item.visualNotes || '',
        scriptSegments: item.scriptSegments || [],
        carouselSlides: item.carouselSlides || [],
        storyFrames: item.storyFrames || [],
        totalDurationSeconds: item.totalDurationSeconds,
        cta: effectiveCta,
        hashtags: item.hashtags || [],
        creativeBrief: plan.designerBrief || '',
        visualDirection: plan.visualDirection || '',
        requiredAssets: [],
        concernedPeopleIds: item.concernedPeopleIds,
        factualStatus: item.factualStatus || 'grounded',
        status: (item.status === 'Approved' ? 'Approved' : 'Needs Review') as ContentAsset['status'],
        isLocked: false,
        versions: [
          {
            versionNumber: 1,
            hook: item.hook,
            caption: item.caption,
            scriptOrStoryboard: item.reelScript,
            scriptSegments: item.scriptSegments,
            carouselSlides: item.carouselSlides,
            storyFrames: item.storyFrames,
            cta: effectiveCta,
            updatedAt: plan.createdAt || new Date().toISOString(),
            updatedBy: 'Campaign Plan Generator',
          },
        ],
        comments: [],
        createdAt: plan.createdAt || new Date().toISOString(),
        updatedAt: plan.updatedAt || new Date().toISOString(),
      };
    });
  }, [brief, plan, contentAssets]);

  const handleInspectCalendarItem = (item: CalendarItem) => {
    const matchingAsset = scopedAssets.find(
      (a) =>
        a.contentItemId === item.id ||
        a.id === `ast_${item.id}` ||
        (a.scheduledDate === item.date && a.title === item.topic)
    );
    setInspectedAssetId(matchingAsset?.id || `ast_${item.id}`);
    setActiveTab('review');
    if (onOpenContentReview) {
      onOpenContentReview(item);
    }
  };

  if (!brief) {
    return (
      <div className="p-12 text-center bg-white min-h-[60vh] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#172DC3] mb-3">
          <FolderKanban className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-[#15192B] text-base">No Campaign Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mb-4">
          Please select a campaign from the Campaign Library to view its workspace.
        </p>
        <button
          type="button"
          onClick={onBackToLibrary}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go to Campaign Library</span>
        </button>
      </div>
    );
  }

  const handleSaveName = async () => {
    if (!nameInput.trim() || !onSaveBrief) return;
    const updated: CampaignBrief = {
      ...brief,
      name: nameInput.trim(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveBrief(updated);
    setIsEditingName(false);
  };

  const toggleLock = (key: string) => {
    setLockedComponents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isLocked = (key: string) => !!lockedComponents[key];

  const handleRegenerateSingle = async (key: string) => {
    if (isLocked(key)) return;
    const lockedKeys = Object.keys(lockedComponents).filter((k) => lockedComponents[k]);
    await onRegenerateComponent(key, lockedKeys);
  };

  const handleAssignStaff = (itemId: string, staffId: string) => {
    if (!plan) return;
    const updatedCalendar = plan.calendar.map((item) => {
      if (item.id === itemId) {
        const currentList = item.concernedPeopleIds || [];
        const newList = currentList.includes(staffId)
          ? currentList.filter((id) => id !== staffId)
          : [...currentList, staffId];
        return { ...item, concernedPeopleIds: newList };
      }
      return item;
    });

    onSavePlan({ ...plan, calendar: updatedCalendar });
  };

  const handleUpdateItemStatus = (itemId: string, newStatus: ProductionStatus) => {
    if (!plan) return;
    const updatedCalendar = plan.calendar.map((item) => {
      if (item.id === itemId) {
        return { ...item, status: newStatus };
      }
      return item;
    });

    onSavePlan({ ...plan, calendar: updatedCalendar });
  };

  const handleCopyPlanText = () => {
    if (!plan) return;
    const text = `CAMPAIGN WORKSPACE: ${brief.name}
Objective: ${brief.objective}
Audience: ${brief.audienceSegment} (${brief.targetAudience || (brief.targetAudiences || []).join(', ')})
Product/Service: ${brief.productOrService || '3 Dimensions'}
CTA: ${brief.cta || 'Send us your project idea'}
Duration: ${brief.durationDays} Days (${brief.startDate} to ${brief.endDate})

STRATEGY & PLAN:
Concept: ${plan.concept}
Core Message: ${plan.coreMessage}
Value Proposition: ${plan.valueProposition}
Content Pillars: ${plan.contentPillars.join(', ')}

CALENDAR SCHEDULE (${plan.calendar.length} items):
${plan.calendar
  .map(
    (c) =>
      `[${c.date}] [${c.platform} - ${c.format}] [Status: ${c.status || 'Planned'}] ${c.topic}\nHook: ${c.hook}\nCaption: ${c.caption}\nCTA: ${c.cta || brief.cta}\n`
  )
  .join('\n---\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'In Progress':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'In Review':
        return 'bg-violet-50 text-violet-800 border-violet-300';
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Archived':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getProductionStatusBadgeStyle = (status: ProductionStatus) => {
    switch (status) {
      case 'Planned':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'In Production':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Ready for Review':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'Approved':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300';
      case 'Published':
        return 'bg-purple-50 text-purple-900 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Safe language flag renderer
  const renderLanguagePill = (lang: string) => {
    const isTunisian = lang.toLowerCase().includes('darija') || lang.toLowerCase().includes('tunis');
    const isFrench = lang.toLowerCase().includes('french') || lang.toLowerCase().includes('français');
    const isEnglish = lang.toLowerCase().includes('english') || lang.toLowerCase().includes('anglais');

    return (
      <span
        key={lang}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-800 shadow-2xs"
      >
        {isTunisian && <FlagTunisia className="w-4 h-3 shrink-0" />}
        {isFrench && <FlagFrance className="w-4 h-3 shrink-0" />}
        {isEnglish && <FlagUK className="w-4 h-3 shrink-0" />}
        {!isTunisian && !isFrench && !isEnglish && <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
        <span>{lang}</span>
      </span>
    );
  };

  // Safe platform icon renderer
  const renderPlatformPill = (platform: string) => {
    const isMeta = platform.toLowerCase() === 'meta';
    const isIG = platform.toLowerCase() === 'instagram';
    const isFB = platform.toLowerCase() === 'facebook';
    const isTikTok = platform.toLowerCase() === 'tiktok';

    return (
      <span
        key={platform}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs ${
          isMeta
            ? 'bg-indigo-50 border border-indigo-200 text-[#172DC3]'
            : 'bg-slate-50 border border-slate-200 text-slate-800'
        }`}
      >
        {isMeta && <IconMetaCombined className="h-3.5" />}
        {isIG && <IconInstagram className="w-3.5 h-3.5 text-pink-600 shrink-0" />}
        {isFB && <IconFacebook className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
        {isTikTok && <IconTikTok className="w-3.5 h-3.5 text-slate-900 shrink-0" />}
        {!isMeta && !isIG && !isFB && !isTikTok && <Megaphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
        <span>{platform}</span>
        {isMeta && (
          <span className="text-[10px] text-indigo-700/80 font-medium">
            (Instagram / Facebook cross-posted)
          </span>
        )}
      </span>
    );
  };

  const languagesList: string[] = brief.languages && brief.languages.length > 0
    ? brief.languages
    : brief.language
    ? [brief.language]
    : [];

  const rawPlatformsList: string[] = brief.targetPlatforms && brief.targetPlatforms.length > 0
    ? brief.targetPlatforms
    : brief.platforms && brief.platforms.length > 0
    ? brief.platforms
    : ['Meta'];

  // Guarantee that Meta is respected and TikTok is omitted if not selected
  const platformsList = rawPlatformsList.map((p) => (p.toLowerCase() === 'meta' ? 'Meta' : p));

  // Sanitize tone list to remove any test artifacts (e.g. 'poopii')
  const cleanToneList = (brief.campaignToneList || [])
    .filter((t) => t && t.toLowerCase() !== 'poopii')
    .concat(
      brief.campaignTone && brief.campaignTone.toLowerCase() !== 'poopii' && (!brief.campaignToneList || brief.campaignToneList.length === 0)
        ? [brief.campaignTone]
        : []
    );

  const primaryCalendarCount = plan?.calendar ? plan.calendar.filter((c) => c.format !== 'Story').length : 0;
  const storyCalendarCount = plan?.calendar ? plan.calendar.filter((c) => c.format === 'Story').length : 0;

  return (
    <div className="space-y-6" id="campaign-workspace-root">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLibrary}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-[#172DC3] bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-lg shadow-2xs transition-all cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Campaign Library</span>
        </button>

        <div className="flex items-center gap-2">
          {plan && (
            <button
              type="button"
              onClick={handleCopyPlanText}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold shadow-2xs cursor-pointer"
            >
              {copiedNotice ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{copiedNotice ? 'Summary Copied' : 'Copy Summary'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onEditDraft(brief)}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#172DC3] border-indigo-200 hover:bg-indigo-50 shadow-2xs cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#172DC3]" />
            <span>Edit Campaign Brief</span>
          </button>
        </div>
      </div>

      {/* 1. CAMPAIGN IDENTITY HEADER */}
      <div className="card-tier-1 p-6 space-y-4 bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            {/* Badges line */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                  brief.status
                )}`}
              >
                {brief.status}
              </span>

              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-[#172DC3] uppercase tracking-wider">
                {brief.type}
              </span>

              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Audience: <strong className="text-slate-900">{brief.audienceSegment}</strong>
              </span>

              {brief.durationDays && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{brief.durationDays} Days</span>
                </span>
              )}
            </div>

            {/* Campaign Name (Inline editable) */}
            {isEditingName ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="text-lg font-black text-[#15192B] border border-indigo-300 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setNameInput(brief.name);
                      setIsEditingName(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="btn-primary text-xs px-2.5 py-1 font-bold cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(brief.name);
                    setIsEditingName(false);
                  }}
                  className="btn-secondary text-xs px-2.5 py-1 font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group/title pt-1">
                <h1 className="text-xl md:text-2xl font-black text-[#15192B] tracking-tight">
                  {brief.name}
                </h1>
                {onSaveBrief && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    title="Edit campaign name"
                    className="opacity-50 hover:opacity-100 p-1 text-slate-400 hover:text-[#172DC3] transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Product & Duration summary */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600">
              {brief.productOrService && (
                <div className="flex items-center gap-1.5 font-medium">
                  <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Promoted:</span>
                  <strong className="text-slate-900">{brief.productOrService}</strong>
                </div>
              )}

              {brief.startDate && brief.endDate && (
                <div className="flex items-center gap-1.5 font-medium text-slate-500">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{brief.startDate} → {brief.endDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Languages & Platforms Badges in Header */}
          <div className="flex flex-col gap-2 shrink-0 lg:items-end">
            {languagesList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {languagesList.map(renderLanguagePill)}
              </div>
            )}
            {platformsList.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {platformsList.map(renderPlatformPill)}
              </div>
            )}
          </div>
        </div>

        {/* WORKSPACE PRIMARY TABS */}
        <div className="border-t border-slate-100 pt-4 mt-2">
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-[#172DC3] text-[#172DC3] bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>1. Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('strategy')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'strategy'
                  ? 'border-[#172DC3] text-[#172DC3] bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#CB19C2]" />
              <span>2. Strategy & Plan</span>
              {plan && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-bold">
                  Ready
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'calendar'
                  ? 'border-[#172DC3] text-[#172DC3] bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-[#172DC3]" />
              <span>3. Calendar</span>
              {plan?.calendar && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full font-bold">
                  {plan.calendar.length} Content Items
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'review'
                  ? 'border-[#172DC3] text-[#172DC3] bg-indigo-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>4. Content Review</span>
              {scopedAssets.length > 0 && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                  {scopedAssets.length} Items
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW TAB (Authoritative Campaign Brief Facts) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1: Campaign Objective & Authoritative CTA */}
            <div className="card-tier-1 p-5 space-y-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <span>Campaign Objective</span>
              </div>
              <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {brief.objective || 'No explicit objective specified.'}
              </p>
              
              {/* Prominent Authoritative Call To Action */}
              <div className="pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Call To Action (CTA)
                </span>
                <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-200 text-[#172DC3] shadow-2xs">
                  {brief.cta || 'Send us your project idea'}
                </span>
              </div>

              {brief.keyMessage && (
                <div className="pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Key Message
                  </span>
                  <p className="text-xs text-slate-700 italic bg-amber-50/60 border border-amber-200/80 p-2.5 rounded-lg">
                    "{brief.keyMessage}"
                  </p>
                </div>
              )}

              {brief.funnelIntent && (
                <div className="pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Funnel Intent
                  </span>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {brief.funnelIntent}
                  </span>
                </div>
              )}
            </div>

            {/* Card 2: Target Audience & Scope */}
            <div className="card-tier-1 p-5 space-y-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Target Audience & Scope</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Audience Segment
                </span>
                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 border border-blue-200 text-blue-800">
                  {brief.audienceSegment}
                </span>
              </div>

              {/* Target Personas / Groups */}
              {(brief.targetAudiences && brief.targetAudiences.length > 0) || brief.targetAudience ? (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Target Audiences
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {brief.targetAudiences && brief.targetAudiences.length > 0 ? (
                      brief.targetAudiences.map((aud, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100 border border-slate-200 text-slate-800 text-xs px-2.5 py-0.5 rounded-md font-medium"
                        >
                          {aud}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-700 font-medium bg-slate-50 p-2 rounded border border-slate-200 block">
                        {brief.targetAudience}
                      </span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Age & Demographics - Strictly omit for B2B */}
              {brief.audienceSegment !== 'B2B' && (brief.minAge || brief.maxAge || (brief.audienceAge && brief.audienceAge !== 'All ages')) && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Age Group Range
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {brief.minAge && brief.maxAge
                      ? `${brief.minAge} – ${brief.maxAge} Years Old`
                      : brief.audienceAge}
                  </span>
                </div>
              )}

              {/* Audience Notes */}
              {brief.audienceNotes && (
                <div className="pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Audience Notes & Behaviors
                  </span>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {brief.audienceNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Card 3: Promoted Offering */}
            <div className="card-tier-1 p-5 space-y-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Promoted Offering</span>
              </div>

              {brief.productOrService && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Primary Subject
                  </span>
                  <p className="text-xs font-bold text-slate-900 bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-lg">
                    {brief.productOrService}
                  </p>
                </div>
              )}

              {brief.promotionItems && brief.promotionItems.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Catalog / Inline Items ({brief.promotionItems.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {brief.promotionItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="font-semibold text-slate-800 truncate">{item.name}</div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                            item.type === 'Product'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {brief.promotionOffer && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Promotion / Offer Details
                  </span>
                  <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {brief.promotionOffer}
                  </p>
                </div>
              )}
            </div>

            {/* Card 4: Channels & Deliverables */}
            <div className="card-tier-1 p-5 space-y-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Channels & Deliverables</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Target Platforms
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {platformsList.length > 0 ? (
                    platformsList.map(renderPlatformPill)
                  ) : (
                    <span className="text-xs text-slate-400 italic">No platforms configured</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Desired Content Formats
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {brief.desiredFormats && brief.desiredFormats.length > 0 ? (
                    brief.desiredFormats.map((fmt, idx) => (
                      <span
                        key={idx}
                        className="bg-indigo-50 border border-indigo-200 text-[#172DC3] text-xs px-2.5 py-0.5 rounded-md font-semibold"
                      >
                        {fmt}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No format preferences recorded</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Languages
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {languagesList.map(renderLanguagePill)}
                </div>
              </div>
            </div>

            {/* Card 5: Regional Targeting */}
            <div className="card-tier-1 p-5 space-y-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Regional Targeting</span>
              </div>

              {brief.locations && brief.locations.length > 0 ? (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Target Governorates ({brief.locations.length} Selected)
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1">
                    {brief.locations.map((loc, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded-md font-medium"
                      >
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Tunisia — no specific governorate targeting selected</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    National coverage & delivery
                  </div>
                </div>
              )}
            </div>

            {/* Card 6: Tone & Campaign Palette */}
            <div className="card-tier-1 p-5 space-y-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                <Palette className="w-4 h-4 text-pink-600" />
                <span>Tone & Campaign Palette</span>
              </div>

              {/* Sanitized Tone tags */}
              {cleanToneList.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Tone of Voice
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cleanToneList.map((t, idx) => (
                      <span
                        key={idx}
                        className="bg-purple-50 border border-purple-200 text-purple-800 text-xs px-2.5 py-0.5 rounded-md font-semibold"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Palette */}
              {brief.campaignPalette && brief.campaignPalette.length > 0 ? (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Campaign Color Palette ({brief.campaignPalette.length} Swatches)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {brief.campaignPalette.map((color, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-[11px] font-mono shadow-2xs"
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-semibold text-slate-700">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Inherited default Brand Kit primary color palette.
                </p>
              )}
            </div>
          </div>

          {/* Strategic Direction Banner (if present in brief) */}
          {brief.selectedDirection && (
            <div className="card-tier-1 p-5 bg-gradient-to-r from-purple-50/60 via-indigo-50/40 to-white border border-purple-200/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#CB19C2]" />
                  <span>Selected Strategic Direction: {brief.selectedDirection.title}</span>
                </span>
                {brief.selectedDirection.strategicAngle && (
                  <span className="text-[11px] font-semibold text-purple-700 bg-white px-2.5 py-0.5 rounded-full border border-purple-200">
                    Angle: {brief.selectedDirection.strategicAngle}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-700 font-medium">
                {brief.selectedDirection.concept}
              </p>

              <div className="p-3 bg-white/90 rounded-lg border border-purple-100 text-xs">
                <span className="text-[10px] uppercase font-bold text-purple-700 block mb-0.5">
                  Core Message
                </span>
                <p className="font-bold text-[#160857]">"{brief.selectedDirection.coreMessage}"</p>
              </div>

              {brief.selectedDirection.strategicRationale && (
                <p className="text-[11px] text-slate-500 italic">
                  Rationale: {brief.selectedDirection.strategicRationale}
                </p>
              )}
            </div>
          )}

          {/* Bottom Action Row */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-xs text-slate-600">
              Need to modify requirements, adjust languages, or refine assumptions?
            </div>
            <button
              type="button"
              onClick={() => onEditDraft(brief)}
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Campaign Brief</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STRATEGY & PLAN TAB */}
      {/* ========================================================================= */}
      {activeTab === 'strategy' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {!plan ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 max-w-lg mx-auto space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#CB19C2] mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#15192B] text-base">
                No campaign plan has been generated yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                This campaign brief is currently in draft status. Generate strategic directions and build your complete multi-channel plan in the campaign builder.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onEditDraft(brief)}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Continue Editing Campaign & Generate Plan</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Strategic Plan Components (Lock components to preserve during regeneration)
                </h2>
              </div>

              {/* Strategic Components Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Concept & Core Message Card */}
                {(() => {
                  const conceptText = `${plan.concept || ''} ${plan.coreMessage || ''}`;
                  const claimsCheck = detectUnsupportedClaimsInText(conceptText, approvedKnowledgeStrings);
                  const isRequiresConf = claimsCheck.hasUnsupportedClaims || plan.factualStatus === 'requires_confirmation';
                  const isCreative = !isRequiresConf && plan.factualStatus === 'creative';

                  return (
                    <div
                      className={`card-tier-1 p-5 space-y-3 bg-white border border-slate-200 rounded-xl transition duration-200 ${
                        isLocked('concept') ? 'border-2 border-[#172DC3] bg-indigo-50/20 shadow-xs' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#CB19C2]" />
                            <span>Concept & Core Message</span>
                          </span>
                          {isRequiresConf ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Requires Confirmation{claimsCheck.offendingPhrases.length > 0 ? `: ${claimsCheck.offendingPhrases.join(', ')}` : ''}</span>
                            </span>
                          ) : isCreative ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span>Creative</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Grounded</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleLock('concept')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                              isLocked('concept') ? 'bg-[#160857] text-white' : 'btn-secondary'
                            }`}
                          >
                            {isLocked('concept') ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            <span>{isLocked('concept') ? 'Locked' : 'Lock'}</span>
                          </button>
                          {!isLocked('concept') && (
                            <button
                              type="button"
                              onClick={() => handleRegenerateSingle('concept')}
                              disabled={isGenerating}
                              className="btn-secondary px-2.5 py-1 text-xs font-bold flex items-center gap-1 text-[#172DC3] cursor-pointer"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                              <span>Regen</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Concept</span>
                        <p className="text-xs text-slate-800 font-medium mt-0.5 leading-relaxed">{plan.concept}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Core Message</span>
                        <p className="text-xs font-bold text-[#160857] bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 mt-0.5">
                          "{plan.coreMessage}"
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Value Proposition & Content Pillars Card */}
                {(() => {
                  const valueText = `${plan.valueProposition || ''} ${plan.contentPillars.join(' ')}`;
                  const claimsCheck = detectUnsupportedClaimsInText(valueText, approvedKnowledgeStrings);
                  const isRequiresConf = claimsCheck.hasUnsupportedClaims || plan.factualStatus === 'requires_confirmation';
                  const isCreative = !isRequiresConf && plan.factualStatus === 'creative';

                  return (
                    <div
                      className={`card-tier-1 p-5 space-y-3 bg-white border border-slate-200 rounded-xl transition duration-200 ${
                        isLocked('valueProposition') ? 'border-2 border-[#172DC3] bg-indigo-50/20 shadow-xs' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#6344BF]" />
                            <span>Value Prop & Pillars</span>
                          </span>
                          {isRequiresConf ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Requires Confirmation{claimsCheck.offendingPhrases.length > 0 ? `: ${claimsCheck.offendingPhrases.join(', ')}` : ''}</span>
                            </span>
                          ) : isCreative ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              <span>Creative</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Grounded</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleLock('valueProposition')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                              isLocked('valueProposition') ? 'bg-[#160857] text-white' : 'btn-secondary'
                            }`}
                          >
                            {isLocked('valueProposition') ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            <span>{isLocked('valueProposition') ? 'Locked' : 'Lock'}</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Value Proposition</span>
                        <p className="text-xs text-slate-800 font-medium mt-0.5 leading-relaxed">{plan.valueProposition}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Content Pillars</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {plan.contentPillars.map((p, idx) => (
                            <span
                              key={idx}
                              className="bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Designer & Videographer Production Briefs Card */}
                {(() => {
                  const briefsCombinedText = `${plan.designerBrief || ''} ${plan.videographerBrief || ''}`;
                  const claimsCheck = detectUnsupportedClaimsInText(briefsCombinedText, approvedKnowledgeStrings);

                  return (
                    <div
                      className={`card-tier-1 p-5 space-y-3 bg-white border border-slate-200 rounded-xl md:col-span-2 transition duration-200 ${
                        isLocked('creativeBriefs') ? 'border-2 border-[#172DC3] bg-indigo-50/20 shadow-xs' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#172DC3]" />
                            <span>Production & Creative Briefs (Designer & Videographer)</span>
                          </span>
                          {claimsCheck.hasUnsupportedClaims ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Requires Confirmation: {claimsCheck.offendingPhrases.join(', ')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Grounded</span>
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleLock('creativeBriefs')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                            isLocked('creativeBriefs') ? 'bg-[#160857] text-white' : 'btn-secondary'
                          }`}
                        >
                          {isLocked('creativeBriefs') ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          <span>{isLocked('creativeBriefs') ? 'Locked' : 'Lock'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80">
                          <span className="text-xs font-bold text-[#15192B] flex items-center gap-1.5 mb-1">
                            <ImageIcon className="w-3.5 h-3.5 text-[#172DC3]" />
                            <span>3D Designer Brief</span>
                          </span>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">{plan.designerBrief}</p>
                        </div>

                        <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80">
                          <span className="text-xs font-bold text-[#15192B] flex items-center gap-1.5 mb-1">
                            <Film className="w-3.5 h-3.5 text-[#A90CBF]" />
                            <span>Videographer Shot List & Directions</span>
                          </span>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">{plan.videographerBrief}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 4. Recommended Posting Cadence */}
              {plan.recommendedCadence && (
                <div className="card-tier-1 p-5 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/30 border border-indigo-100/80 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#172DC3] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#CB19C2]" />
                      <span>Recommended Posting Cadence ({brief.durationDays} Days)</span>
                    </h3>
                    <span className="text-xs font-bold text-slate-600">
                      Total Primary Posts: <strong className="text-[#15192B]">{plan.recommendedCadence.totalPrimaryPosts}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Reels / Shorts</span>
                      <span className="text-base font-black text-[#15192B]">{plan.recommendedCadence.reels}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Carousels</span>
                      <span className="text-base font-black text-[#15192B]">{plan.recommendedCadence.carousels}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Feed Photos</span>
                      <span className="text-base font-black text-[#15192B]">{plan.recommendedCadence.feedPosts}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Stories</span>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-base font-black text-[#15192B]">{plan.recommendedCadence.stories}</span>
                        <span className="text-[10px] text-slate-500 font-semibold">rec.</span>
                      </div>
                      <span className="text-[9px] font-bold block mt-0.5 text-slate-500">
                        {storyCalendarCount > 0
                          ? `(${storyCalendarCount} Scheduled in Calendar${!brief.desiredFormats?.includes('Story') ? ' • Supporting' : ''})`
                          : `(Not Scheduled in Calendar)`}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 font-medium bg-white/80 p-3 rounded-xl border border-slate-200/60 italic">
                    "{plan.recommendedCadence.rationale}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CALENDAR TAB */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {!plan || !plan.calendar || plan.calendar.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 max-w-lg mx-auto space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-[#15192B] text-base">
                No calendar schedule available
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Content calendar posts are generated as part of the campaign plan. Generate or edit the plan in the builder to populate the schedule.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onEditDraft(brief)}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Open Campaign Builder</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="card-tier-1 p-6 space-y-5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#15192B] flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-[#172DC3]" />
                    <span>Campaign Content Calendar — {plan.calendar.length} Content Items</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {primaryCalendarCount} Primary Scheduled Posts
                    {storyCalendarCount > 0 ? (
                      <span> • {storyCalendarCount} Supporting Stories ({brief.desiredFormats?.includes('Story') ? 'Scheduled' : 'AI Recommended Supporting'})</span>
                    ) : plan.recommendedCadence?.stories ? (
                      <span className="text-slate-400"> • {plan.recommendedCadence.stories} Recommended Supporting Stories (Not Scheduled)</span>
                    ) : null}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Switcher */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setCalendarView('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                        calendarView === 'table' ? 'bg-white text-[#172DC3] shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarView('grid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                        calendarView === 'grid' ? 'bg-white text-[#172DC3] shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>Grid Cards</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CALENDAR TABLE VIEW */}
              {calendarView === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Channel & Format</th>
                        <th className="py-3 px-4">Content / Hook</th>
                        <th className="py-3 px-3 min-w-[140px]">Production Status</th>
                        <th className="py-3 px-3">Concerned Staff</th>
                        <th className="py-3 px-3 text-center">Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {plan.calendar.map((item) => {
                        const isMeta = item.platform.toLowerCase() === 'meta';
                        const isStory = item.format === 'Story';
                        const isSupportingStory = isStory && (item.isRecommendedSupportingFormat || !brief.desiredFormats?.includes('Story'));
                        const currentStatus: ProductionStatus = item.status || 'Planned';

                        return (
                          <tr key={item.id} className="hover:bg-indigo-50/30 transition">
                            {/* 1. Date */}
                            <td className="py-3 px-3 whitespace-nowrap font-mono text-[#15192B] font-bold align-top">
                              {item.date}
                            </td>

                            {/* 2. Channel & Format */}
                            <td className="py-3 px-3 whitespace-nowrap space-y-1 align-top">
                              <div className="font-bold text-[#15192B] flex items-center gap-1.5">
                                {isMeta ? (
                                  <div className="flex items-center gap-1 text-[#172DC3]">
                                    <IconMetaCombined className="h-3.5" />
                                    <span>Meta</span>
                                    <span className="text-[10px] text-slate-400 font-normal">(IG + FB)</span>
                                  </div>
                                ) : item.platform.toLowerCase() === 'instagram' ? (
                                  <div className="flex items-center gap-1">
                                    <IconInstagram className="w-3.5 h-3.5 text-pink-600" />
                                    <span>Instagram</span>
                                  </div>
                                ) : item.platform.toLowerCase() === 'facebook' ? (
                                  <div className="flex items-center gap-1">
                                    <IconFacebook className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Facebook</span>
                                  </div>
                                ) : (
                                  <span>{item.platform}</span>
                                )}
                              </div>

                              <div className="flex flex-col gap-1">
                                <span className={`inline-block self-start px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isStory ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-indigo-50 border border-indigo-100 text-[#172DC3]'
                                }`}>
                                  {item.format}
                                </span>
                                {isSupportingStory && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 self-start">
                                    AI Recommended Supporting Format
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 3. Content / Hook */}
                            <td className="py-3 px-4 max-w-md align-top space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#15192B]">{item.topic}</span>
                                {item.factualStatus === 'requires_confirmation' && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1 shrink-0">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    <span>Requires confirmation</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#160857] font-semibold italic">
                                Hook: "{item.hook}"
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2">{item.caption}</p>
                              <div className="text-[10px] text-slate-500 font-semibold pt-0.5">
                                CTA: <span className="text-slate-800 font-bold">{item.cta || brief.cta || 'Send us your project idea'}</span>
                              </div>
                            </td>

                            {/* 4. Production Status (Editable Dropdown) */}
                            <td className="py-3 px-3 align-top whitespace-nowrap">
                              <div className="relative">
                                <select
                                  value={currentStatus}
                                  onChange={(e) => handleUpdateItemStatus(item.id, e.target.value as ProductionStatus)}
                                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border appearance-none pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#172DC3] ${getProductionStatusBadgeStyle(
                                    currentStatus
                                  )}`}
                                >
                                  <option value="Planned">Planned</option>
                                  <option value="In Production">In Production</option>
                                  <option value="Ready for Review">Ready for Review</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Published">Published</option>
                                </select>
                                <ChevronDown className="w-3 h-3 absolute right-2 top-2.5 text-slate-500 pointer-events-none" />
                              </div>
                            </td>

                            {/* 5. Concerned Staff */}
                            <td className="py-3 px-3 min-w-[170px] align-top">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap gap-1">
                                  {(item.concernedPeopleIds || []).map((staffId) => {
                                    const staff = staffMembers.find((s) => s.id === staffId);
                                    if (!staff) return null;
                                    return (
                                      <div
                                        key={staff.id}
                                        className="inline-flex items-center gap-1 bg-indigo-50/90 hover:bg-indigo-100/90 text-[#172DC3] border border-indigo-200/90 text-[10px] pl-1.5 pr-1 py-0.5 rounded-md font-bold transition shadow-2xs"
                                      >
                                        <StaffProfilePopover staff={staff}>
                                          <span className="cursor-pointer hover:underline flex items-center gap-1">
                                            <span>{staff.name}</span>
                                            <span className="text-[9px] text-slate-500 font-semibold border-l border-indigo-200 pl-1 ml-0.5">
                                              {staff.role}
                                            </span>
                                          </span>
                                        </StaffProfilePopover>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAssignStaff(item.id, staff.id);
                                          }}
                                          className="text-slate-400 hover:text-rose-600 rounded p-0.5 transition ml-0.5 cursor-pointer"
                                          title={`Unassign ${staff.name}`}
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>

                                <select
                                  onChange={(e) => {
                                    if (e.target.value) handleAssignStaff(item.id, e.target.value);
                                    e.target.value = '';
                                  }}
                                  className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-full font-medium focus:outline-none focus:ring-1 focus:ring-[#172DC3]/30 cursor-pointer"
                                >
                                  <option value="">+ Assign Staff Member...</option>
                                  {staffMembers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} - {s.role}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* 6. Review Action */}
                            <td className="py-3 px-3 text-center align-top">
                              <button
                                type="button"
                                onClick={() => handleInspectCalendarItem(item)}
                                className="btn-primary px-3 py-1.5 text-xs font-bold cursor-pointer"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* CALENDAR GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plan.calendar.map((item) => {
                    const isMeta = item.platform.toLowerCase() === 'meta';
                    const isStory = item.format === 'Story';
                    const isSupportingStory = isStory && (item.isRecommendedSupportingFormat || !brief.desiredFormats?.includes('Story'));
                    const currentStatus: ProductionStatus = item.status || 'Planned';

                    return (
                      <div
                        key={item.id}
                        className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 hover:border-[#172DC3]/40 transition duration-200 space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-[#15192B]">{item.date}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-[#172DC3] flex items-center gap-1">
                                {isMeta && <IconMetaCombined className="h-3" />}
                                <span>{item.platform} • {item.format}</span>
                              </span>
                            </div>
                          </div>

                          {isSupportingStory && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-block">
                              AI Recommended Supporting Format
                            </span>
                          )}

                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-[#15192B] text-sm">{item.topic}</h4>
                            {item.factualStatus === 'requires_confirmation' && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1 shrink-0">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Confirm</span>
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-[#160857] font-semibold italic">"{item.hook}"</p>
                          
                          <p className="text-xs text-slate-600 line-clamp-3 bg-white p-2.5 rounded-xl border border-slate-200/80 font-medium">
                            {item.caption}
                          </p>

                          <div className="text-[10px] text-slate-500 font-semibold">
                            CTA: <span className="text-slate-800 font-bold">{item.cta || brief.cta || 'Send us your project idea'}</span>
                          </div>

                          {/* Production Status in Card */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
                            <div className="relative">
                              <select
                                value={currentStatus}
                                onChange={(e) => handleUpdateItemStatus(item.id, e.target.value as ProductionStatus)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border appearance-none pr-5 cursor-pointer focus:outline-none ${getProductionStatusBadgeStyle(
                                  currentStatus
                                )}`}
                              >
                                <option value="Planned">Planned</option>
                                <option value="In Production">In Production</option>
                                <option value="Ready for Review">Ready for Review</option>
                                <option value="Approved">Approved</option>
                                <option value="Published">Published</option>
                              </select>
                              <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1.5 text-slate-500 pointer-events-none" />
                            </div>
                          </div>

                          {/* Assigned Team Members in Card View */}
                          {(item.concernedPeopleIds || []).length > 0 && (
                            <div className="pt-1.5 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                Assigned Team:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {(item.concernedPeopleIds || []).map((staffId) => {
                                  const staff = staffMembers.find((s) => s.id === staffId);
                                  if (!staff) return null;
                                  return (
                                    <StaffProfilePopover key={staff.id} staff={staff}>
                                      <span className="inline-flex items-center gap-1 bg-white hover:bg-indigo-50/80 text-[#172DC3] border border-slate-200 hover:border-indigo-200 text-[10px] px-2 py-0.5 rounded-md font-bold transition cursor-pointer shadow-2xs">
                                        <span>{staff.name}</span>
                                        <span className="text-[9px] text-slate-400 font-semibold">({staff.role})</span>
                                      </span>
                                    </StaffProfilePopover>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <div className="text-[10px] text-slate-500 font-semibold">
                            Deadline: {item.productionDeadline || '3 days prior'}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleInspectCalendarItem(item)}
                            className="btn-primary px-3 py-1 text-xs font-bold cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONTENT REVIEW TAB (Integrated inside Campaign Workspace) */}
      {/* ========================================================================= */}
      {activeTab === 'review' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <ContentReview
            assets={scopedAssets}
            staffMembers={staffMembers}
            onSaveAsset={onSaveAsset || (async () => {})}
            onSaveFeedbackMemory={onSaveFeedbackMemory || (async () => {})}
            selectedAssetId={inspectedAssetId}
            activeBrief={brief}
            activePlan={plan}
            brandKit={brandKit}
            products={products}
            onBackToCalendar={() => setActiveTab('calendar')}
          />
        </div>
      )}
    </div>
  );
};
