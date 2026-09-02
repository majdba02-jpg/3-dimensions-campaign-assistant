/**
 * Core Domain Type Definitions for 3 Dimensions Campaign Assistant
 */

export type CampaignStatus = 'Draft' | 'In Progress' | 'In Review' | 'Approved' | 'Archived';

export type AudienceSegment = 'B2B' | 'B2C' | 'Both';

export type DefaultCampaignType =
  | 'Product Launch'
  | 'Promotional Offer'
  | 'Seasonal Campaign'
  | 'Brand Awareness'
  | 'Educational Content'
  | 'B2B Corporate Campaign'
  | 'Customer Success / Testimonial'
  | 'Behind the Scenes'
  | 'Event / Exhibition';

export type CampaignType = DefaultCampaignType | string;

export type PlatformType = 'Meta' | 'Instagram' | 'Facebook' | 'TikTok' | string;

export type TargetPlatform = 'Meta' | 'Instagram' | 'Facebook' | 'TikTok';

export type ContentFormat = 'Reel / Video' | 'Carousel' | 'Story' | 'Feed Photo' | 'Feed Post' | string;

export type CampaignLanguage = 'Tunisian Darija' | 'English' | 'French' | 'Multilingual (English & Darija)' | string;

export type LanguageOption = 'Tunisian Darija' | 'English' | 'French' | 'Multilingual (English & Darija)' | string;

export type PromotionTargetType = 'Product' | 'Service' | 'Both';

export interface CampaignPromotionItem {
  id: string;
  type: 'Product' | 'Service';
  name: string;
  description?: string;
  notesOrSpecs?: string;
  imageUrl?: string;
  campaignProvided: boolean; // true if added inline during campaign creation
  approvedKnowledge: boolean; // true if from approved catalog
  originalCatalogId?: string;
}

export interface LocationGroup {
  id: string;
  name: string;
  governorates: string[];
  isCustom?: boolean;
}

export interface CampaignUploadedAsset {
  id: string;
  name: string;
  fileName?: string;
  dataUrl: string; // base64 or url
  url?: string;
  type: 'Product Image' | 'Existing Asset' | 'Reference Image' | 'Brand Asset' | string;
  fileType?: 'image' | 'video' | 'document';
  size?: number;
  fileSize?: number;
  uploadedAt: string;
}

export interface AvailableResources {
  hasProductPhotos?: boolean;
  hasVideoFootage?: boolean;
  hasExistingGraphics?: boolean;
  hasProductForShooting?: boolean;
  hasTeamOnCamera?: boolean;
  hasTestimonialMaterial?: boolean;
  photos?: boolean;
  shortFormVideo?: boolean;
  longFormVideo?: boolean;
  physicalProductsForPhotoshoots?: boolean;
  founderOrTeamOnCamera?: boolean;
  customerTestimonialsOrUGC?: boolean;
  budgetForPaidAds?: boolean;
  inHouseDesigner?: boolean;
  notes?: string;
  [key: string]: boolean | string | undefined;
}

export interface AssumptionItem {
  id: string;
  category: string;
  proposedValue: string;
  rationale: string;
  sourceTags: string[]; // e.g. ['Campaign Brief', 'Brand Kit', 'Approved Product / Service', 'Feedback Memory']
  status: 'Accepted' | 'Edited' | 'Rejected' | 'Pending';
  editedValue?: string;
  originalValue?: string;
}

export interface StrategicDirection {
  id: string;
  directionNumber: number;
  strategicAngle: string;
  title: string;
  concept: string;
  coreMessage: string;
  strategicRationale: string;
  campaignPillars: string[];
  directionSpecificPillar?: string;
  shortlisted?: boolean;
  selectedForPlan?: boolean;
  isHybrid?: boolean;
  isReplacement?: boolean;
  isEdited?: boolean;
  sourceDirectionIds?: string[];
  accentColorHex?: string;
  originalText?: {
    title: string;
    concept: string;
    coreMessage: string;
    strategicRationale: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CustomCampaignType {
  id: string;
  name: string;
  createdAt: string;
}

export interface CustomTargetAudience {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

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
  productOrService?: string;
  targetAudience: string;
  audienceAge?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  platforms: PlatformType[];
  language: LanguageOption;
  desiredFormats: ContentFormat[];
  cta: string;

  // New Redesigned Workflow Fields
  promotingType?: PromotionTargetType;
  promotionItems?: CampaignPromotionItem[];
  selectedProductIds?: string[];
  selectedServiceIds?: string[];
  customNewItems?: CampaignPromotionItem[];
  targetAudiences?: string[];
  audienceNotes?: string;
  minAge?: string;
  maxAge?: string;
  languages?: CampaignLanguage[];
  targetPlatforms?: TargetPlatform[];
  locations?: string[];
  locationGroups?: string[];
  campaignToneList?: string[];
  keyMessage?: string;
  primaryKPIs?: string[];
  primaryKPI?: string;
  funnelIntent?: 'Awareness' | 'Consideration' | 'Conversion' | 'Sales' | 'Retention';
  promotionOffer?: string;
  campaignPalette?: string[];
  uploadedAssets?: CampaignUploadedAsset[];
  selectedReferenceIds?: string[];
  customReferenceNotes?: string;
  availableResources?: AvailableResources;
  assumptions?: AssumptionItem[];
  strategicDirections?: StrategicDirection[];
  selectedDirection?: StrategicDirection;
  draftSavedAt?: string;

  // Optional legacy/generic fields
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
  workflowStage?: 'brief' | 'assumptions_resolved' | 'directions_generated' | 'direction_selected' | 'plan_generated';
  selectedDirectionId?: string;
  activePlanVersionId?: string;
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

export type ProductionStatus =
  | 'Planned'
  | 'In Production'
  | 'Ready for Review'
  | 'Approved'
  | 'Published'
  | 'Draft'
  | 'Scheduled';

export interface ScriptSegment {
  id: string;
  startTime: string; // e.g. "00:00"
  endTime: string;   // e.g. "00:03"
  visual: string;
  voiceover: string;
  onScreenText: string;
  cameraNotes: string;
}

export interface CarouselSlide {
  id: string;
  slideNumber: number;
  purpose: string; // e.g. "Cover / Hook", "Problem Context", "Solution Breakdown", "Technical Specs", "Final CTA"
  headline: string;
  bodyCopy: string;
  visualDirection: string;
  onSlideText?: string;
}

export type StoryInteractionElement = 'None' | 'Poll' | 'Question' | 'Slider' | 'Link / CTA';

export interface StoryFrame {
  id: string;
  frameNumber: number;
  purpose: string; // e.g. "Hook / Question", "Behind the Scenes", "Feature Highlight", "Quiz / Poll", "CTA / Direct Message"
  visualDirection: string;
  onScreenText: string;
  interactionElement?: StoryInteractionElement | string;
  cta?: string;
  notes?: string;
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
  status: ProductionStatus;
  productionDeadline: string;
  concernedPeopleIds: string[]; // references StaffMember.id
  reelScript?: string;
  scriptSegments?: ScriptSegment[];
  carouselSlides?: CarouselSlide[];
  storyFrames?: StoryFrame[];
  totalDurationSeconds?: number;
  visualNotes?: string;
  hashtags?: string[];
  factualStatus?: FactualStatus;
  isRecommendedSupportingFormat?: boolean;
  isStoryDeliverable?: boolean;
  parentPostId?: string;
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
  planVersionId?: string;
  directionId?: string;
  directionTitle?: string;
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
  planVersionId?: string;
  contentItemId?: string; // links to CalendarItem.id
  title: string;
  format: ContentFormat;
  platform: PlatformType;
  scheduledDate: string;
  hook: string;
  caption: string;
  scriptOrStoryboard?: string;
  scriptSegments?: ScriptSegment[];
  carouselSlides?: CarouselSlide[];
  storyFrames?: StoryFrame[];
  totalDurationSeconds?: number;
  cta: string;
  hashtags: string[];
  creativeBrief: string;
  visualDirection: string;
  requiredAssets: string[];
  concernedPeopleIds?: string[];
  factualStatus?: FactualStatus;
  status: 'Draft' | 'Needs Review' | 'Approved' | 'Changes Requested';
  isLocked: boolean;
  versions: AssetVersion[];
  comments: ReviewComment[];
  createdAt: string;
  updatedAt: string;
}

export interface AssetVersion {
  versionNumber: number;
  hook?: string;
  caption: string;
  scriptOrStoryboard?: string;
  scriptSegments?: ScriptSegment[];
  carouselSlides?: CarouselSlide[];
  storyFrames?: StoryFrame[];
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

export type FeedbackType =
  | 'Positive Preference'
  | 'Avoid / Negative'
  | 'Correction'
  | 'Brand / Style Rule';

export type FeedbackSource =
  | 'Content Review'
  | 'Manual Entry'
  | 'Team Comment'
  | 'Human Edit';

export interface FeedbackMemoryScope {
  format?: string;
  platform?: string;
  audienceSegment?: string;
  languages?: string[];
  productOrServiceId?: string;
  isGlobal?: boolean;
}

export interface FeedbackMemoryItem {
  id: string;
  instruction: string;
  feedbackType: FeedbackType;
  scope?: FeedbackMemoryScope;
  format?: string;
  platform?: string;
  audienceSegment?: string;
  languages?: string[];
  productOrServiceId?: string;
  tags?: string[];
  source: FeedbackSource | string;
  authorStaffId?: string;
  authorName?: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;

  // Backward compatibility fields
  rating?: 'Positive' | 'Negative' | 'Neutral';
  explanation?: string;
  correctedVersion?: string;
  campaignId?: string;
  campaignName?: string;
  contentItemId?: string;
  campaignType?: CampaignType;
  contentFormat?: ContentFormat;
  language?: LanguageOption | string;
  originalGeneratedContent?: string;
  humanEditedContent?: string;
}

export interface BrandColorItem {
  id: string;
  hex: string;
  label?: string;
}

export interface LanguageStyleExample {
  id: string;
  title: string;
  text: string;
  note?: string;
}

export interface BrandKit {
  companyName: string;
  companyDescription: string;
  brandTone: string;
  logoUrl?: string;
  logoFileName?: string;
  primaryColorHex: string; // #160857
  accentColorHex: string;  // #CB19C2
  secondaryColorHex: string; // #6344BF
  primaryColors?: string[];
  brandColors?: BrandColorItem[];
  preferredTerminology: string[];
  approvedClaims?: string[];
  wordsToAvoid: string[];
  englishStyleExamples: (string | LanguageStyleExample)[];
  darijaStyleExamples: (string | LanguageStyleExample)[]; // Arabic script with French/English terms
  frenchStyleExamples?: (string | LanguageStyleExample)[];
  additionalBrandInstructions?: string;
}

export interface ProductMediaItem {
  id: string;
  type: 'image' | 'document';
  name: string;
  url: string;
  label?: string;
  uploadedAt: string;
}

export interface ProductService {
  id: string;
  type?: 'Product' | 'Service';
  name: string;
  category: string; // e.g. "Custom Prototyping", "Consumer Gadget", "3D Scanning", "Corporate Trophies"
  description: string;
  technicalSpecs?: string;
  materials?: string[]; // PLA, PETG, Resin, ABS, TPU
  approvedClaims?: string[];
  claimsToAvoid?: string[];
  referenceLinks?: string[];
  referenceDocs?: ProductMediaItem[];
  images?: ProductMediaItem[];
  imageUrl?: string;
  additionalNotes?: string;
  approvalStatus?: 'Approved' | 'Pending' | 'Archived';
  originatingCampaignId?: string;
  originatingCampaignName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReferenceAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
}

export interface CampaignReference {
  id: string;
  title: string;
  type: CampaignType;
  audienceSegment?: AudienceSegment;
  language?: LanguageOption;
  languages?: LanguageOption[];
  platform?: PlatformType;
  platforms?: PlatformType[];
  captionCopy?: string;
  whyUsefulNotes?: string;
  summary?: string;
  keyTakeaways?: string;
  performanceNotes?: string;
  attachments?: ReferenceAttachment[];
  sourceCampaign?: string;
  createdAt: string;
}

export const DEFAULT_STAFF_ROLES = [
  'Marketing Manager',
  'Production Manager',
  'Sales Manager',
  'Communication Manager',
  'Photographer',
  'Videographer',
  '3D Designer',
] as const;

export type DefaultStaffRole = typeof DEFAULT_STAFF_ROLES[number];
export type StaffRole = DefaultStaffRole | string;

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phoneNumber?: string;
}

export interface CustomRole {
  id: string;
  name: string;
  createdAt: string;
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
