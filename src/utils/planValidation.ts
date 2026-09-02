import { CampaignBrief, CampaignPlan, CalendarItem, RecommendedCadence, FactualStatus, PlatformType, ContentFormat, ProductionStatus } from '../types';

/**
 * Checks if a CTA is a generic fallback rather than an authoritative campaign-specific action.
 */
export function isGenericFallbackCta(cta?: string): boolean {
  if (!cta || typeof cta !== 'string') return true;
  const trimmed = cta.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed === 'learn more' ||
    trimmed === 'shop now' ||
    trimmed === 'buy now' ||
    trimmed === 'click here' ||
    trimmed === 'sign up' ||
    trimmed === 'contact us'
  );
}

/**
 * Resolves the authoritative CTA for an item or view, strictly preferring the Campaign Brief CTA.
 */
export function resolveAuthoritativeCta(
  itemCta?: string,
  briefCta?: string,
  defaultFallback: string = 'Send us your project idea'
): string {
  if (itemCta && !isGenericFallbackCta(itemCta)) {
    return itemCta.trim();
  }
  if (briefCta && briefCta.trim().length > 0) {
    return briefCta.trim();
  }
  return defaultFallback;
}

/**
 * Detects factual or unverified technical claims present in actual text.
 * Checks for unsupported claims including:
 * - exact tolerances (e.g., 0.05mm, 0.01mm)
 * - turnaround promises (e.g., 24h guaranteed, same day turnaround)
 * - unverified certifications (e.g., ISO, aerospace certified)
 * - absolute guarantees (e.g., 100% savings, guaranteed fit)
 */
export function detectUnsupportedClaimsInText(
  text: string,
  approvedKnowledgeTexts: string[] = []
): { hasUnsupportedClaims: boolean; offendingPhrases: string[]; status: FactualStatus } {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { hasUnsupportedClaims: false, offendingPhrases: [], status: 'grounded' };
  }

  const combinedApproved = approvedKnowledgeTexts.join(' ').toLowerCase();

  const patterns: { regex: RegExp; label: string }[] = [
    { regex: /\b(?:0\.0[0-9]+|0\.[0-9]+)\s*mm\b/gi, label: 'exact tolerance' },
    { regex: /\b(?:24h|48h|same[\s-]day)\s*(?:guarantee|turnaround|delivery|turnaround time|promise)\b/gi, label: 'turnaround promise' },
    { regex: /\b(?:ISO[\s-]?\d+|CE certified|aerospace certified)\b/gi, label: 'certification claim' },
    { regex: /\b(?:100%|guaranteed)\s*(?:savings|precision|accuracy|fit)\b/gi, label: 'absolute guarantee' },
    { regex: /\b(?:injection[\s-]mold(?:ing)?\s*grade|tooling[\s-]grade)\b/gi, label: 'tooling claim' },
  ];

  const offendingPhrases: string[] = [];

  for (const p of patterns) {
    const matches = text.match(p.regex);
    if (matches) {
      for (const m of matches) {
        // If this exact phrase is NOT supported by approved knowledge, flag it
        if (!combinedApproved.includes(m.toLowerCase()) && !offendingPhrases.includes(m)) {
          offendingPhrases.push(m);
        }
      }
    }
  }

  return {
    hasUnsupportedClaims: offendingPhrases.length > 0,
    offendingPhrases,
    status: offendingPhrases.length > 0 ? 'requires_confirmation' : 'grounded',
  };
}

/**
 * Validates and repairs calendar item dates, deadlines, platforms, and formats.
 * Guarantees that EVERY post date is strictly >= brief.startDate AND <= brief.endDate.
 */
export function validateAndRepairCalendarItems(
  rawCalendar: any[],
  startDateStr: string,
  endDateStr: string,
  allowedPlatforms: string[] = [],
  allowedFormats: string[] = [],
  briefCta: string = 'Send us your project idea'
): CalendarItem[] {
  if (!Array.isArray(rawCalendar) || rawCalendar.length === 0) {
    return [];
  }

  // Normalize start and end dates
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  const validStart = isNaN(start.getTime()) ? new Date() : start;
  let validEnd = isNaN(end.getTime()) ? new Date(validStart.getTime() + 13 * 86400000) : end;
  if (validEnd < validStart) {
    validEnd = new Date(validStart.getTime() + 86400000);
  }

  const startMs = validStart.getTime();
  const endMs = validEnd.getTime();
  const startIso = validStart.toISOString().slice(0, 10);
  const endIso = validEnd.toISOString().slice(0, 10);

  const totalItems = rawCalendar.length;
  const daySpan = Math.max(0, Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)));

  const isMetaSelected = allowedPlatforms.some(
    (p) => p.toLowerCase() === 'meta'
  );

  const validPlatformsList = allowedPlatforms.length > 0
    ? allowedPlatforms
    : ['Meta', 'Instagram', 'Facebook', 'LinkedIn'];

  const validFormatsList = allowedFormats.length > 0
    ? allowedFormats
    : ['Reel', 'Feed Photo', 'Carousel', 'Story', 'Video Short', 'Article/Post'];

  return rawCalendar.map((item, idx) => {
    let itemDateIso = (item.date || '').slice(0, 10);
    const itemDate = new Date(itemDateIso);

    // Strict boundary enforcement
    const isInvalidOrOutOfRange =
      !itemDateIso ||
      isNaN(itemDate.getTime()) ||
      itemDateIso < startIso ||
      itemDateIso > endIso;

    if (isInvalidOrOutOfRange) {
      // Evenly distribute out-of-range items within the valid [startIso, endIso] campaign window
      const stepFraction = totalItems > 1 ? idx / (totalItems - 1) : 0;
      const targetOffsetDays = Math.round(stepFraction * daySpan);
      const repairedDate = new Date(startMs + targetOffsetDays * 86400000);
      itemDateIso = repairedDate.toISOString().slice(0, 10);
    }

    // Production deadline logic: Must be <= itemDateIso and >= startIso
    let deadIso = (item.productionDeadline || '').slice(0, 10);
    if (!deadIso || deadIso > itemDateIso || deadIso < startIso) {
      const itemMs = new Date(itemDateIso).getTime();
      const twoDaysPrior = new Date(Math.max(startMs, itemMs - 2 * 86400000));
      deadIso = twoDaysPrior.toISOString().slice(0, 10);
    }

    // Validate platform with strict Meta handling & no TikTok conversion
    let platform: PlatformType = item.platform;
    if (isMetaSelected) {
      // Any Meta/IG/FB or other unselected platform becomes 'Meta'
      platform = 'Meta';
    } else if (validPlatformsList.includes(item.platform)) {
      platform = item.platform;
    } else {
      platform = validPlatformsList[0] as PlatformType;
    }

    // Never allow TikTok if not explicitly in allowedPlatforms
    if (platform === 'TikTok' && !allowedPlatforms.includes('TikTok')) {
      platform = (isMetaSelected ? 'Meta' : validPlatformsList[0]) as PlatformType;
    }

    // Validate format & detect supporting story format
    let format: ContentFormat = item.format;
    let isRecommendedSupporting = false;
    if (item.format === 'Story') {
      format = 'Story';
      if (!allowedFormats.includes('Story')) {
        isRecommendedSupporting = true;
      }
    } else if (validFormatsList.includes(item.format)) {
      format = item.format;
    } else {
      format = (validFormatsList[0] || 'Feed Photo') as ContentFormat;
    }

    // Authoritative CTA propagation
    const cta = resolveAuthoritativeCta(item.cta, briefCta);

    const factualStatus: FactualStatus =
      item.factualStatus === 'requires_confirmation' || item.factualStatus === 'creative'
        ? item.factualStatus
        : 'grounded';

    const status: ProductionStatus =
      item.status === 'In Production' ||
      item.status === 'Ready for Review' ||
      item.status === 'Approved' ||
      item.status === 'Published'
        ? item.status
        : 'Planned';

    return {
      id: item.id || `cal_post_${idx + 1}_${Date.now()}`,
      campaignId: item.campaignId || '',
      date: itemDateIso,
      platform,
      format,
      topic: item.topic || '3D Printing Campaign Post',
      hook: item.hook || 'Discover innovation with 3 Dimensions',
      caption: item.caption || '',
      cta,
      status,
      productionDeadline: deadIso,
      concernedPeopleIds: Array.isArray(item.concernedPeopleIds) && item.concernedPeopleIds.length > 0 ? item.concernedPeopleIds : ['s1'],
      reelScript: item.reelScript || '',
      visualNotes: item.visualNotes || '',
      hashtags: Array.isArray(item.hashtags) ? item.hashtags : [],
      factualStatus,
      isRecommendedSupportingFormat: isRecommendedSupporting || !!item.isRecommendedSupportingFormat,
      isStoryDeliverable: format === 'Story',
    };
  });
}

/**
 * Validates and normalizes the full Campaign Plan returned from Gemini.
 */
export function validateAndRepairCampaignPlan(
  rawPlan: any,
  brief: CampaignBrief
): CampaignPlan {
  if (!rawPlan || typeof rawPlan !== 'object') {
    throw new Error('Invalid or empty campaign plan output received.');
  }

  const platformsList = brief.targetPlatforms && brief.targetPlatforms.length > 0
    ? brief.targetPlatforms
    : brief.platforms && brief.platforms.length > 0
    ? brief.platforms
    : ['Meta'];

  // Validate or repair calendar items deterministically
  const rawCalendar = Array.isArray(rawPlan.calendar) ? rawPlan.calendar : [];
  const repairedCalendar = validateAndRepairCalendarItems(
    rawCalendar,
    brief.startDate,
    brief.endDate,
    platformsList,
    brief.desiredFormats,
    brief.cta
  );

  if (repairedCalendar.length === 0) {
    throw new Error('Campaign plan calendar contains no valid posts.');
  }

  // Ensure content pillars preserve brief specified pillars if any exist
  let pillars: string[] = Array.isArray(rawPlan.contentPillars) ? rawPlan.contentPillars : [];
  if (brief.contentPillars && brief.contentPillars.length > 0) {
    // Preserve user specified pillars first
    const combined = [...brief.contentPillars, ...pillars];
    pillars = Array.from(new Set(combined)).slice(0, 5);
  }

  // Recommended Cadence computation / fallback
  const rawCadence = rawPlan.recommendedCadence;
  const reelsCount = repairedCalendar.filter((c) => c.format === 'Reel').length;
  const carouselsCount = repairedCalendar.filter((c) => c.format === 'Carousel').length;
  const feedCount = repairedCalendar.filter((c) => c.format === 'Feed Photo' || c.format === 'Article/Post').length;
  const storiesCount = repairedCalendar.filter((c) => c.format === 'Story').length;

  const recommendedCadence: RecommendedCadence = {
    totalPrimaryPosts:
      typeof rawCadence?.totalPrimaryPosts === 'number'
        ? rawCadence.totalPrimaryPosts
        : repairedCalendar.filter((c) => c.format !== 'Story').length,
    reels: typeof rawCadence?.reels === 'number' ? rawCadence.reels : reelsCount,
    carousels: typeof rawCadence?.carousels === 'number' ? rawCadence.carousels : carouselsCount,
    feedPosts: typeof rawCadence?.feedPosts === 'number' ? rawCadence.feedPosts : feedCount,
    stories: typeof rawCadence?.stories === 'number' ? rawCadence.stories : storiesCount,
    rationale:
      rawCadence?.rationale ||
      `Cadence optimized for a ${brief.durationDays}-day ${brief.audienceSegment} campaign on ${platformsList.join(', ')}.`,
  };

  const planFactualStatus: FactualStatus =
    rawPlan.factualStatus === 'requires_confirmation' || rawPlan.factualStatus === 'creative'
      ? rawPlan.factualStatus
      : 'grounded';

  return {
    id: brief.id,
    campaignId: brief.id,
    selectedDirection: rawPlan.selectedDirection || {
      id: brief.selectedDirectionId || 'dir_1',
      campaignId: brief.id,
      title: 'Strategic Campaign Direction',
      concept: rawPlan.concept || brief.name,
      coreMessage: rawPlan.coreMessage || brief.objective,
      strategicRationale: 'Tailored campaign direction for 3 Dimensions',
      suggestedPillars: pillars,
      highLevelDirection: 'Focus on quality, local responsiveness, and application benefits.',
    },
    concept: rawPlan.concept || brief.name,
    coreMessage: rawPlan.coreMessage || brief.objective,
    valueProposition: rawPlan.valueProposition || 'Empowering innovation through local 3D printing expertise.',
    factualStatus: planFactualStatus,
    contentPillars: pillars.length > 0 ? pillars : ['Product Showcase', 'Educational Value', 'Client Solutions'],
    recommendedCadence,
    recommendedFormats: Array.isArray(rawPlan.recommendedFormats) && rawPlan.recommendedFormats.length > 0
      ? rawPlan.recommendedFormats
      : brief.desiredFormats,
    contentMixRationale: rawPlan.contentMixRationale || 'Balanced content mix combining educational, promotional, and story formats.',
    productionEffortEstimate: rawPlan.productionEffortEstimate || 'Moderate (1-2 days of designer and video prep)',
    visualDirection: rawPlan.visualDirection || 'Clean, professional SaaS aesthetic highlighting 3D print details and engineering precision.',
    designerBrief: rawPlan.designerBrief || 'Focus on clean high-contrast product visuals with subtle 3 Dimensions brand colors (Deep Indigo/Purple).',
    videographerBrief: rawPlan.videographerBrief || 'Capture smooth close-up footage of 3D printing in action (if available) and final printed pieces.',
    shotList: Array.isArray(rawPlan.shotList) ? rawPlan.shotList : ['Close-up 3D print detail', '3D model preview on screen', 'Finished prototype presentation'],
    hooksAndCTAs: Array.isArray(rawPlan.hooksAndCTAs) ? rawPlan.hooksAndCTAs : [],
    hashtags: Array.isArray(rawPlan.hashtags) ? rawPlan.hashtags : ['#3DPrinting', '#TunisiaTech', '#3Dimensions'],
    suggestedKPIs: Array.isArray(rawPlan.suggestedKPIs) ? rawPlan.suggestedKPIs : ['Engagement Rate', 'Inquiries / Leads', 'Reach'],
    postPublicationRecommendations: rawPlan.postPublicationRecommendations || 'Monitor engagement during first 4 hours; respond promptly to inquiries.',
    calendar: repairedCalendar,
    components: rawPlan.components || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
