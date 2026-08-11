import { BrandKit, ProductService, StaffMember, WidgetPreference, AppSettings } from '../types';

export const INITIAL_STAFF: StaffMember[] = [];

export const INITIAL_BRAND_KIT: BrandKit = {
  companyName: '3 Dimensions',
  companyDescription: '',
  brandTone: '',
  primaryColorHex: '#1e1b4b',
  accentColorHex: '#6366f1',
  secondaryColorHex: '#9333ea',
  preferredTerminology: [],
  wordsToAvoid: [],
  englishStyleExamples: [],
  darijaStyleExamples: [],
};

export const INITIAL_PRODUCTS: ProductService[] = [];

export const INITIAL_WIDGETS: WidgetPreference[] = [
  { id: 'w_kpi_overview', title: 'Key Performance Summary', isPinned: true, isHidden: false, order: 1 },
  { id: 'w_reach_views_trend', title: 'Reach & Views Timeline', isPinned: true, isHidden: false, order: 2 },
  { id: 'w_organic_vs_boosted', title: 'Reported Organic & Boosted Performance', isPinned: false, isHidden: false, order: 3 },
  { id: 'w_clicks_trend', title: 'Clicks & Link Clicks Timeline', isPinned: false, isHidden: false, order: 4 },
  { id: 'w_engagement_clicks', title: 'Engagement Breakdown', isPinned: false, isHidden: false, order: 5 },
  { id: 'w_top_posts', title: 'Publications & Posts Data Table', isPinned: true, isHidden: false, order: 6 },
];

export const INITIAL_APP_SETTINGS: AppSettings = {
  defaultLanguage: 'Multilingual (English & Darija)',
  defaultPlatforms: ['Instagram', 'Facebook'],
  autoSuggestAssumptions: true,
};

