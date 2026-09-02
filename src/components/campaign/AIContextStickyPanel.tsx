import React, { useState } from 'react';
import {
  BrandKit,
  CampaignBrief,
  CampaignPromotionItem,
  CampaignUploadedAsset,
  FeedbackMemoryItem,
  CampaignReference,
} from '../../types';
import {
  Sparkles,
  CheckCircle2,
  CircleDot,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Database,
  Tag,
  Palette,
  FileText,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface AIContextStickyPanelProps {
  brandKit: BrandKit | null;
  brief: Partial<CampaignBrief>;
  promotionItems: CampaignPromotionItem[];
  uploadedAssets: CampaignUploadedAsset[];
  campaignReferences: CampaignReference[];
  feedbackMemoryCount: number;
}

export const AIContextStickyPanel: React.FC<AIContextStickyPanelProps> = ({
  brandKit,
  brief,
  promotionItems,
  uploadedAssets,
  campaignReferences,
  feedbackMemoryCount,
}) => {
  const [isCollapsedMobile, setIsCollapsedMobile] = useState(false);

  const approvedItems = promotionItems.filter((p) => p.approvedKnowledge);
  const campaignProvidedItems = promotionItems.filter((p) => p.campaignProvided);

  const hasBrandKit = !!(brandKit?.companyName || brandKit?.primaryColorHex || (brandKit?.primaryColors && brandKit.primaryColors.length > 0));
  const hasObjective = !!brief.objective?.trim();
  const hasAudienceSegment = !!brief.audienceSegment;
  const hasTargetAudiences = !!(brief.targetAudiences && brief.targetAudiences.length > 0);
  const hasLocations = !!(brief.locations && brief.locations.length > 0);
  const hasLanguages = !!(brief.languages && brief.languages.length > 0);
  const hasPlatforms = !!(brief.targetPlatforms && brief.targetPlatforms.length > 0);
  const hasFormats = !!(brief.desiredFormats && brief.desiredFormats.length > 0);
  const hasStrategyTone = !!(brief.campaignToneList && brief.campaignToneList.length > 0);
  const hasStrategyKPIs = !!(brief.primaryKPIs && brief.primaryKPIs.length > 0);
  const hasFunnelIntent = !!brief.funnelIntent;
  const hasPalette = !!(brief.campaignPalette && brief.campaignPalette.length > 0);
  const hasPillars = !!(brief.contentPillars && brief.contentPillars.length > 0);
  const hasReferences = !!(brief.selectedReferenceIds && brief.selectedReferenceIds.length > 0);
  const hasAssets = uploadedAssets.length > 0;
  const hasResources = !!(brief.availableResources && Object.values(brief.availableResources).some((v) => v === true));

  return (
    <div
      id="live-campaign-ai-context-panel"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-indigo-50 text-[#172DC3] flex items-center justify-center border border-indigo-100 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[#15192B] uppercase tracking-wider">
              Live Campaign AI Context
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Active grounding context sent to Gemini
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsedMobile(!isCollapsedMobile)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
        >
          {isCollapsedMobile ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Body */}
      <div className={`p-4 space-y-4 text-xs ${isCollapsedMobile ? 'hidden lg:block' : 'block'}`}>
        
        {/* Category 1: Approved Company Knowledge */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50/90 border border-emerald-200/60 px-2.5 py-1.5 rounded-lg mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Approved Company Knowledge
          </div>
          <div className="space-y-2 pl-1 text-slate-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {hasBrandKit ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Brand Kit
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${hasBrandKit ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {hasBrandKit ? 'Loaded' : 'Not configured'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {approvedItems.length > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Approved Catalog Items
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${approvedItems.length > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {approvedItems.length > 0 ? `${approvedItems.length} selected` : 'None'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {feedbackMemoryCount > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Feedback Memory
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${feedbackMemoryCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {feedbackMemoryCount > 0 ? `${feedbackMemoryCount} rules active` : 'Empty'}
              </span>
            </div>
          </div>
        </div>

        {/* Category 2: Campaign-Provided Inputs */}
        <div className="border-t border-slate-100 pt-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#172DC3] bg-indigo-50/80 border border-indigo-100 px-2.5 py-1.5 rounded-lg mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#172DC3]" />
            Current Campaign-Provided Info
          </div>

          <div className="space-y-2 pl-1 text-slate-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {hasObjective ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-rose-400" />
                )}
                Objective
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md truncate max-w-[120px] ${hasObjective ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                {hasObjective ? 'Defined' : 'Required'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {hasAudienceSegment ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Audience Segment
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${hasAudienceSegment ? 'bg-indigo-50 text-[#172DC3]' : 'bg-slate-100 text-slate-500'}`}>
                {brief.audienceSegment || 'Unselected'}
              </span>
            </div>

            {campaignProvidedItems.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  Custom Promotion Items
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800">
                  {campaignProvidedItems.length} inline item(s)
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {hasLocations ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Target Locations
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${hasLocations ? 'bg-indigo-50 text-[#172DC3]' : 'bg-slate-100 text-slate-500'}`}>
                {hasLocations ? `${brief.locations?.length} Govs` : 'Not specified'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {hasLanguages ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Languages
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${hasLanguages ? 'bg-indigo-50 text-[#172DC3]' : 'bg-slate-100 text-slate-500'}`}>
                {hasLanguages ? `${brief.languages?.length} selected` : 'None'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {hasPlatforms ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Platforms & Formats
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${hasPlatforms ? 'bg-indigo-50 text-[#172DC3]' : 'bg-slate-100 text-slate-500'}`}>
                {hasPlatforms ? `${brief.targetPlatforms?.length} platforms` : 'None'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {hasStrategyTone || hasStrategyKPIs || hasFunnelIntent ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Campaign Strategy
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${hasStrategyTone || hasStrategyKPIs || hasFunnelIntent ? 'bg-indigo-50 text-[#172DC3]' : 'bg-slate-100 text-slate-500'}`}>
                {brief.funnelIntent ? `${brief.funnelIntent}` : hasStrategyTone ? 'Tone set' : 'Optional'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {hasPalette ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Campaign Palette
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${hasPalette ? 'bg-indigo-50 text-[#172DC3]' : 'bg-slate-100 text-slate-500'}`}>
                {hasPalette ? `${brief.campaignPalette?.length} colors` : 'None'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {hasAssets ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-slate-300" />
                )}
                Uploaded Visuals
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${hasAssets ? 'bg-indigo-50 text-[#172DC3]' : 'bg-slate-100 text-slate-500'}`}>
                {hasAssets ? `${uploadedAssets.length} file(s)` : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Category 3: Optional / Missing Context */}
        <div className="border-t border-slate-100 pt-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100/90 border border-slate-200/70 px-2.5 py-1.5 rounded-lg mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Optional Context Status
          </div>

          <div className="space-y-2 pl-1 text-slate-500 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-medium">Content Pillars (Authoritative):</span>
              <span className="font-bold text-slate-700">
                {hasPillars ? `${brief.contentPillars?.length} custom` : 'AI will propose'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Reference Campaigns:</span>
              <span className="font-bold text-slate-700">
                {hasReferences ? `${brief.selectedReferenceIds?.length} attached` : 'None attached'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Production Resources:</span>
              <span className="font-bold text-slate-700">
                {hasResources ? 'Declared' : 'Not declared'}
              </span>
            </div>
          </div>
        </div>

        {/* Factual Integrity Badge */}
        <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/80 text-[11px] text-slate-600 leading-relaxed">
          <div className="font-bold text-[#160857] mb-0.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#172DC3] shrink-0" />
            Factual Grounding
          </div>
          Gemini will plan content strictly grounded in verified company products and explicit marketer inputs.
        </div>
      </div>
    </div>
  );
};
