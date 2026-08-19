import React, { useState, useEffect } from 'react';
import {
  MarketingDataRecord,
  DatasetMetadata,
  CampaignBrief,
  CampaignDirection,
  CampaignPlan as CampaignPlanType,
  ContentAsset,
  FeedbackMemoryItem,
  BrandKit,
  ProductService,
  StaffMember,
  CustomRole,
  WidgetPreference,
  AppSettings,
  CalendarItem,
  CampaignReference,
} from './types';
import { repository } from './services/repository';
import { validateAndRepairCampaignPlan } from './utils/planValidation';
import { Sidebar, PageId } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { ToastProvider, useToast } from './components/common/Toast';

// Pages
import { MarketingInsights } from './pages/MarketingInsights';
import { CampaignLibrary } from './pages/CampaignLibrary';
import { NewCampaign } from './pages/NewCampaign';
import { CampaignWorkspace } from './pages/CampaignWorkspace';
import { ContentReview } from './pages/ContentReview';
import { DataKnowledge } from './pages/DataKnowledge';
import { SettingsPage } from './pages/Settings';

function MainAppContent() {
  const [currentPage, setCurrentPage] = useState<PageId>('marketing-insights');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const { showToast } = useToast();

  // App State Loaded from Repository Layer (IndexedDB)
  const [marketingRecords, setMarketingRecords] = useState<MarketingDataRecord[]>([]);
  const [datasetMeta, setDatasetMeta] = useState<DatasetMetadata[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignBrief[]>([]);
  const [activeBrief, setActiveBrief] = useState<CampaignBrief | null>(null);
  const [activePlan, setActivePlan] = useState<CampaignPlanType | null>(null);
  const [contentAssets, setContentAssets] = useState<ContentAsset[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [products, setProducts] = useState<ProductService[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPreference[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [feedbackMemory, setFeedbackMemory] = useState<FeedbackMemoryItem[]>([]);
  const [campaignReferences, setCampaignReferences] = useState<CampaignReference[]>([]);
  const [selectedReviewAssetId, setSelectedReviewAssetId] = useState<string | undefined>(undefined);
  const [briefBuilderInitialBrief, setBriefBuilderInitialBrief] = useState<CampaignBrief | null>(null);

  // Initialize DB & Seed Data
  useEffect(() => {
    async function loadData() {
      try {
        await repository.initializeSeedData();

        const [
          records,
          meta,
          briefs,
          kit,
          prods,
          staff,
          roles,
          widgets,
          settings,
          feedback,
          assets,
          refs,
        ] = await Promise.all([
          repository.getMarketingData(),
          repository.getDatasetMetadata(),
          repository.getCampaignBriefs(),
          repository.getBrandKit(),
          repository.getProducts(),
          repository.getStaffMembers(),
          repository.getCustomRoles(),
          repository.getWidgetPreferences(),
          repository.getAppSettings(),
          repository.getFeedbackMemory(),
          repository.getContentAssets(),
          repository.getCampaignReferences(),
        ]);

        setMarketingRecords(records);
        setDatasetMeta(meta);
        setCampaigns(briefs);
        setBrandKit(kit);
        setProducts(prods);
        setStaffMembers(staff);
        setCustomRoles(roles);
        setWidgetPrefs(widgets);
        setAppSettings(settings);
        setFeedbackMemory(feedback);
        setContentAssets(assets);
        setCampaignReferences(refs);

        // Routing & URL Hash Resolution on Initial Load / Refresh
        const hash = window.location.hash;
        let initialPage: PageId = 'marketing-insights';
        let targetCampaignId: string | null = null;

        if (hash.startsWith('#/campaigns/')) {
          targetCampaignId = decodeURIComponent(hash.slice('#/campaigns/'.length));
          initialPage = 'campaign-workspace';
        } else if (hash === '#/campaign-library') {
          initialPage = 'campaign-library';
        } else if (hash === '#/new-campaign') {
          initialPage = 'new-campaign';
        } else if (hash === '#/content-review') {
          initialPage = 'content-review';
        } else if (hash === '#/data-knowledge') {
          initialPage = 'data-knowledge';
        } else if (hash === '#/settings') {
          initialPage = 'settings';
        } else {
          // Check localStorage for saved session
          const savedPage = localStorage.getItem('3d_active_page') as PageId | null;
          const savedCampId = localStorage.getItem('3d_active_campaign_id');
          if (savedPage === 'campaign-workspace' && savedCampId) {
            targetCampaignId = savedCampId;
            initialPage = 'campaign-workspace';
          } else if (savedPage) {
            initialPage = savedPage;
          }
        }

        let selectedBrief: CampaignBrief | null = null;
        let selectedPlan: CampaignPlanType | null = null;

        if (targetCampaignId) {
          selectedBrief = briefs.find((b) => b.id === targetCampaignId) || (await repository.getCampaignBriefById(targetCampaignId)) || null;
          if (selectedBrief) {
            selectedPlan = await repository.getCampaignPlan(selectedBrief.id);
          }
        }

        if (!selectedBrief && briefs.length > 0) {
          selectedBrief = briefs[0];
          selectedPlan = await repository.getCampaignPlan(selectedBrief.id);
        }

        if (selectedBrief) {
          setActiveBrief(selectedBrief);
          if (selectedPlan) setActivePlan(selectedPlan);
        }

        setCurrentPage(initialPage);
      } catch (err) {
        console.error('Failed to initialize application data:', err);
        showToast('Error loading saved database', 'error');
      } finally {
        setIsInitializing(false);
      }
    }

    loadData();
  }, []);

  // Handler: Generate 3 Directions with Gemini
  const handleGenerateDirections = async (brief: CampaignBrief): Promise<CampaignDirection[]> => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          brandKit,
          feedbackMemory,
          campaignReferences,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        const errObj: any = new Error(data.error || 'Failed to generate campaign directions');
        errObj.is503 = data.is503;
        throw errObj;
      }

      showToast('3 Strategic Directions successfully generated!', 'success');
      return data.directions || [];
    } catch (error: any) {
      console.error('Directions error:', error);
      showToast(error.is503 ? 'Gemini is temporarily busy. Please retry.' : ('Error generating directions: ' + error.message), 'error');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Select 1 direction & build complete plan
  const handleSelectDirectionAndBuildPlan = async (
    brief: CampaignBrief,
    selectedDirection: CampaignDirection
  ) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          selectedDirection,
          brandKit,
          products,
          staffMembers,
          feedbackMemory,
          campaignReferences,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        const errObj: any = new Error(data.error || 'Failed to generate campaign plan');
        errObj.is503 = data.is503;
        throw errObj;
      }

      // Run application-side plan validation and date repair
      const completePlan = validateAndRepairCampaignPlan(data.plan, brief);

      // Create ContentAssets for Content Review Workspace
      const createdAssets: ContentAsset[] = completePlan.calendar.map((item) => ({
        id: `ast_${item.id}`,
        campaignId: brief.id,
        campaignName: brief.name,
        title: item.topic,
        format: item.format,
        platform: item.platform,
        scheduledDate: item.date,
        hook: item.hook,
        caption: item.caption,
        scriptOrStoryboard: item.reelScript || item.visualNotes || '',
        cta: item.cta,
        hashtags: item.hashtags || [],
        creativeBrief: completePlan.designerBrief || '',
        visualDirection: completePlan.visualDirection || '',
        requiredAssets: [],
        status: 'Needs Review',
        isLocked: false,
        versions: [
          {
            versionNumber: 1,
            caption: item.caption,
            scriptOrStoryboard: item.reelScript,
            cta: item.cta,
            updatedAt: new Date().toISOString(),
            updatedBy: 'Gemini AI',
          },
        ],
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Save to IndexedDB via Repository Layer
      const updatedBrief: CampaignBrief = {
        ...brief,
        selectedDirectionId: selectedDirection.id || selectedDirection.title,
        status: 'In Progress',
      };

      await repository.saveCampaignBrief(updatedBrief);
      await repository.saveCampaignPlan(completePlan);
      for (const ast of createdAssets) {
        await repository.saveContentAsset(ast);
      }

      // Update Local State
      setCampaigns((prev) => [updatedBrief, ...prev.filter((c) => c.id !== brief.id)]);
      setActiveBrief(updatedBrief);
      setActivePlan(completePlan);
      setContentAssets((prev) => [...createdAssets, ...prev]);

      showToast('Campaign Plan successfully generated & saved!', 'success');
      // Navigate to Campaign Workspace
      localStorage.setItem('3d_active_campaign_id', brief.id);
      localStorage.setItem('3d_active_page', 'campaign-workspace');
      window.location.hash = `#/campaigns/${encodeURIComponent(brief.id)}`;
      setCurrentPage('campaign-workspace');
    } catch (error) {
      console.error('Plan generation error:', error);
      showToast('Failed to generate full campaign plan: ' + (error as any).message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Regenerate Single Component with Lock Protection
  const handleRegenerateComponent = async (
    componentKey: string,
    lockedKeys: string[],
    instructions?: string
  ) => {
    if (!activeBrief || !activePlan) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/gemini/regenerate-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: activeBrief,
          currentPlan: activePlan,
          componentKey,
          lockedKeys,
          userInstructions: instructions,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to regenerate component');
      }

      const updatedVal = data.updatedComponent;
      const updatedPlan: CampaignPlanType = {
        ...activePlan,
        [componentKey]: updatedVal,
        updatedAt: new Date().toISOString(),
      };

      await repository.saveCampaignPlan(updatedPlan);
      setActivePlan(updatedPlan);
      showToast('Component successfully regenerated!', 'success');
    } catch (error) {
      console.error('Regenerate component error:', error);
      showToast('Error regenerating component: ' + (error as any).message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Select campaign from library -> Navigate to Campaign Workspace
  const handleSelectCampaign = async (campaignId: string) => {
    const brief =
      campaigns.find((c) => c.id === campaignId) ||
      (await repository.getCampaignBriefById(campaignId));
    if (!brief) return;

    setActiveBrief(brief);
    const plan = await repository.getCampaignPlan(campaignId);
    setActivePlan(plan);
    const assets = await repository.getContentAssets(campaignId);
    setContentAssets((prev) => [
      ...assets,
      ...prev.filter((a) => a.campaignId !== campaignId),
    ]);

    localStorage.setItem('3d_active_campaign_id', campaignId);
    localStorage.setItem('3d_active_page', 'campaign-workspace');
    window.location.hash = `#/campaigns/${encodeURIComponent(campaignId)}`;
    setCurrentPage('campaign-workspace');
  };

  // Duplicate campaign (true deep copy)
  const handleDuplicateCampaign = async (brief: CampaignBrief) => {
    showToast('Duplicating campaign...', 'info');
    try {
      const { brief: dupBrief, plan: dupPlan, assets: dupAssets } =
        await repository.duplicateCampaign(brief.id);

      setCampaigns((prev) => [dupBrief, ...prev]);
      if (dupAssets && dupAssets.length > 0) {
        setContentAssets((prev) => [...dupAssets, ...prev]);
      }
      showToast('Campaign duplicated successfully.', 'success');
    } catch (error: any) {
      console.error('Campaign duplication error:', error);
      showToast(
        'Failed to duplicate campaign: ' + (error?.message || 'Unknown error'),
        'error'
      );
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      await repository.deleteCampaignBrief(campaignId);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      setContentAssets((prev) => prev.filter((a) => a.campaignId !== campaignId));
      if (activeBrief?.id === campaignId) {
        setActiveBrief(null);
        setActivePlan(null);
      }
      showToast('Campaign deleted.', 'info');
    }
  };

  // Save updated campaign brief (e.g. name or fields)
  const handleSaveBrief = async (updatedBrief: CampaignBrief) => {
    await repository.saveCampaignBrief(updatedBrief);
    setActiveBrief(updatedBrief);
    setCampaigns((prev) =>
      prev.map((c) => (c.id === updatedBrief.id ? updatedBrief : c))
    );
    showToast('Campaign details updated.', 'success');
  };

  // Save updated plan calendar / staff assignments
  const handleSavePlan = async (updatedPlan: CampaignPlanType) => {
    await repository.saveCampaignPlan(updatedPlan);
    setActivePlan(updatedPlan);
    showToast('Campaign Plan changes saved.', 'success');
  };

  // Save content asset edits in review workspace
  const handleSaveContentAsset = async (updatedAsset: ContentAsset) => {
    await repository.saveContentAsset(updatedAsset);
    setContentAssets((prev) =>
      prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a))
    );
    showToast('Content asset updated.', 'success');
  };

  // Save Feedback Memory
  const handleSaveFeedbackMemory = async (memoryItem: FeedbackMemoryItem) => {
    await repository.saveFeedbackMemory(memoryItem);
    setFeedbackMemory((prev) => [memoryItem, ...prev]);
    showToast('Feedback saved to memory context.', 'success');
  };

  // Open asset in review workspace directly from calendar item
  const handleOpenReviewFromCalendar = (calendarItem: CalendarItem) => {
    const asset = contentAssets.find((a) => a.id === `ast_${calendarItem.id}` || a.title === calendarItem.topic);
    if (asset) {
      setSelectedReviewAssetId(asset.id);
    }
    setCurrentPage('content-review');
  };

  // CSV Import handler
  const handleImportNewCSV = async (
    records: MarketingDataRecord[],
    meta: DatasetMetadata
  ) => {
    await repository.saveMarketingData(records);
    await repository.saveDatasetMetadata(meta);
    setMarketingRecords(records);
    setDatasetMeta((prev) => [meta, ...prev.filter((m) => m.fileName !== meta.fileName)]);
    showToast(`Dataset "${meta.fileName}" imported successfully (${records.length} records)`, 'success');
  };

  // Dataset Delete handler
  const handleDeleteDataset = async (fileName: string) => {
    await repository.deleteDataset(fileName);
    const updatedMeta = await repository.getDatasetMetadata();
    setDatasetMeta(updatedMeta);
    showToast(`Dataset "${fileName}" removed.`, 'info');
  };

  // Reload Default Dataset handler
  const handleReloadDefaultDataset = async () => {
    const { records, metadata } = await repository.reloadDefaultSeedDataset();
    setMarketingRecords(records);
    setDatasetMeta([metadata]);
    showToast('Default seed dataset reloaded.', 'success');
  };

  // Clear All Dataset Records handler
  const handleClearAllData = async () => {
    await repository.clearMarketingData();
    setMarketingRecords([]);
    setDatasetMeta([]);
    showToast('All dataset records cleared.', 'info');
  };

  // JSON Export Backup
  const handleExportBackup = async () => {
    const jsonStr = await repository.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3Dimensions_Marketing_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Database backup exported.', 'success');
  };

  // JSON Import Restore
  const handleImportBackup = async (jsonStr: string): Promise<boolean> => {
    const success = await repository.importAllData(jsonStr);
    if (success) {
      const records = await repository.getMarketingData();
      setMarketingRecords(records);
      const briefs = await repository.getCampaignBriefs();
      setCampaigns(briefs);
      showToast('Database successfully restored from backup.', 'success');
    } else {
      showToast('Failed to import backup file.', 'error');
    }
    return success;
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen bg-[#160857] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-[#8478E2] border-t-[#CB19C2] rounded-full animate-spin shadow-lg"></div>
        <div className="text-sm font-bold tracking-wider text-slate-200">
          Loading 3 Dimensions Campaign Assistant...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F7F8FC] overflow-hidden font-sans antialiased text-[#15192B]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => {
          if (page === 'new-campaign') {
            setBriefBuilderInitialBrief(null);
          }
          if (page === 'campaign-workspace') {
            if (activeBrief) {
              window.location.hash = `#/campaigns/${encodeURIComponent(activeBrief.id)}`;
            } else {
              window.location.hash = '#/campaign-library';
              setCurrentPage('campaign-library');
              return;
            }
          } else {
            window.location.hash = `#/${page}`;
          }
          localStorage.setItem('3d_active_page', page);
          setCurrentPage(page);
        }}
        activeCampaignName={activeBrief?.name}
        isGenerating={isGenerating}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          currentPage={currentPage}
          onNavigate={(page) => {
            if (page === 'new-campaign') {
              setBriefBuilderInitialBrief(null);
            }
            if (page === 'campaign-workspace') {
              if (activeBrief) {
                window.location.hash = `#/campaigns/${encodeURIComponent(activeBrief.id)}`;
              } else {
                window.location.hash = '#/campaign-library';
                setCurrentPage('campaign-library');
                return;
              }
            } else {
              window.location.hash = `#/${page}`;
            }
            localStorage.setItem('3d_active_page', page);
            setCurrentPage(page);
          }}
          datasetRecordCount={marketingRecords.length}
        />

        <main className="flex-1 p-6 md:p-8">
          {currentPage === 'marketing-insights' && (
            <MarketingInsights
              records={marketingRecords}
              widgets={widgetPrefs}
              onSaveWidgets={async (newW) => {
                setWidgetPrefs(newW);
                await repository.saveWidgetPreferences(newW);
                showToast('Widget layout updated.', 'info');
              }}
            />
          )}

          {currentPage === 'campaign-library' && (
            <CampaignLibrary
              campaigns={campaigns}
              onSelectCampaign={handleSelectCampaign}
              onNewCampaign={() => {
                setBriefBuilderInitialBrief(null);
                window.location.hash = '#/new-campaign';
                localStorage.setItem('3d_active_page', 'new-campaign');
                setCurrentPage('new-campaign');
              }}
              onDuplicateCampaign={handleDuplicateCampaign}
              onDeleteCampaign={handleDeleteCampaign}
              onEditDraft={(draft) => {
                setBriefBuilderInitialBrief(draft);
                window.location.hash = '#/new-campaign';
                localStorage.setItem('3d_active_page', 'new-campaign');
                setCurrentPage('new-campaign');
              }}
            />
          )}

          {currentPage === 'campaign-workspace' && (
            <CampaignWorkspace
              brief={activeBrief}
              plan={activePlan}
              staffMembers={staffMembers}
              onBackToLibrary={() => {
                window.location.hash = '#/campaign-library';
                localStorage.setItem('3d_active_page', 'campaign-library');
                setCurrentPage('campaign-library');
              }}
              onEditDraft={(draft) => {
                setBriefBuilderInitialBrief(draft);
                window.location.hash = '#/new-campaign';
                localStorage.setItem('3d_active_page', 'new-campaign');
                setCurrentPage('new-campaign');
              }}
              onSavePlan={handleSavePlan}
              onSaveBrief={handleSaveBrief}
              onRegenerateComponent={handleRegenerateComponent}
              isGenerating={isGenerating}
              onOpenContentReview={handleOpenReviewFromCalendar}
            />
          )}

          {currentPage === 'new-campaign' && (
            <NewCampaign
              initialBrief={briefBuilderInitialBrief}
              products={products}
              brandKit={brandKit}
              campaignReferences={campaignReferences}
              onGenerateDirections={handleGenerateDirections}
              onSelectDirectionAndBuildPlan={handleSelectDirectionAndBuildPlan}
              isGenerating={isGenerating}
            />
          )}

          {currentPage === 'content-review' && (
            <ContentReview
              assets={contentAssets}
              staffMembers={staffMembers}
              onSaveAsset={handleSaveContentAsset}
              onSaveFeedbackMemory={handleSaveFeedbackMemory}
              selectedAssetId={selectedReviewAssetId}
              activeBrief={activeBrief}
            />
          )}

          {currentPage === 'data-knowledge' && (
            <DataKnowledge
              brandKit={brandKit!}
              products={products}
              feedbackMemory={feedbackMemory}
              datasetMetadata={datasetMeta}
              marketingRecords={marketingRecords}
              campaignReferences={campaignReferences}
              onSaveBrandKit={async (kit) => {
                setBrandKit(kit);
                await repository.saveBrandKit(kit);
                showToast('Brand Kit updated.', 'success');
              }}
              onSaveProduct={async (prod) => {
                await repository.saveProduct(prod);
                setProducts(await repository.getProducts());
                showToast('Product catalog updated.', 'success');
              }}
              onDeleteProduct={async (pId) => {
                await repository.deleteProduct(pId);
                setProducts(await repository.getProducts());
                showToast('Product deleted.', 'info');
              }}
              onSaveCampaignReference={async (ref) => {
                await repository.saveCampaignReference(ref);
                setCampaignReferences(await repository.getCampaignReferences());
                showToast('Benchmark Campaign Reference added.', 'success');
              }}
              onDeleteCampaignReference={async (refId) => {
                await repository.deleteCampaignReference(refId);
                setCampaignReferences(await repository.getCampaignReferences());
                showToast('Campaign Reference removed.', 'info');
              }}
              onImportNewCSV={handleImportNewCSV}
              onSetActiveDataset={async (fileName) => {
                await repository.setActiveDataset(fileName);
                const updatedMeta = await repository.getDatasetMetadata();
                const updatedRecords = await repository.getMarketingData();
                setDatasetMeta(updatedMeta);
                setMarketingRecords(updatedRecords);
                showToast(`Active dataset switched to "${fileName}".`, 'success');
              }}
              onDeleteDataset={handleDeleteDataset}
              onReloadDefaultDataset={handleReloadDefaultDataset}
              onClearAllData={handleClearAllData}
              onDeleteFeedbackMemory={async (id) => {
                await repository.deleteFeedbackMemory(id);
                setFeedbackMemory(await repository.getFeedbackMemory());
                showToast('Feedback memory entry removed.', 'info');
              }}
              onClearFeedbackMemory={async () => {
                await repository.clearFeedbackMemory();
                setFeedbackMemory([]);
                showToast('All feedback memories cleared.', 'info');
              }}
              onRefreshData={async () => {
                const [prods, refs, feedback, meta, records] = await Promise.all([
                  repository.getProducts(),
                  repository.getCampaignReferences(),
                  repository.getFeedbackMemory(),
                  repository.getDatasetMetadata(),
                  repository.getMarketingData(),
                ]);
                setProducts(prods);
                setCampaignReferences(refs);
                setFeedbackMemory(feedback);
                setDatasetMeta(meta);
                setMarketingRecords(records);
              }}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsPage
              staffMembers={staffMembers}
              customRoles={customRoles}
              appSettings={appSettings!}
              onSaveStaff={async (s) => {
                await repository.saveStaffMember(s);
                setStaffMembers(await repository.getStaffMembers());
                showToast('Staff member directory updated.', 'success');
              }}
              onDeleteStaff={async (sId) => {
                await repository.deleteStaffMember(sId);
                setStaffMembers(await repository.getStaffMembers());
                showToast('Staff member removed.', 'info');
              }}
              onSaveCustomRole={async (name) => {
                const created = await repository.saveCustomRole(name);
                setCustomRoles(await repository.getCustomRoles());
                showToast(`Role "${created.name}" created.`, 'success');
                return created;
              }}
              onUpdateCustomRole={async (id, newName) => {
                const result = await repository.updateCustomRole(id, newName);
                if (result.success) {
                  setCustomRoles(await repository.getCustomRoles());
                  setStaffMembers(await repository.getStaffMembers());
                  showToast(`Role updated to "${newName}".`, 'success');
                }
                return result;
              }}
              onDeleteCustomRole={async (id) => {
                const result = await repository.deleteCustomRole(id);
                if (result.success) {
                  setCustomRoles(await repository.getCustomRoles());
                  showToast('Custom role deleted.', 'info');
                }
                return result;
              }}
              onSaveAppSettings={async (stg) => {
                setAppSettings(stg);
                await repository.saveAppSettings(stg);
                showToast('Workspace Settings saved.', 'success');
              }}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <MainAppContent />
    </ToastProvider>
  );
}

export default App;
