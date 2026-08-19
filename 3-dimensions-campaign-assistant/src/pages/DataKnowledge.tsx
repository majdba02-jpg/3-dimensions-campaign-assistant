import React, { useState } from 'react';
import {
  BrandKit,
  ProductService,
  FeedbackMemoryItem,
  DatasetMetadata,
  MarketingDataRecord,
  CampaignReference,
} from '../types';
import {
  Database,
  BookOpen,
  Layers,
  BookmarkPlus,
  Sparkles,
} from 'lucide-react';
import { MarketingDataTab } from '../components/data-knowledge/MarketingDataTab';
import { BrandKitTab } from '../components/data-knowledge/BrandKitTab';
import { ProductsServicesTab } from '../components/data-knowledge/ProductsServicesTab';
import { CampaignReferencesTab } from '../components/data-knowledge/CampaignReferencesTab';
import { FeedbackMemoryTab } from '../components/data-knowledge/FeedbackMemoryTab';

export interface DataKnowledgeProps {
  brandKit: BrandKit;
  products: ProductService[];
  feedbackMemory: FeedbackMemoryItem[];
  datasetMetadata: DatasetMetadata[];
  marketingRecords?: MarketingDataRecord[];
  campaignReferences?: CampaignReference[];
  onSaveBrandKit: (kit: BrandKit) => Promise<void>;
  onSaveProduct: (product: ProductService) => Promise<void>;
  onDeleteProduct?: (productId: string) => Promise<void>;
  onSaveCampaignReference?: (ref: CampaignReference) => Promise<void>;
  onDeleteCampaignReference?: (refId: string) => Promise<void>;
  onImportNewCSV: (records: MarketingDataRecord[], meta: DatasetMetadata) => Promise<void>;
  onSetActiveDataset?: (fileName: string) => Promise<void>;
  onDeleteDataset?: (fileName: string) => Promise<void>;
  onReloadDefaultDataset?: () => Promise<void>;
  onClearAllData?: () => Promise<void>;
  onDeleteFeedbackMemory?: (id: string) => Promise<void>;
  onClearFeedbackMemory?: () => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export type DataKnowledgeTabId = 'marketing-data' | 'brand-kit' | 'products-services' | 'campaign-references' | 'feedback-memory';

export const DataKnowledge: React.FC<DataKnowledgeProps> = ({
  brandKit,
  products,
  feedbackMemory,
  datasetMetadata,
  marketingRecords = [],
  campaignReferences = [],
  onSaveBrandKit,
  onSaveProduct,
  onDeleteProduct,
  onSaveCampaignReference,
  onDeleteCampaignReference,
  onImportNewCSV,
  onSetActiveDataset,
  onDeleteDataset,
  onReloadDefaultDataset,
  onClearAllData,
  onDeleteFeedbackMemory,
  onClearFeedbackMemory,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<DataKnowledgeTabId>('marketing-data');

  // Compute summary badge counts
  const totalDatasets = datasetMetadata.length;
  const activeDataset = datasetMetadata.find((d) => d.isActive) || datasetMetadata[0];
  const pendingProductsCount = products.filter((p) => p.approvalStatus === 'Pending').length;
  const totalProductsCount = products.filter((p) => p.approvalStatus !== 'Archived').length;
  const totalRefsCount = campaignReferences.length;
  const totalFeedbackCount = feedbackMemory.length;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn max-w-7xl mx-auto">
      {/* 5-Tab Navigation Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs">
        <nav
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth"
          aria-label="Data and Knowledge Navigation"
        >
          {/* Tab 1: Marketing Data */}
          <button
            onClick={() => setActiveTab('marketing-data')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'marketing-data'
                ? 'bg-[#160857] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Database className={`w-4 h-4 shrink-0 ${activeTab === 'marketing-data' ? 'text-indigo-300' : 'text-slate-400'}`} />
            <span>1. Marketing Data</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                activeTab === 'marketing-data'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalDatasets} {totalDatasets === 1 ? 'Dataset' : 'Datasets'}
            </span>
          </button>

          {/* Tab 2: Brand Kit */}
          <button
            onClick={() => setActiveTab('brand-kit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'brand-kit'
                ? 'bg-[#160857] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <BookOpen className={`w-4 h-4 shrink-0 ${activeTab === 'brand-kit' ? 'text-purple-300' : 'text-slate-400'}`} />
            <span>2. Brand Kit</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                activeTab === 'brand-kit'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-50 text-[#6344BF]'
              }`}
            >
              {brandKit.companyName ? 'Configured' : 'Setup'}
            </span>
          </button>

          {/* Tab 3: Products & Services */}
          <button
            onClick={() => setActiveTab('products-services')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'products-services'
                ? 'bg-[#160857] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Layers className={`w-4 h-4 shrink-0 ${activeTab === 'products-services' ? 'text-fuchsia-300' : 'text-slate-400'}`} />
            <span>3. Products & Services</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                activeTab === 'products-services'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalProductsCount} Items
            </span>
            {pendingProductsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title={`${pendingProductsCount} pending items`} />
            )}
          </button>

          {/* Tab 4: Campaign References */}
          <button
            onClick={() => setActiveTab('campaign-references')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'campaign-references'
                ? 'bg-[#160857] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <BookmarkPlus className={`w-4 h-4 shrink-0 ${activeTab === 'campaign-references' ? 'text-indigo-300' : 'text-slate-400'}`} />
            <span>4. Campaign References</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                activeTab === 'campaign-references'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalRefsCount}
            </span>
          </button>

          {/* Tab 5: Feedback Memory */}
          <button
            onClick={() => setActiveTab('feedback-memory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'feedback-memory'
                ? 'bg-[#160857] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'feedback-memory' ? 'text-fuchsia-300' : 'text-slate-400'}`} />
            <span>5. Feedback Memory</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                activeTab === 'feedback-memory'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalFeedbackCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-200">
        {activeTab === 'marketing-data' && (
          <MarketingDataTab
            datasetMetadata={datasetMetadata}
            marketingRecords={marketingRecords}
            onImportNewCSV={onImportNewCSV}
            onSetActiveDataset={onSetActiveDataset}
            onDeleteDataset={onDeleteDataset}
            onReloadDefaultDataset={onReloadDefaultDataset}
            onClearAllData={onClearAllData}
          />
        )}

        {activeTab === 'brand-kit' && (
          <BrandKitTab
            brandKit={brandKit}
            onSaveBrandKit={onSaveBrandKit}
          />
        )}

        {activeTab === 'products-services' && (
          <ProductsServicesTab
            products={products}
            onSaveProduct={onSaveProduct}
            onDeleteProduct={onDeleteProduct}
            onRefreshData={onRefreshData}
          />
        )}

        {activeTab === 'campaign-references' && (
          <CampaignReferencesTab
            references={campaignReferences}
            onSaveReference={onSaveCampaignReference || (async () => {})}
            onDeleteReference={onDeleteCampaignReference}
            onRefreshData={onRefreshData}
          />
        )}

        {activeTab === 'feedback-memory' && (
          <FeedbackMemoryTab
            feedbackMemory={feedbackMemory}
            onDeleteFeedbackMemory={onDeleteFeedbackMemory}
            onClearFeedbackMemory={onClearFeedbackMemory}
            onRefreshData={onRefreshData}
          />
        )}
      </div>
    </div>
  );
};
