import React, { useState, useEffect } from 'react';
import {
  ContentAsset,
  ReviewComment,
  FeedbackMemoryItem,
  FeedbackType,
  FeedbackSource,
  StaffMember,
  CampaignBrief,
  CampaignPlan as CampaignPlanType,
  ProductService,
  BrandKit,
  ScriptSegment,
  CarouselSlide,
  StoryFrame,
  FactualStatus,
} from '../types';
import {
  CheckCircle2,
  History,
  MessageSquare,
  Lock,
  Unlock,
  Save,
  Send,
  Sparkles,
  ArrowLeft,
  Film,
  Image as ImageIcon,
  Layers,
  AlertTriangle,
  ShieldCheck,
  Check,
  Clock,
  Users,
  Eye,
  Hash,
  X,
} from 'lucide-react';
import { StaffProfilePopover } from '../components/StaffProfilePopover';
import { ReelScriptEditor } from '../components/campaign/ReelScriptEditor';
import { CarouselSlideEditor } from '../components/campaign/CarouselSlideEditor';
import { StoryFrameEditor } from '../components/campaign/StoryFrameEditor';
import {
  IconMetaCombined,
  IconInstagram,
  IconFacebook,
  IconTikTok,
} from '../components/campaign/CampaignIcons';

interface ContentReviewProps {
  assets: ContentAsset[];
  staffMembers: StaffMember[];
  onSaveAsset: (updatedAsset: ContentAsset) => Promise<void>;
  onSaveFeedbackMemory: (item: FeedbackMemoryItem) => Promise<void>;
  selectedAssetId?: string;
  activeBrief?: CampaignBrief | null;
  activePlan?: CampaignPlanType | null;
  brandKit?: BrandKit | null;
  products?: ProductService[];
  onBackToCalendar?: () => void;
}

export const ContentReview: React.FC<ContentReviewProps> = ({
  assets,
  staffMembers,
  onSaveAsset,
  onSaveFeedbackMemory,
  selectedAssetId,
  activeBrief,
  activePlan,
  brandKit,
  products = [],
  onBackToCalendar,
}) => {
  // Scoped strictly to active plan version items
  const relevantAssets = React.useMemo(() => {
    if (activeBrief) {
      if (activeBrief.activePlanVersionId) {
        const versionFiltered = assets.filter(
          (a) => a.campaignId === activeBrief.id && (!a.planVersionId || a.planVersionId === activeBrief.activePlanVersionId)
        );
        if (versionFiltered.length > 0) return versionFiltered;
      }
      const filtered = assets.filter((a) => a.campaignId === activeBrief.id);
      if (filtered.length > 0) return filtered;
    }
    return assets;
  }, [assets, activeBrief?.id, activeBrief?.activePlanVersionId]);

  const currentAssetList = relevantAssets.length > 0 ? relevantAssets : assets;

  const [currentAssetId, setCurrentAssetId] = useState<string>(
    selectedAssetId || currentAssetList[0]?.id || ''
  );

  useEffect(() => {
    if (selectedAssetId) {
      setCurrentAssetId(selectedAssetId);
    } else if (currentAssetList.length > 0 && !currentAssetList.some((a) => a.id === currentAssetId)) {
      setCurrentAssetId(currentAssetList[0].id);
    }
  }, [selectedAssetId, activeBrief?.id, currentAssetList.length]);

  const activeAsset = currentAssetList.find((a) => a.id === currentAssetId) || currentAssetList[0];

  // Form state
  const [caption, setCaption] = useState(activeAsset?.caption || '');
  const [script, setScript] = useState(activeAsset?.scriptOrStoryboard || '');
  const [hook, setHook] = useState(activeAsset?.hook || '');
  const [cta, setCta] = useState(activeAsset?.cta || '');
  const [hashtags, setHashtags] = useState<string[]>(activeAsset?.hashtags || []);
  const [status, setStatus] = useState<ContentAsset['status']>(activeAsset?.status || 'Needs Review');
  const [isLocked, setIsLocked] = useState(activeAsset?.isLocked || false);
  const [scriptSegments, setScriptSegments] = useState<ScriptSegment[]>(activeAsset?.scriptSegments || []);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>(activeAsset?.carouselSlides || []);
  const [storyFrames, setStoryFrames] = useState<StoryFrame[]>(activeAsset?.storyFrames || []);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState<number | undefined>(activeAsset?.totalDurationSeconds);
  const [factualStatus, setFactualStatus] = useState<FactualStatus | undefined>(activeAsset?.factualStatus);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [scriptGenerationError, setScriptGenerationError] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // New Comment State
  const [commentText, setCommentText] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState(staffMembers[0]?.id || '');
  const [saveCommentAsMemory, setSaveCommentAsMemory] = useState(false);

  // Feedback Memory Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackInstruction, setFeedbackInstruction] = useState('');
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('Positive Preference');
  const [feedbackIsGlobal, setFeedbackIsGlobal] = useState(false);
  const [feedbackFormat, setFeedbackFormat] = useState(activeAsset?.format || 'All Formats');
  const [feedbackAudience, setFeedbackAudience] = useState(activeBrief?.audienceSegment || 'All Audiences');
  const [feedbackPlatform, setFeedbackPlatform] = useState(activeAsset?.platform || 'All Platforms');
  const [feedbackLanguages, setFeedbackLanguages] = useState(activeBrief?.language || 'Tunisian Darija & English');
  const [feedbackStaffId, setFeedbackStaffId] = useState(staffMembers[0]?.id || '');
  const [feedbackSavedToast, setFeedbackSavedToast] = useState(false);

  // Sync state when active asset changes
  useEffect(() => {
    if (activeAsset) {
      setCaption(activeAsset.caption || '');
      setScript(activeAsset.scriptOrStoryboard || '');
      setHook(activeAsset.hook || '');
      setCta(activeAsset.cta || '');
      setHashtags(activeAsset.hashtags || []);
      setStatus(activeAsset.status || 'Needs Review');
      setIsLocked(activeAsset.isLocked || false);
      setScriptSegments(activeAsset.scriptSegments || []);
      setCarouselSlides(activeAsset.carouselSlides || []);
      setStoryFrames(activeAsset.storyFrames || []);
      setTotalDurationSeconds(activeAsset.totalDurationSeconds);
      setFactualStatus(activeAsset.factualStatus);
      setScriptGenerationError(null);
      setSaveSuccessNotice(false);
    }
  }, [activeAsset?.id]);

  if (!activeAsset) {
    return (
      <div className="p-12 text-center bg-white min-h-[60vh] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300">
        <CheckCircle2 className="w-12 h-12 text-slate-400 mb-2" />
        <h3 className="font-bold text-[#15192B] text-base">No Content Items in Active Plan</h3>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Generate a campaign plan in the strategy tab to review and edit production scripts and post copies.
        </p>
        {onBackToCalendar && (
          <button
            type="button"
            onClick={onBackToCalendar}
            className="btn-primary mt-4 text-xs px-4 py-2 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Calendar</span>
          </button>
        )}
      </div>
    );
  }

  const isReelOrVideo =
    activeAsset.format.toLowerCase().includes('reel') ||
    activeAsset.format.toLowerCase().includes('video');

  const isCarousel =
    activeAsset.format.toLowerCase().includes('carousel');

  const isStory =
    activeAsset.format.toLowerCase().includes('story');

  const parseSec = (ts: string): number => {
    if (!ts) return 0;
    const parts = ts.trim().split(':');
    if (parts.length === 2) {
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }
    const num = parseInt(ts, 10);
    return isNaN(num) ? 0 : num;
  };

  const handleSaveEdits = async () => {
    // Derive accurate duration from last segment if Reel
    let derivedDuration = totalDurationSeconds;
    if (isReelOrVideo && scriptSegments.length > 0) {
      const last = scriptSegments[scriptSegments.length - 1];
      const parsedEnd = parseSec(last.endTime);
      if (parsedEnd > 0) derivedDuration = parsedEnd;
    }

    const nextVersionNumber = (activeAsset.versions?.length || 0) + 1;
    const newVersion = {
      versionNumber: nextVersionNumber,
      hook,
      caption,
      scriptOrStoryboard: script,
      scriptSegments: isReelOrVideo ? scriptSegments : undefined,
      carouselSlides: isCarousel ? carouselSlides : undefined,
      storyFrames: isStory ? storyFrames : undefined,
      cta,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Marketing Manager',
      changeSummary: 'Human copy edit & structured content refinement',
    };

    const updated: ContentAsset = {
      ...activeAsset,
      hook,
      caption,
      scriptOrStoryboard: script,
      scriptSegments: isReelOrVideo ? scriptSegments : activeAsset.scriptSegments,
      carouselSlides: isCarousel ? carouselSlides : activeAsset.carouselSlides,
      storyFrames: isStory ? storyFrames : activeAsset.storyFrames,
      totalDurationSeconds: isReelOrVideo ? derivedDuration : activeAsset.totalDurationSeconds,
      cta,
      hashtags,
      status,
      isLocked,
      factualStatus,
      versions: [newVersion, ...(activeAsset.versions || [])],
      updatedAt: new Date().toISOString(),
    };

    await onSaveAsset(updated);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3000);
  };

  const handleGenerateDetailedScript = async () => {
    if (isLocked) {
      console.warn('[Script Generation Guard] Content item is locked. AI regeneration prevented.');
      return;
    }

    setIsGeneratingScript(true);
    setScriptGenerationError(null);

    try {
      const response = await fetch('/api/gemini/reel-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: activeBrief?.name || activeAsset.campaignName,
          objective: activePlan?.concept || activeBrief?.keyMessage || '',
          audience: `${activeBrief?.audienceSegment || ''} - ${activeBrief?.targetAudience || ''}`,
          languages: activeBrief?.languages || activeBrief?.language || ['Tunisian Darija', 'English'],
          platform: activeAsset.platform,
          tone: activeBrief?.campaignToneList || activeBrief?.campaignTone || ['Professional & Technical'],
          contentPillar: activePlan?.contentPillars?.[0] || '',
          strategicDirection: activePlan?.selectedDirection?.title || '',
          topic: activeAsset.title,
          hook: hook || activeAsset.hook,
          caption: caption || activeAsset.caption,
          cta: cta || activeAsset.cta,
          creativeDirectives: activePlan?.videographerBrief || activePlan?.visualDirection || '',
          approvedProducts: products.filter(
            (p) =>
              p.id === activeBrief?.productId ||
              (activeBrief?.selectedProductIds || []).includes(p.id)
          ),
          currentScriptText: script || activeAsset.scriptOrStoryboard || '',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || `Server returned error (${response.status})`;
        setScriptGenerationError(errorMsg);
        return;
      }

      if (result.scriptSegments && result.scriptSegments.length > 0) {
        // Derive duration from final segment end timestamp
        const lastSeg = result.scriptSegments[result.scriptSegments.length - 1];
        const derivedSec = lastSeg ? parseSec(lastSeg.endTime) : 0;
        const effectiveSec = derivedSec > 0 ? derivedSec : result.totalDurationSeconds || 20;

        setScriptSegments(result.scriptSegments);
        setTotalDurationSeconds(effectiveSec);
        if (result.factualStatus) {
          setFactualStatus(result.factualStatus);
        }

        // If previous status was Approved, transition back to Needs Review for human verification
        const newStatus = status === 'Approved' ? 'Needs Review' : status;
        if (status === 'Approved') {
          setStatus('Needs Review');
        }

        // Auto snapshot & save
        const nextVersionNumber = (activeAsset.versions?.length || 0) + 1;
        const newVersion = {
          versionNumber: nextVersionNumber,
          hook,
          caption,
          scriptOrStoryboard: script,
          scriptSegments: result.scriptSegments,
          cta,
          updatedAt: new Date().toISOString(),
          updatedBy: 'AI Script Generator',
          changeSummary: 'Structured timestamped Reel script generated',
        };

        const updated: ContentAsset = {
          ...activeAsset,
          hook,
          caption,
          scriptOrStoryboard: script,
          scriptSegments: result.scriptSegments,
          totalDurationSeconds: effectiveSec,
          cta,
          status: newStatus,
          factualStatus: result.factualStatus || activeAsset.factualStatus,
          versions: [newVersion, ...(activeAsset.versions || [])],
          updatedAt: new Date().toISOString(),
        };

        await onSaveAsset(updated);
      }
    } catch (err: any) {
      console.error('Failed to generate detailed Reel script:', err);
      setScriptGenerationError(err.message || 'Failed to generate structured script. Your existing script has been preserved.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleGenerateCarouselSlides = async () => {
    if (isLocked) {
      console.warn('[Carousel Generation Guard] Content item is locked. AI regeneration prevented.');
      return;
    }

    setIsGeneratingCarousel(true);
    setScriptGenerationError(null);

    try {
      const response = await fetch('/api/gemini/carousel-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: activeBrief?.name || activeAsset.campaignName,
          objective: activePlan?.concept || activeBrief?.keyMessage || '',
          audience: `${activeBrief?.audienceSegment || ''} - ${activeBrief?.targetAudience || ''}`,
          languages: activeBrief?.languages || activeBrief?.language || ['Tunisian Darija', 'English'],
          platform: activeAsset.platform,
          tone: activeBrief?.campaignToneList || activeBrief?.campaignTone || ['Professional & Educational'],
          contentPillar: activePlan?.contentPillars?.[0] || '',
          strategicDirection: activePlan?.selectedDirection?.title || '',
          topic: activeAsset.title,
          hook: hook || activeAsset.hook,
          caption: caption || activeAsset.caption,
          cta: cta || activeAsset.cta,
          creativeDirectives: activePlan?.designerBrief || activePlan?.visualDirection || '',
          approvedProducts: products.filter(
            (p) =>
              p.id === activeBrief?.productId ||
              (activeBrief?.selectedProductIds || []).includes(p.id)
          ),
          currentNotes: activeAsset.visualDirection || activeAsset.creativeBrief || '',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || `Server returned error (${response.status})`;
        setScriptGenerationError(errorMsg);
        return;
      }

      if (result.carouselSlides && result.carouselSlides.length > 0) {
        setCarouselSlides(result.carouselSlides);
        if (result.factualStatus) {
          setFactualStatus(result.factualStatus);
        }

        // If previous status was Approved, transition back to Needs Review for human verification
        const newStatus = status === 'Approved' ? 'Needs Review' : status;
        if (status === 'Approved') {
          setStatus('Needs Review');
        }

        // Auto snapshot & save
        const nextVersionNumber = (activeAsset.versions?.length || 0) + 1;
        const newVersion = {
          versionNumber: nextVersionNumber,
          hook,
          caption,
          scriptOrStoryboard: script,
          carouselSlides: result.carouselSlides,
          cta,
          updatedAt: new Date().toISOString(),
          updatedBy: 'AI Carousel Generator',
          changeSummary: 'Structured slide-by-slide Carousel generated',
        };

        const updated: ContentAsset = {
          ...activeAsset,
          hook,
          caption,
          scriptOrStoryboard: script,
          carouselSlides: result.carouselSlides,
          cta,
          status: newStatus,
          factualStatus: result.factualStatus || activeAsset.factualStatus,
          versions: [newVersion, ...(activeAsset.versions || [])],
          updatedAt: new Date().toISOString(),
        };

        await onSaveAsset(updated);
      }
    } catch (err: any) {
      console.error('Failed to generate Carousel slides:', err);
      setScriptGenerationError(err.message || 'Failed to generate structured slides. Your existing content has been preserved.');
    } finally {
      setIsGeneratingCarousel(false);
    }
  };

  const handleGenerateStoryFrames = async () => {
    if (isLocked) {
      console.warn('[Story Generation Guard] Content item is locked. AI regeneration prevented.');
      return;
    }

    setIsGeneratingStory(true);
    setScriptGenerationError(null);

    try {
      const response = await fetch('/api/gemini/story-frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: activeBrief?.name || activeAsset.campaignName,
          objective: activePlan?.concept || activeBrief?.keyMessage || '',
          audience: `${activeBrief?.audienceSegment || ''} - ${activeBrief?.targetAudience || ''}`,
          languages: activeBrief?.languages || activeBrief?.language || ['Tunisian Darija', 'English'],
          platform: activeAsset.platform,
          tone: activeBrief?.campaignToneList || activeBrief?.campaignTone || ['Casual & Direct'],
          contentPillar: activePlan?.contentPillars?.[0] || '',
          strategicDirection: activePlan?.selectedDirection?.title || '',
          topic: activeAsset.title,
          hook: hook || activeAsset.hook,
          caption: caption || activeAsset.caption,
          cta: cta || activeAsset.cta,
          creativeDirectives: activePlan?.visualDirection || '',
          approvedProducts: products.filter(
            (p) =>
              p.id === activeBrief?.productId ||
              (activeBrief?.selectedProductIds || []).includes(p.id)
          ),
          currentNotes: activeAsset.visualDirection || activeAsset.creativeBrief || '',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || `Server returned error (${response.status})`;
        setScriptGenerationError(errorMsg);
        return;
      }

      if (result.storyFrames && result.storyFrames.length > 0) {
        setStoryFrames(result.storyFrames);
        if (result.factualStatus) {
          setFactualStatus(result.factualStatus);
        }

        // If previous status was Approved, transition back to Needs Review for human verification
        const newStatus = status === 'Approved' ? 'Needs Review' : status;
        if (status === 'Approved') {
          setStatus('Needs Review');
        }

        // Auto snapshot & save
        const nextVersionNumber = (activeAsset.versions?.length || 0) + 1;
        const newVersion = {
          versionNumber: nextVersionNumber,
          hook,
          caption,
          scriptOrStoryboard: script,
          storyFrames: result.storyFrames,
          cta,
          updatedAt: new Date().toISOString(),
          updatedBy: 'AI Story Generator',
          changeSummary: 'Structured vertical Story frames generated',
        };

        const updated: ContentAsset = {
          ...activeAsset,
          hook,
          caption,
          scriptOrStoryboard: script,
          storyFrames: result.storyFrames,
          cta,
          status: newStatus,
          factualStatus: result.factualStatus || activeAsset.factualStatus,
          versions: [newVersion, ...(activeAsset.versions || [])],
          updatedAt: new Date().toISOString(),
        };

        await onSaveAsset(updated);
      }
    } catch (err: any) {
      console.error('Failed to generate Story frames:', err);
      setScriptGenerationError(err.message || 'Failed to generate structured story frames. Your existing content has been preserved.');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleOpenFeedbackModal = (presetInstruction?: string, presetType?: FeedbackType) => {
    setFeedbackInstruction(
      presetInstruction ||
        (caption !== activeAsset?.caption && caption.trim()
          ? `Prefer revised style: "${caption.slice(0, 140)}..."`
          : '')
    );
    setFeedbackType(
      presetType ||
        (status === 'Changes Requested'
          ? 'Correction'
          : status === 'Approved'
          ? 'Positive Preference'
          : 'Brand / Style Rule')
    );
    setFeedbackIsGlobal(false);
    setFeedbackFormat(activeAsset?.format || 'All Formats');
    setFeedbackAudience(activeBrief?.audienceSegment || 'All Audiences');
    setFeedbackPlatform(activeAsset?.platform || 'All Platforms');
    setFeedbackLanguages(activeBrief?.language || 'Tunisian Darija & English');
    setFeedbackStaffId(selectedStaffId || staffMembers[0]?.id || '');
    setIsFeedbackModalOpen(true);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    const author = staffMembers.find((s) => s.id === selectedStaffId) || staffMembers[0];

    const newComment: ReviewComment = {
      id: `comment_${Date.now()}`,
      assetId: activeAsset.id,
      authorName: author.name,
      authorRole: author.role,
      text: commentText,
      createdAt: new Date().toISOString(),
    };

    const updated: ContentAsset = {
      ...activeAsset,
      comments: [newComment, ...(activeAsset.comments || [])],
    };

    await onSaveAsset(updated);

    // If checkbox to save comment as reusable AI preference was checked:
    if (saveCommentAsMemory) {
      const memoryItem: FeedbackMemoryItem = {
        id: `fb_${Date.now()}`,
        instruction: commentText.trim(),
        feedbackType: 'Correction',
        scope: {
          format: activeAsset.format,
          platform: activeAsset.platform,
          audienceSegment: activeBrief?.audienceSegment,
          languages: activeBrief?.languages,
        },
        format: activeAsset.format,
        platform: activeAsset.platform,
        audienceSegment: activeBrief?.audienceSegment,
        languages: activeBrief?.languages,
        campaignId: activeBrief?.id,
        campaignName: activeBrief?.name,
        contentItemId: activeAsset.id,
        source: 'Team Comment',
        authorStaffId: author?.id,
        authorName: author?.name,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await onSaveFeedbackMemory(memoryItem);
      setFeedbackSavedToast(true);
      setTimeout(() => setFeedbackSavedToast(false), 4000);
      setSaveCommentAsMemory(false);
    }

    setCommentText('');
  };

  const handleSaveFeedbackMemory = async () => {
    if (!feedbackInstruction.trim()) return;

    const author = staffMembers.find((s) => s.id === feedbackStaffId);
    const langArray = feedbackLanguages
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const memoryItem: FeedbackMemoryItem = {
      id: `fb_${Date.now()}`,
      instruction: feedbackInstruction.trim(),
      feedbackType,
      scope: {
        format: feedbackIsGlobal || feedbackFormat === 'All Formats' ? undefined : feedbackFormat,
        platform: feedbackIsGlobal || feedbackPlatform === 'All Platforms' ? undefined : feedbackPlatform,
        audienceSegment: feedbackIsGlobal || feedbackAudience === 'All Audiences' ? undefined : feedbackAudience,
        languages: feedbackIsGlobal || langArray.length === 0 ? undefined : langArray,
        isGlobal: feedbackIsGlobal,
      },
      format: feedbackIsGlobal || feedbackFormat === 'All Formats' ? undefined : feedbackFormat,
      platform: feedbackIsGlobal || feedbackPlatform === 'All Platforms' ? undefined : feedbackPlatform,
      audienceSegment: feedbackIsGlobal || feedbackAudience === 'All Audiences' ? undefined : feedbackAudience,
      languages: feedbackIsGlobal || langArray.length === 0 ? undefined : langArray,
      campaignId: activeBrief?.id,
      campaignName: activeBrief?.name,
      contentItemId: activeAsset.id,
      source: 'Content Review',
      authorStaffId: author?.id,
      authorName: author?.name,
      originalGeneratedContent: activeAsset.caption,
      humanEditedContent: caption !== activeAsset.caption ? caption : undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await onSaveFeedbackMemory(memoryItem);
    setIsFeedbackModalOpen(false);
    setFeedbackInstruction('');
    setFeedbackSavedToast(true);
    setTimeout(() => setFeedbackSavedToast(false), 4000);
  };

  return (
    <div className="space-y-6" id="content-review-workspace">
      {/* Top Header / Back Navigation */}
      {onBackToCalendar && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToCalendar}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-[#172DC3] bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-200 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← Back to Calendar</span>
          </button>

          <div className="text-xs text-slate-500 font-medium">
            Active Campaign Item: <strong className="text-slate-800">{activeAsset.scheduledDate}</strong>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Content Items Queue Selector */}
        <div className="card-tier-1 p-4 space-y-3 bg-white border border-slate-200 shadow-xs h-fit">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-black uppercase tracking-wider text-[#15192B]">
              Active Plan Items ({currentAssetList.length})
            </span>
          </div>

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {currentAssetList.map((ast) => {
              const isSel = ast.id === activeAsset.id;
              const isReel = ast.format.toLowerCase().includes('reel') || ast.format.toLowerCase().includes('video');
              const isMeta = ast.platform.toLowerCase() === 'meta';

              return (
                <button
                  key={ast.id}
                  type="button"
                  onClick={() => setCurrentAssetId(ast.id)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all duration-150 cursor-pointer ${
                    isSel
                      ? 'border-[#172DC3] bg-indigo-50/70 shadow-xs font-bold ring-1 ring-[#172DC3]/20'
                      : 'border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[#15192B] mb-1.5 gap-2">
                    <span className="truncate flex items-center gap-1.5">
                      {isReel ? <Film className="w-3.5 h-3.5 text-[#172DC3] shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 text-pink-600 shrink-0" />}
                      <span className="truncate">{ast.title || ast.hook}</span>
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 ${
                        ast.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {ast.status || 'Needs Review'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      {isMeta && <IconMetaCombined className="h-3" />}
                      <span>{ast.platform} • {ast.format}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{ast.scheduledDate}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Main Copy & Video Script Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card-tier-1 p-6 space-y-5 bg-white border border-slate-200 shadow-xs">
            {/* Header / Meta Bar */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-[#172DC3] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    {activeAsset.platform.toLowerCase() === 'meta' && <IconMetaCombined className="h-3" />}
                    <span>{activeAsset.platform} • {activeAsset.format}</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-500">
                    Scheduled: {activeAsset.scheduledDate}
                  </span>
                  {activeAsset.isLocked && (
                    <span className="text-[10px] font-bold bg-[#160857] text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-black text-[#15192B]">{activeAsset.title}</h2>
              </div>

              {/* Approval & Lock Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLocked(!isLocked)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    isLocked ? 'bg-[#160857] text-white' : 'btn-secondary'
                  }`}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{isLocked ? 'Locked' : 'Lock Output'}</span>
                </button>

                {/* Human Approval Status Selector */}
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:outline-none transition cursor-pointer ${
                    status === 'Approved'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  <option value="Draft">Draft</option>
                  <option value="Needs Review">Needs Review</option>
                  <option value="Changes Requested">Changes Requested</option>
                  <option value="Approved">✓ Approved by Human</option>
                </select>
              </div>
            </div>

            {/* Assigned Staff Banner if available */}
            {(activeAsset.concernedPeopleIds || []).length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <Users className="w-4 h-4 text-[#172DC3] shrink-0" />
                <span className="font-bold text-slate-700 shrink-0">Assigned Team:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(activeAsset.concernedPeopleIds || []).map((staffId) => {
                    const staff = staffMembers.find((s) => s.id === staffId);
                    if (!staff) return null;
                    return (
                      <StaffProfilePopover key={staff.id} staff={staff}>
                        <span className="inline-flex items-center gap-1 bg-white text-[#172DC3] border border-slate-200 text-[11px] px-2 py-0.5 rounded-md font-bold transition hover:border-indigo-300 cursor-pointer shadow-2xs">
                          <span>{staff.name}</span>
                          <span className="text-[10px] text-slate-500 font-normal">({staff.role})</span>
                        </span>
                      </StaffProfilePopover>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 1. Hook Editor */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Hook / Opening Line
              </label>
              <input
                type="text"
                value={hook}
                disabled={isLocked}
                onChange={(e) => setHook(e.target.value)}
                placeholder="Opening hook..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#15192B] focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition"
              />
            </div>

            {/* Script Generation Error Notification Banner */}
            {scriptGenerationError && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-2.5 text-xs text-amber-900 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-950">Script Generation Notice</span>
                    <span className="text-amber-800 text-[11px] font-medium leading-relaxed">
                      {scriptGenerationError}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScriptGenerationError(null)}
                  className="text-amber-600 hover:text-amber-900 p-1 rounded hover:bg-amber-100/60 transition cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 2. Structured Content Editors */}
            {isReelOrVideo && (
              <ReelScriptEditor
                segments={scriptSegments}
                legacyScriptText={script}
                totalDurationSeconds={totalDurationSeconds}
                onChangeSegments={(updatedSegments, duration) => {
                  setScriptSegments(updatedSegments);
                  if (duration) setTotalDurationSeconds(duration);
                }}
                onGenerateDetailedScript={handleGenerateDetailedScript}
                isGeneratingScript={isGeneratingScript}
                isLocked={isLocked}
                factualStatus={factualStatus}
              />
            )}

            {isCarousel && (
              <CarouselSlideEditor
                slides={carouselSlides}
                legacyCaptionText={caption}
                onChangeSlides={(updatedSlides) => {
                  setCarouselSlides(updatedSlides);
                }}
                onGenerateSlides={handleGenerateCarouselSlides}
                isGeneratingSlides={isGeneratingCarousel}
                isLocked={isLocked}
                factualStatus={factualStatus}
              />
            )}

            {isStory && (
              <StoryFrameEditor
                frames={storyFrames}
                legacyStoryText={script || caption}
                onChangeFrames={(updatedFrames) => {
                  setStoryFrames(updatedFrames);
                }}
                onGenerateFrames={handleGenerateStoryFrames}
                isGeneratingFrames={isGeneratingStory}
                isLocked={isLocked}
                factualStatus={factualStatus}
              />
            )}

            {/* 3. Caption Copy Editor (For standard feed posts, reels/videos, and formats without dedicated structured editors) */}
            {!isCarousel && !isStory && (
              <div>
                <label className="block text-xs font-bold text-[#15192B] mb-1">
                  Caption Copy (Tunisian Darija / English)
                </label>
                <textarea
                  rows={5}
                  value={caption}
                  disabled={isLocked}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write caption copy..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition"
                />
              </div>
            )}

            {/* Optional Feed Caption for Carousels (Allows accompanying post caption alongside the slides) */}
            {isCarousel && (
              <div>
                <label className="block text-xs font-bold text-[#15192B] mb-1 flex items-center justify-between">
                  <span>Feed Caption & Intro (Accompanying Post Body)</span>
                  <span className="text-[10px] font-normal text-slate-400">Published with carousel post</span>
                </label>
                <textarea
                  rows={3}
                  value={caption}
                  disabled={isLocked}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Accompanying caption copy for carousel post..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition"
                />
              </div>
            )}

            {/* 4. Call to Action (CTA) */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Call to Action (CTA)
              </label>
              <input
                type="text"
                value={cta}
                disabled={isLocked}
                onChange={(e) => setCta(e.target.value)}
                placeholder="e.g. Send us your project idea"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition"
              />
            </div>

            {/* 5. Hashtags Editor */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Recommended Hashtags</span>
              </label>
              <input
                type="text"
                value={hashtags.join(' ')}
                disabled={isLocked}
                onChange={(e) =>
                  setHashtags(
                    e.target.value
                      .split(' ')
                      .filter((t) => t.trim().length > 0)
                      .map((t) => (t.startsWith('#') ? t : `#${t}`))
                  )
                }
                placeholder="#3DPrintingTunisia #Prototyping #TunisTech"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-indigo-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 transition"
              />
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenFeedbackModal()}
                  className="btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#CB19C2]" />
                  <span>Log Feedback Memory</span>
                </button>
                {caption !== activeAsset.caption && caption.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenFeedbackModal(
                        `Prefer revised phrasing: "${caption.slice(0, 120)}..."`,
                        'Correction'
                      )
                    }
                    className="px-3 py-1.5 bg-purple-50 text-[#6344BF] hover:bg-purple-100 rounded-xl text-xs font-bold border border-purple-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Save Edit as Preference</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {feedbackSavedToast && (
                  <span className="text-xs font-bold text-fuchsia-700 flex items-center gap-1 animate-in fade-in">
                    <Sparkles className="w-4 h-4 text-[#CB19C2]" />
                    <span>Feedback Memory Logged!</span>
                  </span>
                )}
                {saveSuccessNotice && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <span>Saved & Snapshot Created</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Edits & Snapshot Version</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Creative Specs & Comments Stream */}
        <div className="space-y-6">
          {/* Creative Direction & Specs Reference Card */}
          {(activeAsset.creativeBrief || activeAsset.visualDirection) && (
            <div className="card-tier-1 p-5 space-y-3 bg-white border border-slate-200 shadow-xs">
              <h3 className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#172DC3]" />
                <span>Creative Direction</span>
              </h3>
              {activeAsset.creativeBrief && (
                <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <span className="font-bold block text-slate-900 mb-0.5">Designer Brief:</span>
                  {activeAsset.creativeBrief}
                </div>
              )}
              {activeAsset.visualDirection && (
                <div className="text-xs text-slate-700 leading-relaxed bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                  <span className="font-bold block text-purple-950 mb-0.5">Visual Notes:</span>
                  {activeAsset.visualDirection}
                </div>
              )}
            </div>
          )}

          {/* Version History Card */}
          <div className="card-tier-1 p-5 space-y-3 bg-white border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#172DC3]" />
              <span>Version History ({activeAsset.versions?.length || 0})</span>
            </h3>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {(activeAsset.versions || []).map((ver) => (
                <div
                  key={ver.versionNumber}
                  className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-[#15192B]">
                    <span>v{ver.versionNumber} Snapshot</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ver.updatedAt ? ver.updatedAt.slice(11, 16) : ''}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    By: {ver.updatedBy || 'Marketing Team'}
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                    "{ver.hook || ver.caption || 'Initial draft'}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Team Review Comments Card */}
          <div className="card-tier-1 p-5 space-y-3 bg-white border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#172DC3]" />
              <span>Team Review Comments</span>
            </h3>

            {/* Post Comment Form */}
            <div className="space-y-2">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold text-slate-800 cursor-pointer"
              >
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>

              <textarea
                rows={2}
                placeholder="Add review feedback for this post/video..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />

              <label className="flex items-center gap-2 text-[11px] font-semibold text-purple-900 bg-purple-50/70 p-2 rounded-xl border border-purple-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveCommentAsMemory}
                  onChange={(e) => setSaveCommentAsMemory(e.target.checked)}
                  className="rounded text-[#6344BF] focus:ring-[#6344BF]/20"
                />
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#CB19C2]" />
                  <span>Also save comment as reusable Feedback Memory</span>
                </span>
              </label>

              <button
                type="button"
                onClick={handleAddComment}
                className="w-full btn-secondary py-2 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>Post Comment</span>
              </button>
            </div>

            {/* Comments Stream */}
            <div className="space-y-2 pt-2 max-h-48 overflow-y-auto pr-1">
              {(activeAsset.comments || []).map((c) => {
                const matchedStaff = staffMembers.find(
                  (s) => s.name.toLowerCase() === c.authorName.toLowerCase()
                );

                return (
                  <div key={c.id} className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80 text-xs">
                    <div className="flex items-center justify-between font-bold text-[#15192B]">
                      {matchedStaff ? (
                        <StaffProfilePopover staff={matchedStaff}>
                          <span className="hover:text-[#172DC3] transition cursor-pointer underline decoration-dotted decoration-slate-300">
                            {c.authorName}
                          </span>
                        </StaffProfilePopover>
                      ) : (
                        <span>{c.authorName}</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">{c.authorRole}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{c.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK MEMORY LOGGING MODAL */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#160857]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-[#15192B] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#CB19C2]" />
                <span>Log Feedback Memory</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs text-purple-950 space-y-0.5">
              <strong className="font-bold block">In-Context Guidance:</strong>
              This preference will be saved locally in IndexedDB and dynamically injected into future Gemini prompts. The underlying model is not retrained.
            </div>

            {/* Instruction Field */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Instruction / Reusable Guideline <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={feedbackInstruction}
                onChange={(e) => setFeedbackInstruction(e.target.value)}
                placeholder="e.g. Always write Darija voiceovers in Arabic script; keep tone professional yet friendly; emphasize fast turnaround times."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 font-medium"
              />
            </div>

            {/* Feedback Type */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1.5">Feedback Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    'Positive Preference',
                    'Avoid / Negative',
                    'Correction',
                    'Brand / Style Rule',
                  ] as FeedbackType[]
                ).map((t) => {
                  const isSel = feedbackType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFeedbackType(t)}
                      className={`p-2 rounded-xl text-xs font-bold border transition text-left cursor-pointer ${
                        isSel
                          ? 'bg-[#160857] text-white border-[#160857] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scope Settings */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#15192B]">Applicability Scope</label>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feedbackIsGlobal}
                    onChange={(e) => setFeedbackIsGlobal(e.target.checked)}
                    className="rounded text-[#172DC3] focus:ring-[#172DC3]/20"
                  />
                  <span>Apply Globally</span>
                </label>
              </div>

              {!feedbackIsGlobal && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Format</label>
                    <select
                      value={feedbackFormat}
                      onChange={(e) => setFeedbackFormat(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-1.5 font-semibold text-slate-800"
                    >
                      <option value="All Formats">All Formats</option>
                      <option value={activeAsset.format}>{activeAsset.format}</option>
                      <option value="Reel / Video">Reel / Video</option>
                      <option value="Carousel">Carousel</option>
                      <option value="Static Post">Static Post</option>
                      <option value="Story">Story</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Audience</label>
                    <select
                      value={feedbackAudience}
                      onChange={(e) => setFeedbackAudience(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-1.5 font-semibold text-slate-800"
                    >
                      <option value="All Audiences">All Audiences</option>
                      <option value="B2B">B2B</option>
                      <option value="B2C">B2C</option>
                      <option value="Both">Both (B2B + B2C)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Platform</label>
                    <select
                      value={feedbackPlatform}
                      onChange={(e) => setFeedbackPlatform(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-1.5 font-semibold text-slate-800"
                    >
                      <option value="All Platforms">All Platforms</option>
                      <option value={activeAsset.platform}>{activeAsset.platform}</option>
                      <option value="Meta / Instagram">Meta / Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="TikTok">TikTok</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Languages</label>
                    <input
                      type="text"
                      value={feedbackLanguages}
                      onChange={(e) => setFeedbackLanguages(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-1.5 font-medium text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Author Attribution */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Reviewer Attribution</label>
              <select
                value={feedbackStaffId}
                onChange={(e) => setFeedbackStaffId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 font-semibold text-slate-800"
              >
                {staffMembers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFeedbackMemory}
                disabled={!feedbackInstruction.trim()}
                className="btn-primary px-5 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Save Feedback Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
