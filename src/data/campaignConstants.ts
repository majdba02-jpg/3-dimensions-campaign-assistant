import { DefaultCampaignType, LocationGroup } from '../types';

export const DEFAULT_CAMPAIGN_TYPES: DefaultCampaignType[] = [
  'Product Launch',
  'Promotional Offer',
  'Seasonal Campaign',
  'Brand Awareness',
  'Educational Content',
  'B2B Corporate Campaign',
  'Customer Success / Testimonial',
  'Behind the Scenes',
  'Event / Exhibition',
];

export const TUNISIA_GOVERNORATES = [
  'Ariana',
  'Béja',
  'Ben Arous',
  'Bizerte',
  'Gabès',
  'Gafsa',
  'Jendouba',
  'Kairouan',
  'Kasserine',
  'Kébili',
  'Le Kef',
  'Mahdia',
  'Manouba',
  'Médenine',
  'Monastir',
  'Nabeul',
  'Sfax',
  'Sidi Bouzid',
  'Siliana',
  'Sousse',
  'Tataouine',
  'Tozeur',
  'Tunis',
  'Zaghouan',
] as const;

export type TunisiaGovernorate = (typeof TUNISIA_GOVERNORATES)[number];

export const DEFAULT_LOCATION_GROUPS: LocationGroup[] = [
  {
    id: 'grp_nationwide',
    name: 'Nationwide',
    governorates: [...TUNISIA_GOVERNORATES],
    isCustom: false,
  },
  {
    id: 'grp_greater_tunis',
    name: 'Greater Tunis',
    governorates: ['Tunis', 'Ariana', 'Ben Arous', 'Manouba'],
    isCustom: false,
  },
  {
    id: 'grp_coastal',
    name: 'Coastal Areas',
    governorates: [
      'Tunis',
      'Ariana',
      'Ben Arous',
      'Bizerte',
      'Nabeul',
      'Sousse',
      'Monastir',
      'Mahdia',
      'Sfax',
      'Médenine',
    ],
    isCustom: false,
  },
  {
    id: 'grp_north',
    name: 'North',
    governorates: [
      'Tunis',
      'Ariana',
      'Ben Arous',
      'Manouba',
      'Bizerte',
      'Nabeul',
      'Béja',
      'Jendouba',
      'Le Kef',
      'Siliana',
      'Zaghouan',
    ],
    isCustom: false,
  },
  {
    id: 'grp_centre',
    name: 'Centre',
    governorates: ['Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid'],
    isCustom: false,
  },
  {
    id: 'grp_south',
    name: 'South',
    governorates: ['Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili'],
    isCustom: false,
  },
];

export const COMMON_CTAS = [
  'Learn More',
  'Send Us a Message',
  'Contact Us',
  'Discover More',
];

export const CAMPAIGN_TONES = [
  'Professional & Technical',
  'Friendly & Accessible',
  'Innovative & Modern',
  'Educational & Instructive',
  'Creative & Inspiring',
  'Corporate & Authoritative',
  'Bold & Engaging',
  'Local & Community-Focused',
];

export const PRIMARY_KPIS = [
  'Reach / Views',
  'Engagement',
  'Messages / Inquiries',
  'Link Clicks',
];

export const FUNNEL_INTENTS = [
  'Awareness',
  'Consideration',
  'Conversion',
  'Sales',
  'Retention',
] as const;

export const PLATFORM_OPTIONS = [
  'Meta',
  'Instagram',
  'Facebook',
  'TikTok',
] as const;

export const FORMAT_OPTIONS = [
  'Reel / Video',
  'Carousel',
  'Story',
  'Feed Photo',
  'Feed Post',
] as const;

export const LANGUAGE_OPTIONS = [
  {
    id: 'Tunisian Darija',
    label: 'Tunisian Darija',
    flag: '🇹🇳',
  },
  {
    id: 'English',
    label: 'English',
    flag: '🇬🇧',
  },
  {
    id: 'French',
    label: 'French',
    flag: '🇫🇷',
  },
] as const;

export const AGE_MIN_OPTIONS = [13, 16, 18, 20, 21, 25, 30, 35, 40, 45, 50, 55, 60];
export const AGE_MAX_OPTIONS = [18, 21, 24, 30, 35, 40, 45, 50, 55, 60, 65, 'No upper limit'];

export const AVAILABLE_RESOURCES_CONFIG = [
  {
    key: 'hasProductPhotos',
    label: 'Product photos available',
    description: 'High-res studio or workshop photographs of products ready to use.',
  },
  {
    key: 'hasVideoFootage',
    label: 'Video footage available',
    description: 'Existing footage of 3D printers in action or finished builds.',
  },
  {
    key: 'hasExistingGraphics',
    label: 'Existing graphics / designs available',
    description: 'Vector templates, schematics, and previous design files.',
  },
  {
    key: 'hasProductForShooting',
    label: 'Product available for new photography / video',
    description: 'Physical samples on hand ready for new photo or video shoots.',
  },
  {
    key: 'hasTeamOnCamera',
    label: 'Team member available on camera',
    description: 'Staff or founder willing to appear on video reels or behind-the-scenes.',
  },
  {
    key: 'hasTestimonialMaterial',
    label: 'Customer / testimonial material available',
    description: 'Client quotes, delivered project photos, or case reviews.',
  },
] as const;
