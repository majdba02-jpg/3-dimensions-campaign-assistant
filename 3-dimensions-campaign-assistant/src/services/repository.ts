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
  CustomRole,
  DEFAULT_STAFF_ROLES,
  WidgetPreference,
  AppSettings,
  CalendarItem,
  CampaignDirection,
  CampaignComponent,
  CustomCampaignType,
  CustomTargetAudience,
  LocationGroup,
} from '../types';
import {
  STORES,
  getAllFromStore,
  getByIdFromStore,
  saveToStore,
  saveBatchToStore,
  deleteFromStore,
  clearStore,
  executeMultiStoreTransaction,
} from './db';
import { parseMetaCSV } from './csvParser';
import { RAW_META_CSV } from '../data/seedMetaDataset';
import {
  INITIAL_STAFF,
  INITIAL_BRAND_KIT,
  INITIAL_PRODUCTS,
  INITIAL_WIDGETS,
  INITIAL_APP_SETTINGS,
  INITIAL_SEED_CAMPAIGN_BRIEF,
  INITIAL_SEED_CAMPAIGN_PLAN,
  INITIAL_SEED_CONTENT_ASSETS,
} from '../data/seedDefaults';

export interface StorageRepository {
  // Marketing Data
  getMarketingData(): Promise<MarketingDataRecord[]>;
  saveMarketingData(records: MarketingDataRecord[]): Promise<void>;
  getDatasetMetadata(): Promise<DatasetMetadata[]>;
  saveDatasetMetadata(meta: DatasetMetadata): Promise<void>;
  setActiveDataset(datasetIdOrFileName: string): Promise<void>;
  deleteDataset(fileName: string): Promise<void>;
  clearMarketingData(): Promise<void>;
  reloadDefaultSeedDataset(): Promise<{ records: MarketingDataRecord[]; metadata: DatasetMetadata }>;

  // Campaigns
  getCampaignBriefs(): Promise<CampaignBrief[]>;
  getCampaignBriefById(id: string): Promise<CampaignBrief | null>;
  saveCampaignBrief(brief: CampaignBrief): Promise<void>;
  deleteCampaignBrief(id: string): Promise<void>;
  duplicateCampaign(campaignId: string): Promise<{
    brief: CampaignBrief;
    plan: CampaignPlan | null;
    assets: ContentAsset[];
  }>;

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
  clearFeedbackMemory(): Promise<void>;

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

  // Staff & Roles
  getStaffMembers(): Promise<StaffMember[]>;
  saveStaffMember(staff: StaffMember): Promise<void>;
  deleteStaffMember(id: string): Promise<void>;
  getCustomRoles(): Promise<CustomRole[]>;
  saveCustomRole(name: string): Promise<CustomRole>;
  updateCustomRole(id: string, newName: string): Promise<{ success: boolean; error?: string; role?: CustomRole }>;
  deleteCustomRole(id: string): Promise<{ success: boolean; error?: string; assignedStaffCount?: number }>;

  // Custom Campaign Types
  getCustomCampaignTypes(): Promise<CustomCampaignType[]>;
  saveCustomCampaignType(name: string): Promise<CustomCampaignType>;
  updateCustomCampaignType(id: string, newName: string): Promise<{ success: boolean; error?: string; item?: CustomCampaignType }>;
  deleteCustomCampaignType(id: string): Promise<{ success: boolean; error?: string }>;

  // Custom Target Audiences
  getCustomTargetAudiences(): Promise<CustomTargetAudience[]>;
  saveCustomTargetAudience(name: string, description?: string): Promise<CustomTargetAudience>;
  updateCustomTargetAudience(id: string, newName: string, description?: string): Promise<{ success: boolean; error?: string; item?: CustomTargetAudience }>;
  deleteCustomTargetAudience(id: string): Promise<{ success: boolean; error?: string }>;

  // Location Groups
  getCustomLocationGroups(): Promise<LocationGroup[]>;
  saveCustomLocationGroup(group: LocationGroup): Promise<void>;
  deleteCustomLocationGroup(id: string): Promise<{ success: boolean; error?: string }>;

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
    await saveToStore(STORES.CAMPAIGNS, brief);
    const assets = await this.getContentAssets(brief.id);
    if (assets.length > 0) {
      const updatedAssets = assets.map((a) => ({ ...a, campaignName: brief.name }));
      await saveBatchToStore(STORES.CONTENT_ASSETS, updatedAssets);
    }
  }

  async deleteCampaignBrief(id: string): Promise<void> {
    const allAssets = await getAllFromStore<ContentAsset>(STORES.CONTENT_ASSETS);
    const campaignAssetIds = allAssets.filter((a) => a.campaignId === id).map((a) => a.id);

    await executeMultiStoreTransaction(
      [STORES.CAMPAIGNS, STORES.CAMPAIGN_PLANS, STORES.CONTENT_ASSETS],
      (stores) => {
        stores[STORES.CAMPAIGNS].delete(id);
        stores[STORES.CAMPAIGN_PLANS].delete(id);
        for (const astId of campaignAssetIds) {
          stores[STORES.CONTENT_ASSETS].delete(astId);
        }
      }
    );
  }

  async duplicateCampaign(campaignId: string): Promise<{
    brief: CampaignBrief;
    plan: CampaignPlan | null;
    assets: ContentAsset[];
  }> {
    const origBrief = await this.getCampaignBriefById(campaignId);
    if (!origBrief) {
      throw new Error(`Campaign with ID "${campaignId}" was not found.`);
    }

    const origPlan = await this.getCampaignPlan(campaignId);
    const origAssets = await this.getContentAssets(campaignId);

    const newCampaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newCampaignName = `Copy of ${origBrief.name}`;
    const nowIso = new Date().toISOString();

    const newBrief: CampaignBrief = {
      ...origBrief,
      id: newCampaignId,
      name: newCampaignName,
      status: 'Draft',
      createdAt: nowIso,
      updatedAt: nowIso,
      selectedDirectionId: origPlan ? `dir_${newCampaignId}` : origBrief.selectedDirectionId,
    };

    if (!origPlan) {
      await executeMultiStoreTransaction([STORES.CAMPAIGNS], (stores) => {
        stores[STORES.CAMPAIGNS].put(newBrief);
      });
      return {
        brief: newBrief,
        plan: null,
        assets: [],
      };
    }

    // 1. Deep copy calendar items with new IDs
    const newCalendar: CalendarItem[] = (origPlan.calendar || []).map((item, idx) => {
      const newCalId = `cal_${newCampaignId}_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`;
      return {
        ...item,
        id: newCalId,
        campaignId: newCampaignId,
        status: 'Draft', // Reset human approval/workflow status
        concernedPeopleIds: Array.isArray(item.concernedPeopleIds) ? [...item.concernedPeopleIds] : [],
        hashtags: Array.isArray(item.hashtags) ? [...item.hashtags] : [],
        platformSpecificCopy: item.platformSpecificCopy ? { ...item.platformSpecificCopy } : undefined,
      };
    });

    // 2. Deep copy strategic direction
    const newDirection: CampaignDirection = {
      ...origPlan.selectedDirection,
      id: `dir_${newCampaignId}`,
      campaignId: newCampaignId,
      suggestedPillars: Array.isArray(origPlan.selectedDirection?.suggestedPillars)
        ? [...origPlan.selectedDirection.suggestedPillars]
        : [],
    };

    // 3. Deep copy components preserving lock states
    const newComponents: Record<string, CampaignComponent> = {};
    if (origPlan.components && typeof origPlan.components === 'object') {
      for (const [k, v] of Object.entries(origPlan.components)) {
        newComponents[k] = {
          ...v,
          id: v.id || k,
          isLocked: !!v.isLocked,
          lastUpdated: nowIso,
        };
      }
    }

    // 4. Deep copy campaign plan
    const newPlan: CampaignPlan = {
      ...origPlan,
      id: newCampaignId,
      campaignId: newCampaignId,
      selectedDirection: newDirection,
      concept: origPlan.concept,
      coreMessage: origPlan.coreMessage,
      valueProposition: origPlan.valueProposition,
      factualStatus: origPlan.factualStatus,
      contentPillars: Array.isArray(origPlan.contentPillars) ? [...origPlan.contentPillars] : [],
      recommendedCadence: origPlan.recommendedCadence ? { ...origPlan.recommendedCadence } : undefined,
      recommendedFormats: Array.isArray(origPlan.recommendedFormats) ? [...origPlan.recommendedFormats] : [],
      contentMixRationale: origPlan.contentMixRationale,
      productionEffortEstimate: origPlan.productionEffortEstimate,
      visualDirection: origPlan.visualDirection,
      designerBrief: origPlan.designerBrief,
      videographerBrief: origPlan.videographerBrief,
      shotList: Array.isArray(origPlan.shotList) ? [...origPlan.shotList] : [],
      hooksAndCTAs: Array.isArray(origPlan.hooksAndCTAs) ? origPlan.hooksAndCTAs.map((h) => ({ ...h })) : [],
      hashtags: Array.isArray(origPlan.hashtags) ? [...origPlan.hashtags] : [],
      suggestedKPIs: Array.isArray(origPlan.suggestedKPIs) ? [...origPlan.suggestedKPIs] : [],
      postPublicationRecommendations: origPlan.postPublicationRecommendations,
      calendar: newCalendar,
      components: newComponents,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 5. Deep copy content assets matching calendar items
    const newAssets: ContentAsset[] = newCalendar.map((newCalItem, idx) => {
      const origCalItem = (origPlan.calendar || [])[idx];
      const matchedOrigAsset = origAssets.find(
        (a) => (origCalItem && a.id === `ast_${origCalItem.id}`) ||
               (origCalItem && a.title === origCalItem.topic && a.scheduledDate === origCalItem.date) ||
               a.id === `ast_${idx}`
      ) || origAssets[idx];

      const newAssetId = `ast_${newCalItem.id}`;
      const caption = matchedOrigAsset?.caption ?? newCalItem.caption;
      const script = matchedOrigAsset?.scriptOrStoryboard ?? (newCalItem.reelScript || newCalItem.visualNotes || '');
      const hook = matchedOrigAsset?.hook ?? newCalItem.hook;
      const cta = matchedOrigAsset?.cta ?? newCalItem.cta;
      const isLocked = matchedOrigAsset ? !!matchedOrigAsset.isLocked : false;
      const hashtags = matchedOrigAsset?.hashtags ? [...matchedOrigAsset.hashtags] : [...(newCalItem.hashtags || [])];
      const requiredAssets = matchedOrigAsset?.requiredAssets ? [...matchedOrigAsset.requiredAssets] : [];

      return {
        id: newAssetId,
        campaignId: newCampaignId,
        campaignName: newCampaignName,
        title: matchedOrigAsset?.title || newCalItem.topic,
        format: matchedOrigAsset?.format || newCalItem.format,
        platform: matchedOrigAsset?.platform || newCalItem.platform,
        scheduledDate: matchedOrigAsset?.scheduledDate || newCalItem.date,
        hook,
        caption,
        scriptOrStoryboard: script,
        cta,
        hashtags,
        creativeBrief: matchedOrigAsset?.creativeBrief || newPlan.designerBrief || '',
        visualDirection: matchedOrigAsset?.visualDirection || newPlan.visualDirection || '',
        requiredAssets,
        status: 'Needs Review', // Reset review status
        isLocked, // Preserve lock state
        versions: [
          {
            versionNumber: 1,
            caption,
            scriptOrStoryboard: script,
            cta,
            updatedAt: nowIso,
            updatedBy: 'Duplicated Plan',
          },
        ],
        comments: [], // Do NOT copy review comments
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });

    // 6. Execute atomic transaction across all related stores
    await executeMultiStoreTransaction(
      [STORES.CAMPAIGNS, STORES.CAMPAIGN_PLANS, STORES.CONTENT_ASSETS],
      (stores) => {
        stores[STORES.CAMPAIGNS].put(newBrief);
        stores[STORES.CAMPAIGN_PLANS].put(newPlan);
        for (const ast of newAssets) {
          stores[STORES.CONTENT_ASSETS].put(ast);
        }
      }
    );

    return {
      brief: newBrief,
      plan: newPlan,
      assets: newAssets,
    };
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

  async clearFeedbackMemory(): Promise<void> {
    return clearStore(STORES.FEEDBACK_MEMORY);
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

  async setActiveDataset(datasetIdOrFileName: string): Promise<void> {
    const allMeta = await getAllFromStore<DatasetMetadata>(STORES.DATASET_METADATA);
    for (const m of allMeta) {
      const match = m.id === datasetIdOrFileName || m.fileName === datasetIdOrFileName;
      await saveToStore(STORES.DATASET_METADATA, { ...m, isActive: match });
    }
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

  async getCustomRoles(): Promise<CustomRole[]> {
    const roles = await getAllFromStore<CustomRole>(STORES.CUSTOM_ROLES);
    return roles.sort((a, b) => a.name.localeCompare(b.name));
  }

  async saveCustomRole(name: string): Promise<CustomRole> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Role name cannot be empty.');
    }

    // Check against default system roles (case-insensitive)
    const isDefaultDuplicate = DEFAULT_STAFF_ROLES.some(
      (r) => r.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDefaultDuplicate) {
      throw new Error(`"${trimmed}" is already a system default role.`);
    }

    // Check against existing custom roles (case-insensitive)
    const existing = await getAllFromStore<CustomRole>(STORES.CUSTOM_ROLES);
    const existingDuplicate = existing.find(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existingDuplicate) {
      return existingDuplicate;
    }

    const newRole: CustomRole = {
      id: `role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
    };

    await saveToStore(STORES.CUSTOM_ROLES, newRole);
    return newRole;
  }

  async updateCustomRole(
    id: string,
    newName: string
  ): Promise<{ success: boolean; error?: string; role?: CustomRole }> {
    const trimmed = newName.trim();
    if (!trimmed) {
      return { success: false, error: 'Role name cannot be empty.' };
    }

    // Check against default system roles
    const isDefaultDuplicate = DEFAULT_STAFF_ROLES.some(
      (r) => r.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDefaultDuplicate) {
      return {
        success: false,
        error: `Cannot rename to "${trimmed}" because it is already a default system role.`,
      };
    }

    const existing = await getAllFromStore<CustomRole>(STORES.CUSTOM_ROLES);
    const current = existing.find((r) => r.id === id);
    if (!current) {
      return { success: false, error: 'Custom role not found.' };
    }

    // Check if another custom role already has this name
    const nameCollision = existing.find(
      (r) => r.id !== id && r.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (nameCollision) {
      return {
        success: false,
        error: `Another custom role with the name "${trimmed}" already exists.`,
      };
    }

    const oldName = current.name;
    const updatedRole: CustomRole = {
      ...current,
      name: trimmed,
    };

    await saveToStore(STORES.CUSTOM_ROLES, updatedRole);

    // Safely update all staff members whose role matched the old name
    const allStaff = await getAllFromStore<StaffMember>(STORES.STAFF_MEMBERS);
    for (const staff of allStaff) {
      if (staff.role.toLowerCase() === oldName.toLowerCase()) {
        await saveToStore(STORES.STAFF_MEMBERS, {
          ...staff,
          role: trimmed,
        });
      }
    }

    return { success: true, role: updatedRole };
  }

  async deleteCustomRole(
    id: string
  ): Promise<{ success: boolean; error?: string; assignedStaffCount?: number }> {
    const existing = await getAllFromStore<CustomRole>(STORES.CUSTOM_ROLES);
    const current = existing.find((r) => r.id === id);
    if (!current) {
      return { success: false, error: 'Custom role not found.' };
    }

    // Check if currently assigned to any staff member
    const allStaff = await getAllFromStore<StaffMember>(STORES.STAFF_MEMBERS);
    const assignedStaff = allStaff.filter(
      (s) => s.role.toLowerCase() === current.name.toLowerCase()
    );

    if (assignedStaff.length > 0) {
      return {
        success: false,
        assignedStaffCount: assignedStaff.length,
        error: `This role is currently assigned to ${assignedStaff.length} team member${
          assignedStaff.length > 1 ? 's' : ''
        }. Choose another role for them before deleting it.`,
      };
    }

    await deleteFromStore(STORES.CUSTOM_ROLES, id);
    return { success: true };
  }

  // Custom Campaign Types
  async getCustomCampaignTypes(): Promise<CustomCampaignType[]> {
    return getAllFromStore<CustomCampaignType>(STORES.CUSTOM_CAMPAIGN_TYPES);
  }

  async saveCustomCampaignType(name: string): Promise<CustomCampaignType> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Campaign type name cannot be empty.');
    const existing = await this.getCustomCampaignTypes();
    const duplicate = existing.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return duplicate;

    const newType: CustomCampaignType = {
      id: `ctype_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
    };
    await saveToStore(STORES.CUSTOM_CAMPAIGN_TYPES, newType);
    return newType;
  }

  async updateCustomCampaignType(
    id: string,
    newName: string
  ): Promise<{ success: boolean; error?: string; item?: CustomCampaignType }> {
    const trimmed = newName.trim();
    if (!trimmed) return { success: false, error: 'Campaign type name cannot be empty.' };

    const existing = await this.getCustomCampaignTypes();
    const current = existing.find((t) => t.id === id);
    if (!current) return { success: false, error: 'Campaign type not found.' };

    const duplicate = existing.find(
      (t) => t.id !== id && t.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: `A campaign type named "${trimmed}" already exists.` };
    }

    const updated: CustomCampaignType = { ...current, name: trimmed };
    await saveToStore(STORES.CUSTOM_CAMPAIGN_TYPES, updated);
    return { success: true, item: updated };
  }

  async deleteCustomCampaignType(id: string): Promise<{ success: boolean; error?: string }> {
    await deleteFromStore(STORES.CUSTOM_CAMPAIGN_TYPES, id);
    return { success: true };
  }

  // Custom Target Audiences
  async getCustomTargetAudiences(): Promise<CustomTargetAudience[]> {
    return getAllFromStore<CustomTargetAudience>(STORES.CUSTOM_TARGET_AUDIENCES);
  }

  async saveCustomTargetAudience(name: string, description?: string): Promise<CustomTargetAudience> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Target audience name cannot be empty.');
    const existing = await this.getCustomTargetAudiences();
    const duplicate = existing.find((a) => a.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return duplicate;

    const newAudience: CustomTargetAudience = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      description: description?.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveToStore(STORES.CUSTOM_TARGET_AUDIENCES, newAudience);
    return newAudience;
  }

  async updateCustomTargetAudience(
    id: string,
    newName: string,
    description?: string
  ): Promise<{ success: boolean; error?: string; item?: CustomTargetAudience }> {
    const trimmed = newName.trim();
    if (!trimmed) return { success: false, error: 'Target audience name cannot be empty.' };

    const existing = await this.getCustomTargetAudiences();
    const current = existing.find((a) => a.id === id);
    if (!current) return { success: false, error: 'Target audience not found.' };

    const duplicate = existing.find(
      (a) => a.id !== id && a.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: `A target audience named "${trimmed}" already exists.` };
    }

    const updated: CustomTargetAudience = {
      ...current,
      name: trimmed,
      description: description?.trim() ?? current.description,
    };
    await saveToStore(STORES.CUSTOM_TARGET_AUDIENCES, updated);
    return { success: true, item: updated };
  }

  async deleteCustomTargetAudience(id: string): Promise<{ success: boolean; error?: string }> {
    await deleteFromStore(STORES.CUSTOM_TARGET_AUDIENCES, id);
    return { success: true };
  }

  // Location Groups
  async getCustomLocationGroups(): Promise<LocationGroup[]> {
    return getAllFromStore<LocationGroup>(STORES.CUSTOM_LOCATION_GROUPS);
  }

  async saveCustomLocationGroup(group: LocationGroup): Promise<void> {
    await saveToStore(STORES.CUSTOM_LOCATION_GROUPS, group);
  }

  async deleteCustomLocationGroup(id: string): Promise<{ success: boolean; error?: string }> {
    await deleteFromStore(STORES.CUSTOM_LOCATION_GROUPS, id);
    return { success: true };
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
      custom_roles: await this.getCustomRoles(),
      custom_campaign_types: await this.getCustomCampaignTypes(),
      custom_target_audiences: await this.getCustomTargetAudiences(),
      custom_location_groups: await this.getCustomLocationGroups(),
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
      if (parsed.custom_roles && Array.isArray(parsed.custom_roles)) {
        await saveBatchToStore(STORES.CUSTOM_ROLES, parsed.custom_roles);
      }
      if (parsed.custom_campaign_types && Array.isArray(parsed.custom_campaign_types)) {
        await saveBatchToStore(STORES.CUSTOM_CAMPAIGN_TYPES, parsed.custom_campaign_types);
      }
      if (parsed.custom_target_audiences && Array.isArray(parsed.custom_target_audiences)) {
        await saveBatchToStore(STORES.CUSTOM_TARGET_AUDIENCES, parsed.custom_target_audiences);
      }
      if (parsed.custom_location_groups && Array.isArray(parsed.custom_location_groups)) {
        await saveBatchToStore(STORES.CUSTOM_LOCATION_GROUPS, parsed.custom_location_groups);
      }
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

    // Seed campaign fallback if campaigns store is empty
    const existingCampaigns = await getAllFromStore<CampaignBrief>(STORES.CAMPAIGNS);
    if (existingCampaigns.length === 0) {
      await saveToStore(STORES.CAMPAIGNS, INITIAL_SEED_CAMPAIGN_BRIEF);
      await saveToStore(STORES.CAMPAIGN_PLANS, INITIAL_SEED_CAMPAIGN_PLAN);
      await saveBatchToStore(STORES.CONTENT_ASSETS, INITIAL_SEED_CONTENT_ASSETS);
    }
  }
}

export const repository: StorageRepository = new IndexedDBRepository();
