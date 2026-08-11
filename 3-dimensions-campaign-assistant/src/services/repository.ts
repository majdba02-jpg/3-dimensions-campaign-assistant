/**
 * Clean Storage / Repository Layer for 3 Dimensions Campaign Assistant
 * 
 * decouples UI components from IndexedDB storage details.
 */

import {
  MarketingDataRecord,
  DatasetMetadata,
  CampaignBrief,
  CampaignPlan,
  ContentAsset,
  FeedbackMemoryItem,
  BrandKit,
  ProductService,
  CampaignReference,
  StaffMember,
  WidgetPreference,
  AppSettings,
} from '../types';
import {
  STORES,
  getAllFromStore,
  getByIdFromStore,
  saveToStore,
  saveBatchToStore,
  deleteFromStore,
  clearStore,
} from './db';
import { parseMetaCSV } from './csvParser';
import { RAW_META_CSV } from '../data/seedMetaDataset';
import {
  INITIAL_STAFF,
  INITIAL_BRAND_KIT,
  INITIAL_PRODUCTS,
  INITIAL_WIDGETS,
  INITIAL_APP_SETTINGS,
} from '../data/seedDefaults';

export interface StorageRepository {
  // Marketing Data
  getMarketingData(): Promise<MarketingDataRecord[]>;
  saveMarketingData(records: MarketingDataRecord[]): Promise<void>;
  getDatasetMetadata(): Promise<DatasetMetadata[]>;
  saveDatasetMetadata(meta: DatasetMetadata): Promise<void>;
  deleteDataset(fileName: string): Promise<void>;
  clearMarketingData(): Promise<void>;
  reloadDefaultSeedDataset(): Promise<{ records: MarketingDataRecord[]; metadata: DatasetMetadata }>;

  // Campaigns
  getCampaignBriefs(): Promise<CampaignBrief[]>;
  getCampaignBriefById(id: string): Promise<CampaignBrief | null>;
  saveCampaignBrief(brief: CampaignBrief): Promise<void>;
  deleteCampaignBrief(id: string): Promise<void>;

  // Plans
  getCampaignPlan(campaignId: string): Promise<CampaignPlan | null>;
  saveCampaignPlan(plan: CampaignPlan): Promise<void>;

  // Content Assets
  getContentAssets(campaignId?: string): Promise<ContentAsset[]>;
  saveContentAsset(asset: ContentAsset): Promise<void>;
  deleteContentAsset(id: string): Promise<void>;

  // Feedback Memory
  getFeedbackMemory(): Promise<FeedbackMemoryItem[]>;
  saveFeedbackMemory(item: FeedbackMemoryItem): Promise<void>;
  deleteFeedbackMemory(id: string): Promise<void>;

  // Brand Kit
  getBrandKit(): Promise<BrandKit>;
  saveBrandKit(kit: BrandKit): Promise<void>;

  // Products
  getProducts(): Promise<ProductService[]>;
  saveProduct(product: ProductService): Promise<void>;
  deleteProduct(id: string): Promise<void>;

  // References
  getCampaignReferences(): Promise<CampaignReference[]>;
  saveCampaignReference(ref: CampaignReference): Promise<void>;
  deleteCampaignReference(id: string): Promise<void>;

  // Widgets
  getWidgetPreferences(): Promise<WidgetPreference[]>;
  saveWidgetPreferences(widgets: WidgetPreference[]): Promise<void>;

  // Staff
  getStaffMembers(): Promise<StaffMember[]>;
  saveStaffMember(staff: StaffMember): Promise<void>;
  deleteStaffMember(id: string): Promise<void>;

  // Settings
  getAppSettings(): Promise<AppSettings>;
  saveAppSettings(settings: AppSettings): Promise<void>;

  // Backup & Reset
  exportAllData(): Promise<string>;
  importAllData(jsonString: string): Promise<boolean>;
  initializeSeedData(): Promise<void>;
}

class IndexedDBRepository implements StorageRepository {
  async getMarketingData(): Promise<MarketingDataRecord[]> {
    return getAllFromStore<MarketingDataRecord>(STORES.MARKETING_DATA);
  }

  async saveMarketingData(records: MarketingDataRecord[]): Promise<void> {
    return saveBatchToStore(STORES.MARKETING_DATA, records);
  }

  async getDatasetMetadata(): Promise<DatasetMetadata[]> {
    const all = await getAllFromStore<DatasetMetadata>(STORES.DATASET_METADATA);
    // Deduplicate by fileName or ID
    const uniqueMap = new Map<string, DatasetMetadata>();
    for (const item of all) {
      const key = item.fileName || item.id;
      if (!uniqueMap.has(key) || item.isActive) {
        uniqueMap.set(key, item);
      }
    }
    const result = Array.from(uniqueMap.values());
    if (result.length > 0 && !result.some((m) => m.isActive)) {
      result[0].isActive = true;
    }
    return result;
  }

  async saveDatasetMetadata(meta: DatasetMetadata): Promise<void> {
    const all = await getAllFromStore<DatasetMetadata>(STORES.DATASET_METADATA);
    for (const item of all) {
      if (item.fileName === meta.fileName || item.id === meta.id) {
        await deleteFromStore(STORES.DATASET_METADATA, item.id || item.fileName);
      } else {
        await saveToStore(STORES.DATASET_METADATA, { ...item, isActive: false });
      }
    }
    await saveToStore(STORES.DATASET_METADATA, { ...meta, isActive: true });
  }

  async getCampaignBriefs(): Promise<CampaignBrief[]> {
    return getAllFromStore<CampaignBrief>(STORES.CAMPAIGNS);
  }

  async getCampaignBriefById(id: string): Promise<CampaignBrief | null> {
    return getByIdFromStore<CampaignBrief>(STORES.CAMPAIGNS, id);
  }

  async saveCampaignBrief(brief: CampaignBrief): Promise<void> {
    return saveToStore(STORES.CAMPAIGNS, brief);
  }

  async deleteCampaignBrief(id: string): Promise<void> {
    await deleteFromStore(STORES.CAMPAIGNS, id);
    await deleteFromStore(STORES.CAMPAIGN_PLANS, id);
  }

  async getCampaignPlan(campaignId: string): Promise<CampaignPlan | null> {
    return getByIdFromStore<CampaignPlan>(STORES.CAMPAIGN_PLANS, campaignId);
  }

  async saveCampaignPlan(plan: CampaignPlan): Promise<void> {
    return saveToStore(STORES.CAMPAIGN_PLANS, plan);
  }

  async getContentAssets(campaignId?: string): Promise<ContentAsset[]> {
    const assets = await getAllFromStore<ContentAsset>(STORES.CONTENT_ASSETS);
    if (campaignId) {
      return assets.filter((a) => a.campaignId === campaignId);
    }
    return assets;
  }

  async saveContentAsset(asset: ContentAsset): Promise<void> {
    return saveToStore(STORES.CONTENT_ASSETS, asset);
  }

  async deleteContentAsset(id: string): Promise<void> {
    return deleteFromStore(STORES.CONTENT_ASSETS, id);
  }

  async getFeedbackMemory(): Promise<FeedbackMemoryItem[]> {
    return getAllFromStore<FeedbackMemoryItem>(STORES.FEEDBACK_MEMORY);
  }

  async saveFeedbackMemory(item: FeedbackMemoryItem): Promise<void> {
    return saveToStore(STORES.FEEDBACK_MEMORY, item);
  }

  async deleteFeedbackMemory(id: string): Promise<void> {
    return deleteFromStore(STORES.FEEDBACK_MEMORY, id);
  }

  async getBrandKit(): Promise<BrandKit> {
    const kit = await getByIdFromStore<BrandKit>(STORES.BRAND_KIT, '3 Dimensions');
    return kit || INITIAL_BRAND_KIT;
  }

  async saveBrandKit(kit: BrandKit): Promise<void> {
    return saveToStore(STORES.BRAND_KIT, kit);
  }

  async getProducts(): Promise<ProductService[]> {
    return getAllFromStore<ProductService>(STORES.PRODUCTS_SERVICES);
  }

  async saveProduct(product: ProductService): Promise<void> {
    return saveToStore(STORES.PRODUCTS_SERVICES, product);
  }

  async deleteProduct(id: string): Promise<void> {
    return deleteFromStore(STORES.PRODUCTS_SERVICES, id);
  }

  async getCampaignReferences(): Promise<CampaignReference[]> {
    return getAllFromStore<CampaignReference>(STORES.CAMPAIGN_REFERENCES);
  }

  async saveCampaignReference(ref: CampaignReference): Promise<void> {
    return saveToStore(STORES.CAMPAIGN_REFERENCES, ref);
  }

  async deleteCampaignReference(id: string): Promise<void> {
    return deleteFromStore(STORES.CAMPAIGN_REFERENCES, id);
  }

  async getWidgetPreferences(): Promise<WidgetPreference[]> {
    const widgets = await getAllFromStore<WidgetPreference>(STORES.WIDGET_PREFERENCES);
    return widgets.length > 0
      ? widgets.sort((a, b) => a.order - b.order)
      : INITIAL_WIDGETS;
  }

  async saveWidgetPreferences(widgets: WidgetPreference[]): Promise<void> {
    return saveBatchToStore(STORES.WIDGET_PREFERENCES, widgets);
  }

  async getStaffMembers(): Promise<StaffMember[]> {
    return getAllFromStore<StaffMember>(STORES.STAFF_MEMBERS);
  }

  async deleteDataset(fileName: string): Promise<void> {
    const allMeta = await getAllFromStore<DatasetMetadata>(STORES.DATASET_METADATA);
    for (const m of allMeta) {
      if (m.fileName === fileName || m.id === fileName) {
        await deleteFromStore(STORES.DATASET_METADATA, m.fileName);
        if (m.id) await deleteFromStore(STORES.DATASET_METADATA, m.id);
      }
    }
  }

  async clearMarketingData(): Promise<void> {
    await clearStore(STORES.MARKETING_DATA);
    await clearStore(STORES.DATASET_METADATA);
  }

  async reloadDefaultSeedDataset(): Promise<{ records: MarketingDataRecord[]; metadata: DatasetMetadata }> {
    await clearStore(STORES.MARKETING_DATA);
    await clearStore(STORES.DATASET_METADATA);
    const { records, metadata } = parseMetaCSV(RAW_META_CSV, 'Official_Meta_Dataset_2026.csv');
    if (records.length > 0) {
      await this.saveMarketingData(records);
      await this.saveDatasetMetadata(metadata);
    }
    return { records, metadata };
  }

  async saveStaffMember(staff: StaffMember): Promise<void> {
    return saveToStore(STORES.STAFF_MEMBERS, staff);
  }

  async deleteStaffMember(id: string): Promise<void> {
    return deleteFromStore(STORES.STAFF_MEMBERS, id);
  }

  async getAppSettings(): Promise<AppSettings> {
    const stored = await getByIdFromStore<{ key: string; value: AppSettings }>(
      STORES.APP_SETTINGS,
      'global_settings'
    );
    return stored ? stored.value : INITIAL_APP_SETTINGS;
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    return saveToStore(STORES.APP_SETTINGS, { key: 'global_settings', value: settings });
  }

  async exportAllData(): Promise<string> {
    const data = {
      marketing_data: await this.getMarketingData(),
      dataset_metadata: await this.getDatasetMetadata(),
      campaigns: await this.getCampaignBriefs(),
      campaign_plans: await getAllFromStore<CampaignPlan>(STORES.CAMPAIGN_PLANS),
      content_assets: await this.getContentAssets(),
      feedback_memory: await this.getFeedbackMemory(),
      brand_kit: await this.getBrandKit(),
      products_services: await this.getProducts(),
      campaign_references: await this.getCampaignReferences(),
      widget_preferences: await this.getWidgetPreferences(),
      staff_members: await this.getStaffMembers(),
      app_settings: await this.getAppSettings(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  async importAllData(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.marketing_data) await saveBatchToStore(STORES.MARKETING_DATA, parsed.marketing_data);
      if (parsed.dataset_metadata && Array.isArray(parsed.dataset_metadata)) {
        await saveBatchToStore(STORES.DATASET_METADATA, parsed.dataset_metadata);
      }
      if (parsed.campaigns) await saveBatchToStore(STORES.CAMPAIGNS, parsed.campaigns);
      if (parsed.campaign_plans) await saveBatchToStore(STORES.CAMPAIGN_PLANS, parsed.campaign_plans);
      if (parsed.content_assets) await saveBatchToStore(STORES.CONTENT_ASSETS, parsed.content_assets);
      if (parsed.feedback_memory) await saveBatchToStore(STORES.FEEDBACK_MEMORY, parsed.feedback_memory);
      if (parsed.brand_kit) await saveToStore(STORES.BRAND_KIT, parsed.brand_kit);
      if (parsed.products_services) await saveBatchToStore(STORES.PRODUCTS_SERVICES, parsed.products_services);
      if (parsed.campaign_references) await saveBatchToStore(STORES.CAMPAIGN_REFERENCES, parsed.campaign_references);
      if (parsed.widget_preferences) await saveBatchToStore(STORES.WIDGET_PREFERENCES, parsed.widget_preferences);
      if (parsed.staff_members) await saveBatchToStore(STORES.STAFF_MEMBERS, parsed.staff_members);
      if (parsed.app_settings) await this.saveAppSettings(parsed.app_settings);
      return true;
    } catch (e) {
      console.error('Failed to import backup JSON:', e);
      return false;
    }
  }

  async initializeSeedData(): Promise<void> {
    const MIGRATION_KEY = '3d_assistant_migration_v3_clean_seed_data';
    const migrationDone = typeof localStorage !== 'undefined' && localStorage.getItem(MIGRATION_KEY);

    if (!migrationDone) {
      // 1. Remove fabricated product/service records
      const existingProducts = await getAllFromStore<ProductService>(STORES.PRODUCTS_SERVICES);
      const knownFabricatedIds = ['p1', 'p2', 'p3', 'p4', 'p5'];
      for (const p of existingProducts) {
        if (
          knownFabricatedIds.includes(p.id) ||
          p.name.includes('Infinity Fidget Cube') ||
          p.name.includes('Custom B2B Batch') ||
          p.name.includes('Detailed Architectural') ||
          p.name.includes('3D Scanning Service') ||
          p.name.includes('Formula 1 Keychains')
        ) {
          await deleteFromStore(STORES.PRODUCTS_SERVICES, p.id);
        }
      }

      // 2. Remove fabricated staff members
      const existingStaff = await getAllFromStore<StaffMember>(STORES.STAFF_MEMBERS);
      const knownStaffIds = ['s1', 's2', 's3', 's4', 's5', 's6'];
      for (const s of existingStaff) {
        if (knownStaffIds.includes(s.id)) {
          await deleteFromStore(STORES.STAFF_MEMBERS, s.id);
        }
      }

      // 3. Reset Brand Kit to contain only Company Name = "3 Dimensions"
      await saveToStore(STORES.BRAND_KIT, INITIAL_BRAND_KIT);

      // 4. Re-parse Meta CSV to fix column mapping (reactions=308, comments=8, shares=18, totalEngagement=334)
      await clearStore(STORES.DATASET_METADATA);
      await clearStore(STORES.MARKETING_DATA);
      const { records, metadata } = parseMetaCSV(RAW_META_CSV, 'Official_Meta_Dataset_2026.csv');
      await saveBatchToStore(STORES.MARKETING_DATA, records);
      await this.saveDatasetMetadata(metadata);

      // 5. Reset Widget Preferences
      await clearStore(STORES.WIDGET_PREFERENCES);
      await saveBatchToStore(STORES.WIDGET_PREFERENCES, INITIAL_WIDGETS);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MIGRATION_KEY, 'true');
      }
    }

    // Standard seed fallback if stores are empty
    const existingData = await this.getMarketingData();
    if (existingData.length === 0) {
      const { records, metadata } = parseMetaCSV(RAW_META_CSV, 'Official_Meta_Dataset_2026.csv');
      if (records.length > 0) {
        await this.saveMarketingData(records);
        await this.saveDatasetMetadata(metadata);
      }
    }

    const existingBrand = await getByIdFromStore<BrandKit>(STORES.BRAND_KIT, '3 Dimensions');
    if (!existingBrand) {
      await this.saveBrandKit(INITIAL_BRAND_KIT);
    }

    const existingWidgets = await getAllFromStore<WidgetPreference>(STORES.WIDGET_PREFERENCES);
    if (existingWidgets.length === 0) {
      await saveBatchToStore(STORES.WIDGET_PREFERENCES, INITIAL_WIDGETS);
    }
  }
}

export const repository: StorageRepository = new IndexedDBRepository();
