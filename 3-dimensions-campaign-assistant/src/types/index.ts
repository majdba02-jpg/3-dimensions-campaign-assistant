/**
 * Core Domain Type Definitions for 3 Dimensions Campaign Assistant
 */

export type CampaignStatus = 'Draft' | 'In Progress' | 'In Review' | 'Approved' | 'Archived';

export type AudienceSegment = 'B2B' | 'B2C' | 'Both';

export type CampaignType =
  | 'Product Launch'
  | 'Promotional Offer'
  | 'Seasonal Campaign'
  | 'Brand Awareness'
  | 'Educational Content'
  | 'B2B Corporate Campaign'
  | 'Customer Success / Testimonial'
  | 'Behind the Scenes'
  | 'Event / Exhibition';

export type PlatformType = 'Facebook' | 'Instagram' | 'LinkedIn' | 'TikTok' | 'WhatsApp' | 'Website';

export type ContentFormat = 'Reel' | 'Feed Photo' | 'Carousel' | 'Story' | 'Video Short' | 'Article/Post';

export type LanguageOption = 'English' | 'Tunisian Darija (Arabic Script)' | 'Multilingual (English & Darija)';

// Raw or normalized Meta analytics record parsed from CSV
export interface MarketingDataRecord {
  id: string; // Identifiant de la publication
  pageId?: string;
  pageName?: string;
  title: string;
  description: string;
  durationSeconds: number;
  publishTime: string; // e.g. "01/16/2026 10:29"
  permalink: string;
  isCrosspost: boolean;
  isShare: boolean;
  publicationType: string; // "Vidéos" | "Photos"
  views: number; // Vues
  reach: number; // Couverture
  totalEngagement: number; // Réactions + Commentaires + Partages
  reactions: number;
  comments: number;
  shares: number;
  totalClicks: number;
  linkClicks: number;
  organicViews: number;
  boostedViews: number;
  organicReach: number;
  boostedReach: number;
  watchTimeSeconds: number; // Secondes regardé(e)
  averageWatchTimeSeconds: number;
  views3s: number;
  views1m: number;
  importedAt: string;
}

export interface DatasetMetadata {
  id: string;
  fileName: string;
  importedAt: string;
  totalRecords: number;
  mappedColumns: string[];
  unmappedColumns: string[];
  dateRange: { start: string; end: string };
  isActive?: boolean;
}

export interface CampaignBrief {
  id: string;
  name: string;
  objective: string;
  type: CampaignType;
  audienceSegment: AudienceSegment;
  productOrService: string;
  targetAudience: string;
  audienceAge: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  platforms: PlatformType[];
  language: LanguageOption;
  desiredFormats: ContentFormat[];
  cta: string;
  // Optional fields
  location?: string;
  industry?: string;
  buyerPersona?: string;
  brandTone?: string;
  campaignTone?: string;
  desiredKPIs?: string;
  promotionDetails?: string;
  seasonalContext?: string;
  previousCampaignReference?: string;
  assetAvailability?: string;
  additionalInstructions?: string;
  contentPillars?: string[];
  // Status tracking
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  selectedDirectionId?: string;
  assumptionsConfirmed?: boolean;
  usedAssumptions?: Record<string, string>;
}

export interface CampaignDirection {
  id: string;
  campaignId: string;
  title: string;
  concept: string;
  coreMessage: string;
  strategicRationale: string;
  suggestedPillars: string[];
  highLevelDirection: string;
}

export type FactualStatus = 'grounded' | 'creative' | 'requires_confirmation';

export interface RecommendedCadence {
  totalPrimaryPosts: number;
  reels: number;
  carousels: number;
  feedPosts: number;
  stories: number;
  rationale: string;
}

export interface CalendarItem {
  id: string;
  campaignId: string;
  date: string; // YYYY-MM-DD
  platform: PlatformType;
  format: ContentFormat;
  topic: string;
  hook: string;
  caption: string;
  platformSpecificCopy?: Record<string, string>; // e.g. FB vs IG copy
  cta: string;
  status: 'Draft' | 'Scheduled' | 'In Production' | 'Approved' | 'Published';
  productionDeadline: string;
  concernedPeopleIds: string[]; // references StaffMember.id
  reelScript?: string;
  visualNotes?: string;
  hashtags?: string[];
  factualStatus?: FactualStatus;
}

export interface CampaignComponent {
  id: string; // e.g. "core_message", "visual_direction", "content_pillars"
  title: string;
  content: string | string[] | Record<string, any>;
  isLocked: boolean;
  lastUpdated: string;
}

export interface CampaignPlan {
  id: string; // matches brief.id
  campaignId: string;
  selectedDirection: CampaignDirection;
  concept: string;
  coreMessage: string;
  valueProposition: string;
  factualStatus?: FactualStatus;
  contentPillars: string[];
  recommendedCadence?: RecommendedCadence;
  recommendedFormats: ContentFormat[];
  contentMixRationale: string;
  productionEffortEstimate: string;
  visualDirection: string;
  designerBrief: string;
  videographerBrief: string;
  shotList: string[];
  hooksAndCTAs: { hook: string; cta: string; format: string }[];
  hashtags: string[];
  suggestedKPIs: string[];
  postPublicationRecommendations: string;
  calendar: CalendarItem[];
  components: Record<string, CampaignComponent>; // key is component id
  createdAt: string;
  updatedAt: string;
}

export interface ContentAsset {
  id: string;
  campaignId: string;
  campaignName: string;
  title: string;
  format: ContentFormat;
  platform: PlatformType;
  scheduledDate: string;
  hook: string;
  caption: string;
  scriptOrStoryboard?: string;
  cta: string;
  hashtags: string[];
  creativeBrief: string;
  visualDirection: string;
  requiredAssets: string[];
  status: 'Draft' | 'Needs Review' | 'Approved' | 'Changes Requested';
  isLocked: boolean;
  versions: AssetVersion[];
  comments: ReviewComment[];
  createdAt: string;
  updatedAt: string;
}

export interface AssetVersion {
  versionNumber: number;
  caption: string;
  scriptOrStoryboard?: string;
  cta: string;
  updatedAt: string;
  updatedBy: string;
  changeSummary?: string;
}

export interface ReviewComment {
  id: string;
  assetId: string;
  authorName: string;
  authorRole: string;
  text: string;
  createdAt: string;
}

export interface FeedbackMemoryItem {
  id: string;
  rating: 'Positive' | 'Negative' | 'Neutral';
  explanation: string;
  correctedVersion?: string;
  campaignType: CampaignType;
  audienceSegment: AudienceSegment;
  contentFormat: ContentFormat;
  language: LanguageOption;
  originalGeneratedContent: string;
  humanEditedContent?: string;
  createdAt: string;
}

export interface BrandKit {
  companyName: string;
  companyDescription: string;
  brandTone: string;
  logoUrl?: string;
  primaryColorHex: string; // #1e1b4b
  accentColorHex: string;  // #6366f1
  secondaryColorHex: string; // #9333ea
  preferredTerminology: string[];
  wordsToAvoid: string[];
  englishStyleExamples: string[];
  darijaStyleExamples: string[]; // Arabic script with French/English terms
}

export interface ProductService {
  id: string;
  name: string;
  category: string; // e.g. "Custom Prototyping", "Consumer Gadget", "3D Scanning", "Corporate Trophies"
  description: string;
  technicalSpecs: string;
  materials: string[]; // PLA, PETG, Resin, ABS, TPU
  approvedClaims: string[];
  referenceLinks?: string[];
  imageUrl?: string;
}

export interface CampaignReference {
  id: string;
  title: string;
  type: CampaignType;
  audienceSegment?: AudienceSegment;
  language?: LanguageOption;
  captionCopy?: string;
  whyUsefulNotes?: string;
  summary?: string;
  keyTakeaways?: string;
  performanceNotes?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Marketing Manager' | 'Production Manager' | 'Sales Manager' | 'Communication Manager' | 'Photographer' | 'Videographer' | '3D Designer';
  email?: string;
}

export interface WidgetPreference {
  id: string;
  title: string;
  isPinned: boolean;
  isHidden: boolean;
  order: number;
}

export interface AppSettings {
  defaultLanguage: LanguageOption;
  defaultPlatforms: PlatformType[];
  autoSuggestAssumptions: boolean;
  lastBackupDate?: string;
}
