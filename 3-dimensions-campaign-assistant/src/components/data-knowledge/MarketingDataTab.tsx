import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Database,
  Trash2,
  RefreshCw,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Check,
  X,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { MarketingDataRecord, DatasetMetadata } from '../../types';
import { parseMetaCSV, CSVValidationReport } from '../../services/csvParser';

interface MarketingDataTabProps {
  marketingData?: MarketingDataRecord[];
  marketingRecords?: MarketingDataRecord[];
  datasetMetadata?: DatasetMetadata[];
  onSaveMarketingData?: (records: MarketingDataRecord[]) => Promise<void>;
  onSaveDatasetMetadata?: (meta: DatasetMetadata) => Promise<void>;
  onImportNewCSV?: (records: MarketingDataRecord[], meta: DatasetMetadata) => Promise<void>;
  onSetActiveDataset?: (idOrName: string) => Promise<void>;
  onDeleteDataset?: (fileName: string) => Promise<void>;
  onClearMarketingData?: () => Promise<void>;
  onClearAllData?: () => Promise<void>;
  onReloadSeedDataset?: () => Promise<void>;
  onReloadDefaultDataset?: () => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export const MarketingDataTab: React.FC<MarketingDataTabProps> = ({
  marketingData,
  marketingRecords,
  datasetMetadata = [],
  onSaveMarketingData,
  onSaveDatasetMetadata,
  onImportNewCSV,
  onSetActiveDataset,
  onDeleteDataset,
  onClearMarketingData,
  onClearAllData,
  onReloadSeedDataset,
  onReloadDefaultDataset,
  onRefreshData,
}) => {
  const records = Array.isArray(marketingData)
    ? marketingData
    : Array.isArray(marketingRecords)
    ? marketingRecords
    : [];
  const safeMetadata = Array.isArray(datasetMetadata) ? datasetMetadata : [];

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parsedResult, setParsedResult] = useState<{
    records: MarketingDataRecord[];
    report: CSVValidationReport;
    metadata: DatasetMetadata;
  } | null>(null);
  const [showRawColumns, setShowRawColumns] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Modal confirmation states
  const [datasetToDelete, setDatasetToDelete] = useState<DatasetMetadata | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showReloadConfirm, setShowReloadConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessCSVText = (text: string, fileName: string) => {
    try {
      const result = parseMetaCSV(text, fileName);
      setUploadedFileName(fileName);
      setParsedResult(result);
    } catch (err) {
      console.error('Error parsing CSV:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      handleProcessCSVText(text, file.name);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text'))) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        handleProcessCSVText(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedResult) return;
    setIsUploading(true);
    try {
      if (onImportNewCSV) {
        await onImportNewCSV(parsedResult.records, parsedResult.metadata);
      } else {
        if (onSaveMarketingData) await onSaveMarketingData(parsedResult.records);
        if (onSaveDatasetMetadata) await onSaveDatasetMetadata(parsedResult.metadata);
      }
      setSaveSuccessMsg(`Successfully imported ${parsedResult.records.length} records from ${uploadedFileName}`);
      setParsedResult(null);
      setUploadedFileName('');
      if (onRefreshData) await onRefreshData();
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Failed to save dataset:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelImport = () => {
    setParsedResult(null);
    setUploadedFileName('');
  };

  const handleSetActive = async (meta: DatasetMetadata) => {
    if (onSetActiveDataset) {
      await onSetActiveDataset(meta.id || meta.fileName);
      if (onRefreshData) await onRefreshData();
    }
  };

  const handleConfirmDeleteDataset = async () => {
    if (!datasetToDelete || !onDeleteDataset) return;
    setActionLoading(true);
    try {
      await onDeleteDataset(datasetToDelete.fileName || datasetToDelete.id);
      setDatasetToDelete(null);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmClearAll = async () => {
    const clearFn = onClearMarketingData || onClearAllData;
    if (!clearFn) return;
    setActionLoading(true);
    try {
      await clearFn();
      setShowClearConfirm(false);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Failed to clear marketing data:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReloadSeed = async () => {
    const reloadFn = onReloadSeedDataset || onReloadDefaultDataset;
    if (!reloadFn) return;
    setActionLoading(true);
    try {
      await reloadFn();
      setShowReloadConfirm(false);
      if (onRefreshData) await onRefreshData();
    } catch (err) {
      console.error('Failed to reload seed dataset:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Find active metadata
  const activeMetadata = safeMetadata.find((d) => d.isActive) || safeMetadata[0];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm font-semibold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Overview Card */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-[#172DC3]">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-[#15192B] text-base">Marketing Data Import & Management</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Authoritative historical Meta Business Suite CSV records used for performance calculations and context.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Import New Meta CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Current Active Dataset Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Dataset</span>
            <div className="font-bold text-[#15192B] text-sm truncate" title={activeMetadata?.fileName || 'No active dataset'}>
              {activeMetadata ? activeMetadata.fileName : 'None Loaded'}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Source: Meta Business Suite</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Historical Records</span>
            <div className="font-black text-[#15192B] text-lg">
              {records.length} <span className="text-xs font-normal text-slate-500">posts</span>
            </div>
            <div className="text-[11px] text-slate-500">Persisted locally in IndexedDB</div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Span</span>
            <div className="font-bold text-[#15192B] text-xs font-mono truncate">
              {activeMetadata?.dateRange ? `${activeMetadata.dateRange.start} → ${activeMetadata.dateRange.end}` : 'N/A'}
            </div>
            <div className="text-[11px] text-slate-500">Deterministic timestamp bounds</div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Schema Integrity</span>
            <div className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{activeMetadata?.mappedColumns?.length || 8} Mapped Keys</span>
            </div>
            <div className="text-[11px] text-slate-500">Programmatically validated</div>
          </div>
        </div>
      </div>

      {/* NEW CSV VALIDATION & IMPORT STEP (if a file was selected) */}
      {parsedResult && (
        <div className="card-tier-1 p-6 space-y-5 border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/30 to-white animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                1
              </div>
              <div>
                <h4 className="font-black text-[#15192B] text-base flex items-center gap-2">
                  <span>Meta CSV Dataset Inspection & Validation</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-100 text-[#172DC3] font-bold">
                    {uploadedFileName}
                  </span>
                </h4>
                <p className="text-xs text-slate-600">
                  Review the deterministic validation results before committing this dataset to storage.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelImport}
                disabled={isUploading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Discard
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={isUploading || !parsedResult.report.isValid}
                className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Activate ({parsedResult.report.validRecordsCount} Records)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Validation Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Rows Detected</span>
              <div className="font-black text-[#15192B] text-base mt-0.5">{parsedResult.report.totalRowsDetected}</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Valid Publications</span>
              <div className="font-black text-emerald-700 text-base mt-0.5">{parsedResult.report.validRecordsCount}</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Mapped Metric Keys</span>
              <div className="font-black text-[#172DC3] text-base mt-0.5">{parsedResult.report.mappedFields.length}</div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">Date Range</span>
              <div className="font-bold text-[#15192B] text-xs font-mono mt-0.5">
                {parsedResult.report.dateRange.start} - {parsedResult.report.dateRange.end}
              </div>
            </div>
          </div>

          {/* Detected Field Badges */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#15192B]">Detected Column Validations:</span>
              <button
                onClick={() => setShowRawColumns(!showRawColumns)}
                className="text-xs text-[#172DC3] hover:underline font-medium flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showRawColumns ? 'Hide Column Mapping Preview' : 'Show Column Mapping Preview'}</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {parsedResult.report.successChecks.map((check, idx) => (
                <span
                  key={idx}
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{check.replace(/^✓\s*/, '')}</span>
                </span>
              ))}
              {parsedResult.report.warnings.map((warn, idx) => (
                <span
                  key={`w_${idx}`}
                  className="bg-amber-50 text-amber-800 border border-amber-200/80 text-xs px-2.5 py-1 rounded-lg font-medium inline-flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>{warn.replace(/^⚠\s*/, '')}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Optional Raw Column Mapping Inspector */}
          {showRawColumns && (
            <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs space-y-3 font-mono overflow-x-auto">
              <div className="text-slate-400 font-sans font-bold text-xs uppercase tracking-wider">
                Raw Column Header → Internal Normalized Schema
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                {parsedResult.report.mappedFields.map((field, idx) => (
                  <div key={idx} className="p-2 bg-slate-800/80 rounded-lg flex items-center justify-between">
                    <span className="text-slate-300">{field}</span>
                    <span className="text-emerald-400 font-bold">Mapped & Parsed</span>
                  </div>
                ))}
              </div>
              {parsedResult.report.unmappedFields.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block mb-1">Additional Non-Standard Columns (Ignored):</span>
                  <div className="flex flex-wrap gap-1">
                    {parsedResult.report.unmappedFields.slice(0, 10).map((col, idx) => (
                      <span key={idx} className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                        {col}
                      </span>
                    ))}
                    {parsedResult.report.unmappedFields.length > 10 && (
                      <span className="text-slate-500 text-[10px]">
                        +{parsedResult.report.unmappedFields.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Drag & Drop Upload Dropzone if no file is currently in staging */}
      {!parsedResult && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`card-tier-1 p-8 border-2 border-dashed rounded-3xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
            isDragOver ? 'border-[#172DC3] bg-indigo-50/50' : 'border-slate-300/80 hover:border-indigo-400 bg-[#FAFBFD]'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#172DC3]">
            <Upload className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-[#15192B] text-sm">
              Drag & Drop Meta Business Suite CSV export here, or <span className="text-[#172DC3] underline">Browse</span>
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Supports standard Meta export columns: Identifiant de la publication, Vues, Couverture, Réactions, Commentaires, Partages, Clics.
            </p>
          </div>
        </div>
      )}

      {/* Datasets Library / History */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div>
            <h4 className="font-black text-[#15192B] text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-[#172DC3]" />
              <span>Available Datasets ({safeMetadata.length})</span>
            </h4>
            <p className="text-xs text-slate-500">
              Only one dataset is active at a time for Marketing Insights calculations.
            </p>
          </div>
        </div>

        {safeMetadata.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-400" />
            <p className="font-bold text-slate-700">No marketing datasets saved yet.</p>
            <p>Upload a Meta CSV file above or reload the verified seed dataset.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {safeMetadata.map((ds) => {
              const isActive = ds.isActive;
              return (
                <div
                  key={ds.id || ds.fileName}
                  className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#15192B] text-sm">{ds.fileName}</span>
                      {isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>Active Dataset</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          Inactive
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                        Meta Business Suite
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-700">{ds.totalRecords}</span> records
                      </span>
                      {ds.dateRange && (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ds.dateRange.start} → {ds.dateRange.end}</span>
                        </span>
                      )}
                      {ds.importedAt && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Imported: {new Date(ds.importedAt).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && onSetActiveDataset && (
                      <button
                        onClick={() => handleSetActive(ds)}
                        className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-[#172DC3] text-xs font-bold rounded-xl transition shadow-2xs"
                      >
                        Set as Active
                      </button>
                    )}
                    {onDeleteDataset && (
                      <button
                        onClick={() => setDatasetToDelete(ds)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Delete dataset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Secondary Actions & Danger Zone */}
      <div className="card-tier-1 p-6 space-y-4 border border-slate-200">
        <div className="border-b border-slate-200/80 pb-3">
          <h4 className="font-black text-[#15192B] text-sm">Dataset Maintenance & Secondary Actions</h4>
          <p className="text-xs text-slate-500">
            Administrative actions that manage dataset records. These operations do not affect your Brand Kit, Products, Campaign References, or Feedback Memory.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onReloadSeedDataset && (
              <button
                onClick={() => setShowReloadConfirm(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                <span>Reload Default Meta Seed Dataset</span>
              </button>
            )}
          </div>

          {onClearMarketingData && marketingData.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear All Marketing Datasets</span>
            </button>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL: DELETE INDIVIDUAL DATASET */}
      {datasetToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-[#15192B] text-base">Delete Dataset</h4>
                <p className="text-xs text-slate-500">Remove from dataset history</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{datasetToDelete.fileName}</strong> ({datasetToDelete.totalRecords} records)? This will remove this dataset entry.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDatasetToDelete(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteDataset}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CLEAR ALL MARKETING DATASETS */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-[#15192B] text-base">Clear All Marketing Datasets?</h4>
                <p className="text-xs text-slate-500">Clear historical CSV analytics records</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will remove all <strong className="text-slate-900">{marketingData.length} marketing records</strong> and dataset metadata from IndexedDB.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
              <strong>Note:</strong> Your Brand Kit, Products & Services catalog, Campaign References, and Feedback Memory will remain completely untouched.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                {actionLoading ? 'Clearing...' : 'Clear All Marketing Datasets'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RELOAD SEED DATASET */}
      {showReloadConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-[#15192B] text-base">Reload Default Seed Dataset?</h4>
                <p className="text-xs text-slate-500">Official Meta Dataset 2026</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will re-parse and load the verified official Meta Business Suite dataset (49 posts with verified engagement metrics: 308 reactions, 8 comments, 18 shares) as the active dataset.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReloadConfirm(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReloadSeed}
                disabled={actionLoading}
                className="btn-primary px-4 py-2 text-xs font-bold shadow-xs transition"
              >
                {actionLoading ? 'Reloading...' : 'Reload Verified Seed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
