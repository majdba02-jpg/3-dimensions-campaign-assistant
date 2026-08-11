import React, { useState } from 'react';
import {
  BrandKit,
  ProductService,
  FeedbackMemoryItem,
  DatasetMetadata,
  MarketingDataRecord,
  CampaignReference,
  CampaignType,
  AudienceSegment,
  LanguageOption,
} from '../types';
import { parseMetaCSV, CSVValidationReport } from '../services/csvParser';
import {
  Database,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Layers,
  BookOpen,
  BookmarkPlus,
} from 'lucide-react';

interface DataKnowledgeProps {
  brandKit: BrandKit;
  products: ProductService[];
  feedbackMemory: FeedbackMemoryItem[];
  datasetMetadata: DatasetMetadata[];
  campaignReferences?: CampaignReference[];
  onSaveBrandKit: (kit: BrandKit) => Promise<void>;
  onSaveProduct: (product: ProductService) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onSaveCampaignReference?: (ref: CampaignReference) => Promise<void>;
  onDeleteCampaignReference?: (refId: string) => Promise<void>;
  onImportNewCSV: (
    records: MarketingDataRecord[],
    meta: DatasetMetadata
  ) => Promise<void>;
  onDeleteDataset?: (fileName: string) => Promise<void>;
  onReloadDefaultDataset?: () => Promise<void>;
  onClearAllData?: () => Promise<void>;
}

export const DataKnowledge: React.FC<DataKnowledgeProps> = ({
  brandKit,
  products,
  feedbackMemory,
  datasetMetadata,
  campaignReferences = [],
  onSaveBrandKit,
  onSaveProduct,
  onDeleteProduct,
  onSaveCampaignReference,
  onDeleteCampaignReference,
  onImportNewCSV,
  onDeleteDataset,
  onReloadDefaultDataset,
  onClearAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'dataset' | 'brand' | 'products' | 'references' | 'feedback'>('dataset');

  // CSV Upload & Validation Report state
  const [validationReport, setValidationReport] = useState<CSVValidationReport | null>(null);
  const [pendingRecords, setPendingRecords] = useState<MarketingDataRecord[]>([]);
  const [pendingMetadata, setPendingMetadata] = useState<DatasetMetadata | null>(null);

  // Brand Kit local state
  const [localBrandKit, setLocalBrandKit] = useState<BrandKit>(brandKit);
  const [brandSavedNotice, setBrandSavedNotice] = useState(false);

  // New Product Modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Consumer Gadget');
  const [prodDesc, setProdDesc] = useState('');
  const [prodSpecs, setProdSpecs] = useState('');

  // New Campaign Reference Modal state
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [refTitle, setRefTitle] = useState('');
  const [refType, setRefType] = useState<CampaignType>('Product Launch');
  const [refAudience, setRefAudience] = useState<AudienceSegment>('B2C');
  const [refLanguage, setRefLanguage] = useState<LanguageOption>('Multilingual (English & Darija)');
  const [refCaption, setRefCaption] = useState('');
  const [refPerformance, setRefPerformance] = useState('');
  const [refWhyUseful, setRefWhyUseful] = useState('');
  const [prodMaterials, setProdMaterials] = useState('PLA, PETG, Resin');
  const [prodClaims, setProdClaims] = useState('High precision local print');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const { records, report, metadata } = parseMetaCSV(text, file.name);
        setValidationReport(report);
        setPendingRecords(records);
        setPendingMetadata(metadata);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmCSVImport = async () => {
    if (pendingRecords.length > 0 && pendingMetadata) {
      await onImportNewCSV(pendingRecords, pendingMetadata);
      setValidationReport(null);
      setPendingRecords([]);
      setPendingMetadata(null);
      alert('CSV Dataset imported and saved to IndexedDB successfully!');
    }
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveBrandKit(localBrandKit);
    setBrandSavedNotice(true);
    setTimeout(() => setBrandSavedNotice(false), 2000);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName) return;

    const newProd: ProductService = {
      id: `prod_${Date.now()}`,
      name: prodName,
      category: prodCategory,
      description: prodDesc,
      technicalSpecs: prodSpecs,
      materials: prodMaterials.split(',').map((m) => m.trim()),
      approvedClaims: prodClaims.split(',').map((c) => c.trim()),
    };

    await onSaveProduct(newProd);
    setIsProductModalOpen(false);
    setProdName('');
    setProdDesc('');
    setProdSpecs('');
  };

  const handleCreateReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refTitle || !refCaption || !onSaveCampaignReference) return;

    const newRef: CampaignReference = {
      id: `ref_${Date.now()}`,
      title: refTitle,
      type: refType,
      audienceSegment: refAudience,
      language: refLanguage,
      captionCopy: refCaption,
      performanceNotes: refPerformance,
      whyUsefulNotes: refWhyUseful,
      createdAt: new Date().toISOString(),
    };

    await onSaveCampaignReference(newRef);
    setIsRefModalOpen(false);
    setRefTitle('');
    setRefCaption('');
    setRefPerformance('');
    setRefWhyUseful('');
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="card-tier-1 p-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('dataset')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'dataset' ? 'bg-[#160857] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Database className="w-4 h-4 text-[#172DC3]" />
          <span>Meta CSV Dataset Validator</span>
        </button>

        <button
          onClick={() => setActiveTab('brand')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'brand' ? 'bg-[#160857] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#6344BF]" />
          <span>Brand Kit & Style Guidelines</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'products' ? 'bg-[#160857] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 text-[#A90CBF]" />
          <span>3D Products & Services ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('references')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'references' ? 'bg-[#160857] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookmarkPlus className="w-4 h-4 text-[#172DC3]" />
          <span>Campaign References ({campaignReferences.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'feedback' ? 'bg-[#160857] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#CB19C2]" />
          <span>Feedback Memory Inspector ({feedbackMemory.length})</span>
        </button>
      </div>

      {/* TAB 1: DATASET VALIDATOR & CSV IMPORT */}
      {activeTab === 'dataset' && (
        <div className="space-y-6">
          <div className="card-tier-1 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#172DC3]" />
                  <span>Meta Dataset Import & Schema Validator</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Upload a new Meta Business Suite CSV export to update analytics deterministically.
                </p>
              </div>

              <label className="cursor-pointer btn-primary px-4 py-2 text-xs font-bold flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload New Meta CSV File</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Validation Report Card if File Uploaded */}
            {validationReport && (
              <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-[#15192B] text-sm">
                      CSV Programmatic Validation Report
                    </span>
                  </div>
                  <button
                    onClick={handleConfirmCSVImport}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition"
                  >
                    Confirm & Save {validationReport.validRecordsCount} Records to DB
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 font-medium">Rows Detected:</span>
                    <div className="font-black text-[#15192B] text-sm">{validationReport.totalRowsDetected}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 font-medium">Valid Records:</span>
                    <div className="font-black text-emerald-700 text-sm">{validationReport.validRecordsCount}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 font-medium">Mapped Columns:</span>
                    <div className="font-black text-[#172DC3] text-sm">{validationReport.mappedFields.length}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 font-medium">Date Range:</span>
                    <div className="font-bold text-[#15192B] text-xs font-mono">
                      {validationReport.dateRange.start} - {validationReport.dateRange.end}
                    </div>
                  </div>
                </div>

                {/* Success Checks */}
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">Detected Fields:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {validationReport.successChecks.map((check, idx) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] px-2 py-0.5 rounded-md font-semibold">
                        {check}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {validationReport.warnings.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-amber-800 block mb-1">Schema Warnings:</span>
                    <div className="space-y-1">
                      {validationReport.warnings.map((w, idx) => (
                        <div key={idx} className="text-xs text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                          {w}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Currently Active Saved Datasets */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Stored Dataset History in IndexedDB
                </h4>
                <div className="flex items-center gap-2">
                  {onReloadDefaultDataset && (
                    <button
                      onClick={async () => {
                        if (confirm('Reload official Meta default dataset? This will replace active marketing records.')) {
                          await onReloadDefaultDataset();
                        }
                      }}
                      className="btn-secondary text-xs px-3 py-1.5 font-bold"
                    >
                      Reload Default Dataset
                    </button>
                  )}
                  {onClearAllData && (
                    <button
                      onClick={async () => {
                        if (confirm('Clear all uploaded marketing dataset records?')) {
                          await onClearAllData();
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition"
                    >
                      Clear Marketing Datasets
                    </button>
                  )}
                </div>
              </div>

              {datasetMetadata.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-[#F8FAFC]">
                  No dataset metadata stored. Upload a Meta CSV file above or reload the default dataset.
                </div>
              ) : (
                <div className="space-y-2">
                  {datasetMetadata.map((meta) => (
                    <div key={meta.id || meta.fileName} className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#15192B]">{meta.fileName}</div>
                        <div className="text-slate-500 mt-0.5 font-medium">
                          Imported: {meta.importedAt ? meta.importedAt.slice(0, 10) : 'N/A'} | Records: <strong>{meta.totalRecords}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Active
                        </span>
                        {onDeleteDataset && (
                          <button
                            onClick={async () => {
                              if (confirm(`Delete dataset ${meta.fileName}?`)) {
                                await onDeleteDataset(meta.fileName);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Delete dataset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRAND KIT */}
      {activeTab === 'brand' && (
        <form onSubmit={handleSaveBrand} className="card-tier-1 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-black text-[#15192B] text-base">Brand Kit Specifications</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Configures brand guidelines supplied as system context to Gemini generators.
              </p>
            </div>
            <button
              type="submit"
              className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{brandSavedNotice ? 'Saved!' : 'Save Brand Kit'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Company Name</label>
              <input
                type="text"
                value={localBrandKit.companyName}
                onChange={(e) => setLocalBrandKit({ ...localBrandKit, companyName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Brand Voice Tone</label>
              <input
                type="text"
                value={localBrandKit.brandTone}
                onChange={(e) => setLocalBrandKit({ ...localBrandKit, brandTone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#15192B] mb-1">Company Description</label>
              <textarea
                rows={3}
                value={localBrandKit.companyDescription}
                onChange={(e) => setLocalBrandKit({ ...localBrandKit, companyDescription: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Preferred Technical Terms (Comma separated)</label>
              <input
                type="text"
                value={localBrandKit.preferredTerminology.join(', ')}
                onChange={(e) =>
                  setLocalBrandKit({
                    ...localBrandKit,
                    preferredTerminology: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Words to Avoid (Comma separated)</label>
              <input
                type="text"
                value={localBrandKit.wordsToAvoid.join(', ')}
                onChange={(e) =>
                  setLocalBrandKit({
                    ...localBrandKit,
                    wordsToAvoid: e.target.value.split(',').map((s) => s.trim()),
                  })
                }
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: 3D PRODUCTS CATALOG */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="card-tier-1 p-4 flex items-center justify-between">
            <div>
              <h3 className="font-black text-[#15192B] text-sm">3D Printing Products & Services Catalog</h3>
              <p className="text-xs text-slate-500 font-medium">Technical specs and materials used in campaign briefs</p>
            </div>
            <button
              onClick={() => setIsProductModalOpen(true)}
              className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product / Service</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => (
              <div key={p.id} className="card-tier-1 p-5 space-y-3 relative group">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase bg-indigo-50 border border-indigo-100 text-[#172DC3] px-2 py-0.5 rounded-md">
                    {p.category}
                  </span>
                  <button
                    onClick={() => onDeleteProduct(p.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h4 className="font-black text-[#15192B] text-base">{p.name}</h4>
                <p className="text-xs text-slate-600 font-medium">{p.description}</p>

                <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80 space-y-1 text-xs">
                  <div className="font-bold text-[#15192B]">Specs: {p.technicalSpecs}</div>
                  <div className="text-slate-500 font-medium">Materials: {p.materials.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CAMPAIGN REFERENCES */}
      {activeTab === 'references' && (
        <div className="card-tier-1 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-[#172DC3]" />
                <span>Historical & Benchmark Campaign References</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Inspiration examples, high-performing post templates, and benchmark captions provided as context to Gemini AI.
              </p>
            </div>
            <button
              onClick={() => setIsRefModalOpen(true)}
              className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Campaign Reference</span>
            </button>
          </div>

          {campaignReferences.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-[#F8FAFC] space-y-2">
              <BookmarkPlus className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-bold text-[#15192B]">No campaign references added yet.</p>
              <p className="font-medium">Add benchmark campaigns, viral hook structures, or past top-performing copy to guide AI generation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaignReferences.map((ref) => (
                <div key={ref.id} className="p-4 bg-[#F8FAFC] border border-slate-200/80 rounded-2xl space-y-3 relative group">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-[#15192B] text-sm">{ref.title}</h4>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="px-2 py-0.5 bg-indigo-50 text-[#172DC3] border border-indigo-100 text-[10px] font-bold rounded-md">
                          {ref.type}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 text-[10px] font-bold rounded-md">
                          {ref.audienceSegment}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-md">
                          {ref.language}
                        </span>
                      </div>
                    </div>
                    {onDeleteCampaignReference && (
                      <button
                        onClick={() => onDeleteCampaignReference(ref.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-slate-200"
                        title="Delete reference"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 space-y-1 font-mono leading-relaxed whitespace-pre-wrap">
                    <div className="text-[10px] font-bold text-slate-400 uppercase font-sans">Caption / Copy Example:</div>
                    {ref.captionCopy}
                  </div>

                  {ref.whyUsefulNotes && (
                    <div className="text-xs text-slate-600 font-medium">
                      <span className="font-bold text-[#15192B]">Why useful: </span>
                      {ref.whyUsefulNotes}
                    </div>
                  )}

                  {ref.performanceNotes && (
                    <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 font-medium">
                      <span className="font-bold">Performance Notes: </span>
                      {ref.performanceNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FEEDBACK MEMORY */}
      {activeTab === 'feedback' && (
        <div className="card-tier-1 p-6 space-y-4">
          <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#CB19C2]" />
            <span>Structured Feedback Memory Engine</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Recorded feedback from human reviews supplied directly as context to future Gemini generations.
          </p>

          {feedbackMemory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-[#F8FAFC]">
              No feedback memory recorded yet. Review content assets in Content Review tab to log structured feedback.
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackMemory.map((fb) => (
                <div key={fb.id} className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        fb.rating === 'Positive'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : fb.rating === 'Negative'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {fb.rating} Feedback
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                      {fb.createdAt.slice(0, 10)}
                    </span>
                  </div>

                  <p className="font-bold text-[#15192B]">"{fb.explanation}"</p>
                  <div className="text-slate-500 font-medium">
                    Target: {fb.campaignType} • {fb.audienceSegment} • {fb.contentFormat}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#160857]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateProduct} className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-black text-[#15192B] text-base">Add New 3D Product / Service</h3>
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Product Name</label>
              <input
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Category</label>
              <select
                value={prodCategory}
                onChange={(e) => setProdCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Consumer Gadget">Consumer Gadget</option>
                <option value="Custom Prototyping">Custom Prototyping</option>
                <option value="Architectural Models">Architectural Models</option>
                <option value="3D Scanning">3D Scanning</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Description</label>
              <textarea
                rows={2}
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Technical Specs</label>
              <input
                type="text"
                value={prodSpecs}
                onChange={(e) => setProdSpecs(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsProductModalOpen(false)} className="btn-ghost px-3 py-1.5 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="btn-primary px-4 py-1.5 text-xs font-bold">
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD CAMPAIGN REFERENCE MODAL */}
      {isRefModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#160857]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateReference} className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl">
            <h3 className="font-black text-[#15192B] text-base">Add Campaign Reference / Benchmark</h3>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Reference Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Architectural B2B Batch Prototyping Reels Hook"
                value={refTitle}
                onChange={(e) => setRefTitle(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#15192B] mb-1">Campaign Type</label>
                <select
                  value={refType}
                  onChange={(e) => setRefType(e.target.value as CampaignType)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="Product Launch">Product Launch</option>
                  <option value="Promotional Offer">Promotional Offer</option>
                  <option value="Seasonal Campaign">Seasonal Campaign</option>
                  <option value="Brand Awareness">Brand Awareness</option>
                  <option value="Educational Content">Educational Content</option>
                  <option value="B2B Corporate Campaign">B2B Corporate Campaign</option>
                  <option value="Customer Success / Testimonial">Customer Success</option>
                  <option value="Behind the Scenes">Behind the Scenes</option>
                  <option value="Event / Exhibition">Event / Exhibition</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#15192B] mb-1">Audience</label>
                <select
                  value={refAudience}
                  onChange={(e) => setRefAudience(e.target.value as AudienceSegment)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="B2C">B2C</option>
                  <option value="B2B">B2B</option>
                  <option value="Both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#15192B] mb-1">Language</label>
                <select
                  value={refLanguage}
                  onChange={(e) => setRefLanguage(e.target.value as LanguageOption)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="Multilingual (English & Darija)">Multilingual</option>
                  <option value="Tunisian Darija (Arabic Script)">Tunisian Darija</option>
                  <option value="English">English</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Caption / Copy Example <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Paste the caption copy or hook text..."
                value={refCaption}
                onChange={(e) => setRefCaption(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Why Useful / Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Great high-converting hook for B2B engineering clients"
                value={refWhyUseful}
                onChange={(e) => setRefWhyUseful(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Performance Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Generated 45 DMs and 12 quote requests in 3 days"
                value={refPerformance}
                onChange={(e) => setRefPerformance(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsRefModalOpen(false)}
                className="btn-ghost px-3 py-1.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-4 py-1.5 text-xs font-bold"
              >
                Save Reference
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
