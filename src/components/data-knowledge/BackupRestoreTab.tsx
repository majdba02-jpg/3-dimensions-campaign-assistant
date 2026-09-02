import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileJson,
  Layers,
  HardDrive,
} from 'lucide-react';

export interface BackupRestoreTabProps {
  onExportBackup: () => Promise<void>;
  onImportBackup: (jsonStr: string) => Promise<boolean>;
}

export const BackupRestoreTab: React.FC<BackupRestoreTabProps> = ({
  onExportBackup,
  onImportBackup,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await onExportBackup();
    } catch (err: any) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      '⚠️ RESTORE CONFIRMATION\n\nRestoring this backup will replace your current IndexedDB application state with the data from the selected JSON backup file.\n\nAre you sure you want to proceed with this restore?'
    );

    if (!confirmed) {
      // Clear file input value so user can pick the file again later if needed
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    setRestoreStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (text) {
          const success = await onImportBackup(text);
          if (success) {
            setRestoreStatus({
              type: 'success',
              message: 'Database successfully restored from JSON backup. Reloading workspace...',
            });
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          } else {
            setRestoreStatus({
              type: 'error',
              message: 'Failed to restore database. Invalid or corrupt JSON backup format.',
            });
          }
        }
      } catch (err: any) {
        setRestoreStatus({
          type: 'error',
          message: err?.message || 'Unexpected error while restoring backup.',
        });
      } finally {
        setIsRestoring(false);
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      setRestoreStatus({
        type: 'error',
        message: 'Could not read backup file.',
      });
      setIsRestoring(false);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER CARD */}
      <div className="card-tier-1 p-6 space-y-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
              <Database className="w-5 h-5 text-[#172DC3]" />
              <span>IndexedDB Full Database Backup & Disaster Recovery</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Export and import portable complete snapshots of your 3 Dimensions marketing data, campaigns, content assets, feedback memory, and staff directory.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Local & Private (Client-Side Storage)</span>
          </div>
        </div>

        {/* Status Notification */}
        {restoreStatus && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5 border ${
              restoreStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {restoreStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{restoreStatus.message}</span>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* EXPORT BACKUP */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#172DC3] flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-[#15192B] text-sm">Export Complete Database Backup</h4>
                  <span className="text-[11px] text-slate-500 font-medium">Download full JSON snapshot</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Generates a complete, unencrypted JSON backup including:
              </p>
              <ul className="text-[11px] text-slate-500 font-medium space-y-1 list-disc list-inside">
                <li>Campaign briefs, strategic directions, and plan versions</li>
                <li>Content calendar items, reel scripts, reviews, and version history</li>
                <li>Brand Kit, Products & Services catalog, and Campaign References</li>
                <li>Feedback Memory rules and human reviewer preferences</li>
                <li>Staff Directory and custom workflow roles</li>
                <li>Meta analytics imports and dataset metadata</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>{isExporting ? 'Generating JSON Backup...' : 'Export Complete JSON Backup'}</span>
            </button>
          </div>

          {/* RESTORE BACKUP */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-[#F8FAFC] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#6344BF] flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-[#15192B] text-sm">Restore Database from JSON</h4>
                  <span className="text-[11px] text-slate-500 font-medium">Load previously exported JSON backup</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Select an existing 3 Dimensions JSON backup file to restore your full database.
              </p>
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Safety Note:</strong> Restoring replaces current store contents with the data from your backup. The app will ask for your confirmation before applying the restore.
                </span>
              </div>
            </div>

            <label className="btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border-indigo-200 text-[#172DC3] hover:bg-indigo-50 shadow-2xs">
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'Restoring Database...' : 'Restore DB from JSON Backup File'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
