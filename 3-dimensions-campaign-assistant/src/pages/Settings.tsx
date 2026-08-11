import React, { useState } from 'react';
import { StaffMember, AppSettings } from '../types';
import {
  Users,
  Plus,
  Trash2,
  Download,
  Upload,
  Save,
  Globe,
  Database,
} from 'lucide-react';

interface SettingsProps {
  staffMembers: StaffMember[];
  appSettings: AppSettings;
  onSaveStaff: (staff: StaffMember) => Promise<void>;
  onDeleteStaff: (staffId: string) => Promise<void>;
  onSaveAppSettings: (settings: AppSettings) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: (jsonStr: string) => Promise<boolean>;
}

export const SettingsPage: React.FC<SettingsProps> = ({
  staffMembers,
  appSettings,
  onSaveStaff,
  onDeleteStaff,
  onSaveAppSettings,
  onExportBackup,
  onImportBackup,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<StaffMember['role']>('Marketing Manager');
  const [newEmail, setNewEmail] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const newStaff: StaffMember = {
      id: `s_${Date.now()}`,
      name: newName,
      role: newRole,
      email: newEmail,
    };

    await onSaveStaff(newStaff);
    setIsStaffModalOpen(false);
    setNewName('');
    setNewEmail('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAppSettings(localSettings);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        const success = await onImportBackup(text);
        if (success) {
          alert('IndexedDB database successfully restored from JSON backup!');
          window.location.reload();
        } else {
          alert('Failed to parse backup JSON file.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* STAFF DIRECTORY */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-[#172DC3]" />
              <span>3 Dimensions Marketing Staff Directory</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Team members assigned to content calendar creation, videography, and approval workflows.
            </p>
          </div>
          <button
            onClick={() => setIsStaffModalOpen(true)}
            className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>

        {staffMembers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-[#F8FAFC]">
            No team members added yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffMembers.map((staff) => (
              <div
                key={staff.id}
                className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-[#15192B] text-sm">{staff.name}</div>
                  <div className="text-xs font-bold text-[#172DC3] bg-indigo-50 border border-indigo-100 inline-block px-2.5 py-0.5 rounded-md mt-1">
                    {staff.role}
                  </div>
                  {staff.email && <div className="text-[11px] text-slate-500 mt-1 font-medium">{staff.email}</div>}
                </div>

                <button
                  onClick={() => onDeleteStaff(staff.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-slate-200"
                  title="Remove staff member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GLOBAL SETTINGS FORM */}
      <form onSubmit={handleSaveSettings} className="card-tier-1 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#172DC3]" />
              <span>Default Campaign Preferences</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Configure default language and platform selections.</p>
          </div>
          <button
            type="submit"
            className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{savedNotice ? 'Saved!' : 'Save Preferences'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#15192B] mb-1">Default Campaign Language</label>
            <select
              value={localSettings.defaultLanguage}
              onChange={(e) => setLocalSettings({ ...localSettings, defaultLanguage: e.target.value as any })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
            >
              <option value="Multilingual (English & Darija)">Multilingual (English & Darija)</option>
              <option value="Tunisian Darija (Arabic Script)">Tunisian Darija (Arabic Script)</option>
              <option value="English">English</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#15192B] mb-1.5">
              Default Target Marketing Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {(['Instagram', 'Facebook'] as any[]).map((p) => {
                const currentPlatforms = localSettings.defaultPlatforms || ['Instagram', 'Facebook'];
                const isSelected = currentPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? currentPlatforms.filter((item) => item !== p)
                        : [...currentPlatforms, p];
                      setLocalSettings({ ...localSettings, defaultPlatforms: updated });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      isSelected
                        ? 'bg-indigo-50 text-[#172DC3] border-indigo-200 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-[#15192B] cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.autoSuggestAssumptions}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, autoSuggestAssumptions: e.target.checked })
                }
                className="w-4 h-4 text-[#172DC3] rounded border-slate-300 focus:ring-[#172DC3]"
              />
              <span>Enable explicit confirmation popup for missing campaign optional parameters</span>
            </label>
          </div>
        </div>
      </form>

      {/* INDEXEDDB FULL BACKUP & RESTORE */}
      <div className="card-tier-1 p-6 space-y-4">
        <div className="border-b border-slate-200 pb-4">
          <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-[#172DC3]" />
            <span>IndexedDB Full Database Backup & Restore</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Export full application state (campaigns, analytics records, feedback memory, settings) as a portable JSON file.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onExportBackup}
            className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Complete JSON Backup</span>
          </button>

          <label className="cursor-pointer btn-secondary px-5 py-2.5 text-xs font-bold flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#172DC3]" />
            <span>Restore DB from JSON Backup File</span>
            <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
          </label>
        </div>
      </div>

      {/* ADD STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#160857]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleAddStaff} className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-black text-[#15192B] text-base">Add Team Member</h3>
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Marketing Manager">Marketing Manager</option>
                <option value="Production Manager">Production Manager</option>
                <option value="Sales Manager">Sales Manager</option>
                <option value="Communication Manager">Communication Manager</option>
                <option value="Photographer">Photographer</option>
                <option value="Videographer">Videographer</option>
                <option value="3D Designer">3D Designer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsStaffModalOpen(false)} className="btn-ghost px-3 py-1.5 text-xs font-semibold">
                Cancel
              </button>
              <button type="submit" className="btn-primary px-4 py-1.5 text-xs font-bold">
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
