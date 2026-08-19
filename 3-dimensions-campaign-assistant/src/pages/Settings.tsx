import React, { useState, useEffect } from 'react';
import {
  StaffMember,
  CustomRole,
  AppSettings,
  DEFAULT_STAFF_ROLES,
} from '../types';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  Save,
  Globe,
  Database,
  Phone,
  Mail,
  Shield,
  Layers,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { StaffProfilePopover } from '../components/StaffProfilePopover';

interface SettingsProps {
  staffMembers: StaffMember[];
  customRoles?: CustomRole[];
  appSettings: AppSettings;
  onSaveStaff: (staff: StaffMember) => Promise<void>;
  onDeleteStaff: (staffId: string) => Promise<void>;
  onSaveCustomRole?: (name: string) => Promise<CustomRole>;
  onUpdateCustomRole?: (id: string, newName: string) => Promise<{ success: boolean; error?: string; role?: CustomRole }>;
  onDeleteCustomRole?: (id: string) => Promise<{ success: boolean; error?: string; assignedStaffCount?: number }>;
  onSaveAppSettings: (settings: AppSettings) => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: (jsonStr: string) => Promise<boolean>;
}

export const SettingsPage: React.FC<SettingsProps> = ({
  staffMembers,
  customRoles = [],
  appSettings,
  onSaveStaff,
  onDeleteStaff,
  onSaveCustomRole,
  onUpdateCustomRole,
  onDeleteCustomRole,
  onSaveAppSettings,
  onExportBackup,
  onImportBackup,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(appSettings);
  const [savedNotice, setSavedNotice] = useState(false);

  // Staff Modal State (Add & Edit)
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<string>(DEFAULT_STAFF_ROLES[0]);
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Inline custom role creation inside staff modal
  const [isCreatingInlineRole, setIsCreatingInlineRole] = useState(false);
  const [inlineRoleName, setInlineRoleName] = useState('');
  const [inlineRoleError, setInlineRoleError] = useState<string | null>(null);

  // Manage Roles Modal State
  const [isManageRolesOpen, setIsManageRolesOpen] = useState(false);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [manageRoleError, setManageRoleError] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  const [roleActionNotice, setRoleActionNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    setLocalSettings(appSettings);
  }, [appSettings]);

  // Open modal for Adding a new staff member
  const handleOpenAddModal = () => {
    setEditingStaffId(null);
    setFormName('');
    setFormRole(DEFAULT_STAFF_ROLES[0]);
    setFormEmail('');
    setFormPhone('');
    setPhoneError(null);
    setIsCreatingInlineRole(false);
    setInlineRoleName('');
    setInlineRoleError(null);
    setIsStaffModalOpen(true);
  };

  // Open modal for Editing an existing staff member
  const handleOpenEditModal = (staff: StaffMember) => {
    setEditingStaffId(staff.id);
    setFormName(staff.name);
    setFormRole(staff.role);
    setFormEmail(staff.email || '');
    setFormPhone(staff.phoneNumber || '');
    setPhoneError(null);
    setIsCreatingInlineRole(false);
    setInlineRoleName('');
    setInlineRoleError(null);
    setIsStaffModalOpen(true);
  };

  // Validate phone number loosely to support international formats like +216 XX XXX XXX
  const validatePhone = (phone: string): boolean => {
    if (!phone || !phone.trim()) return true;
    const trimmed = phone.trim();
    // Allow digits, spaces, plus, hyphens, and parentheses
    const validPattern = /^[+\d\s()\-]{6,25}$/;
    return validPattern.test(trimmed);
  };

  const handleSaveStaffForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (formPhone && !validatePhone(formPhone)) {
      setPhoneError('Please enter a valid international phone number format (e.g. +216 20 123 456)');
      return;
    }
    setPhoneError(null);

    let finalRole = formRole;

    // If user typed an inline custom role and didn't save yet, save it now
    if (isCreatingInlineRole && inlineRoleName.trim()) {
      if (onSaveCustomRole) {
        try {
          const created = await onSaveCustomRole(inlineRoleName.trim());
          finalRole = created.name;
        } catch (err: any) {
          setInlineRoleError(err.message || 'Failed to save role');
          return;
        }
      } else {
        finalRole = inlineRoleName.trim();
      }
    }

    const staffData: StaffMember = {
      id: editingStaffId || `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: formName.trim(),
      role: finalRole,
      email: formEmail.trim() || undefined,
      phoneNumber: formPhone.trim() || undefined,
    };

    await onSaveStaff(staffData);
    setIsStaffModalOpen(false);
  };

  const handleCreateInlineRole = async () => {
    const trimmed = inlineRoleName.trim();
    if (!trimmed) {
      setInlineRoleError('Please enter a role name');
      return;
    }

    if (onSaveCustomRole) {
      try {
        const created = await onSaveCustomRole(trimmed);
        setFormRole(created.name);
        setIsCreatingInlineRole(false);
        setInlineRoleName('');
        setInlineRoleError(null);
      } catch (err: any) {
        setInlineRoleError(err.message || 'Failed to create role');
      }
    } else {
      setFormRole(trimmed);
      setIsCreatingInlineRole(false);
    }
  };

  // Manage Roles: Create Role
  const handleAddNewRoleInManager = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRoleInput.trim();
    if (!trimmed) return;

    setManageRoleError(null);
    setRoleActionNotice(null);

    if (onSaveCustomRole) {
      try {
        await onSaveCustomRole(trimmed);
        setNewRoleInput('');
        setRoleActionNotice({ type: 'success', message: `Role "${trimmed}" created successfully.` });
      } catch (err: any) {
        setManageRoleError(err.message || 'Failed to add role');
      }
    }
  };

  // Manage Roles: Rename Role
  const handleSaveRenameRole = async (roleId: string) => {
    if (!editingRoleName.trim()) return;

    setManageRoleError(null);
    setRoleActionNotice(null);

    if (onUpdateCustomRole) {
      const res = await onUpdateCustomRole(roleId, editingRoleName.trim());
      if (res.success) {
        setEditingRoleId(null);
        setEditingRoleName('');
        setRoleActionNotice({ type: 'success', message: `Role renamed to "${editingRoleName.trim()}".` });
      } else {
        setManageRoleError(res.error || 'Failed to update role');
      }
    }
  };

  // Manage Roles: Delete Role
  const handleDeleteRoleInManager = async (role: CustomRole) => {
    setManageRoleError(null);
    setRoleActionNotice(null);

    if (onDeleteCustomRole) {
      const res = await onDeleteCustomRole(role.id);
      if (!res.success) {
        setManageRoleError(res.error || 'Cannot delete role.');
      } else {
        setRoleActionNotice({ type: 'success', message: `Role "${role.name}" removed.` });
      }
    }
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
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-[#172DC3]" />
              <span>3 Dimensions Marketing Staff Directory</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Team members assigned to content calendar creation, videography, copy, and approval workflows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setManageRoleError(null);
                setRoleActionNotice(null);
                setIsManageRolesOpen(true);
              }}
              className="btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-[#172DC3]" />
              <span>Manage Roles</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          </div>
        </div>

        {staffMembers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-[#F8FAFC]">
            No team members added yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffMembers.map((staff) => {
              const initials = staff.name
                ? staff.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0].toUpperCase())
                    .join('')
                : 'U';

              return (
                <div
                  key={staff.id}
                  className="p-4 bg-[#F8FAFC] hover:bg-slate-50/80 transition rounded-2xl border border-slate-200/80 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#160857] to-[#172DC3] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <StaffProfilePopover staff={staff}>
                          <div className="font-bold text-[#15192B] text-sm truncate hover:text-[#172DC3] transition cursor-pointer underline decoration-dotted decoration-slate-300">
                            {staff.name}
                          </div>
                        </StaffProfilePopover>
                        <div className="text-xs font-bold text-[#172DC3] bg-indigo-50 border border-indigo-100 inline-block px-2 py-0.5 rounded-md mt-1 truncate max-w-full">
                          {staff.role}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(staff)}
                        className="p-1.5 text-slate-400 hover:text-[#172DC3] transition rounded-lg hover:bg-slate-200"
                        title="Edit staff member"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteStaff(staff.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-slate-200"
                        title="Remove staff member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact details */}
                  {(staff.email || staff.phoneNumber) && (
                    <div className="space-y-1 pt-2 border-t border-slate-200/60 text-xs">
                      {staff.email && (
                        <a
                          href={`mailto:${staff.email}`}
                          className="flex items-center gap-1.5 text-slate-600 hover:text-[#172DC3] font-medium truncate transition"
                        >
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{staff.email}</span>
                        </a>
                      )}
                      {staff.phoneNumber && (
                        <a
                          href={`tel:${staff.phoneNumber.replace(/\s+/g, '')}`}
                          className="flex items-center gap-1.5 text-slate-600 hover:text-[#172DC3] font-medium truncate transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{staff.phoneNumber}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
            Export full application state (campaigns, analytics records, custom roles, feedback memory, settings) as a portable JSON file.
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

      {/* ADD / EDIT STAFF MODAL */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#160857]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStaffForm}
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-[#172DC3]" />
                <span>{editingStaffId ? 'Edit Team Member' : 'Add Team Member'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Name input */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Sarah Mansour"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            {/* Role dropdown / selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-[#15192B]">
                  Role <span className="text-rose-500">*</span>
                </label>
                {!isCreatingInlineRole && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingInlineRole(true);
                      setInlineRoleError(null);
                    }}
                    className="text-[11px] font-bold text-[#172DC3] hover:underline"
                  >
                    + Create custom role
                  </button>
                )}
              </div>

              {!isCreatingInlineRole ? (
                <select
                  value={formRole}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW_ROLE__') {
                      setIsCreatingInlineRole(true);
                      setInlineRoleError(null);
                    } else {
                      setFormRole(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
                >
                  <optgroup label="Default Roles">
                    {DEFAULT_STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </optgroup>

                  {customRoles.length > 0 && (
                    <optgroup label="Custom Roles">
                      {customRoles.map((cr) => (
                        <option key={cr.id} value={cr.name}>
                          {cr.name}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  <option value="__ADD_NEW_ROLE__">+ Add new role...</option>
                </select>
              ) : (
                <div className="space-y-1.5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <div className="text-[11px] font-bold text-[#172DC3]">New Role Name</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inlineRoleName}
                      onChange={(e) => {
                        setInlineRoleName(e.target.value);
                        setInlineRoleError(null);
                      }}
                      placeholder="e.g. Content Creator, Influencer Lead"
                      className="flex-1 p-2 bg-white border border-indigo-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateInlineRole}
                      className="btn-primary px-3 py-2 text-xs font-bold whitespace-nowrap"
                    >
                      Save Role
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingInlineRole(false);
                        setInlineRoleName('');
                        setInlineRoleError(null);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {inlineRoleError && (
                    <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{inlineRoleError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Email input */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="e.g. sarah@3dimensions.tn"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
            </div>

            {/* Phone Number (Optional) */}
            <div>
              <label className="block text-xs font-bold text-[#15192B] mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => {
                  setFormPhone(e.target.value);
                  setPhoneError(null);
                }}
                placeholder="e.g. +216 20 123 456"
                className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 ${
                  phoneError ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                }`}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Supports international formats such as +216 XX XXX XXX.
              </p>
              {phoneError && (
                <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{phoneError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="btn-ghost px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary px-5 py-2 text-xs font-bold">
                {editingStaffId ? 'Update Member' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MANAGE ROLES MODAL */}
      {isManageRolesOpen && (
        <div className="fixed inset-0 z-50 bg-[#160857]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-5 border border-slate-200 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#15192B] text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#172DC3]" />
                  <span>Manage Staff Roles</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Configure default and custom job titles for staff members.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManageRolesOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications */}
            {manageRoleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{manageRoleError}</span>
              </div>
            )}
            {roleActionNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 border ${
                  roleActionNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{roleActionNotice.message}</span>
              </div>
            )}

            {/* Scrollable Role Lists */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* System Default Roles */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  System Default Roles ({DEFAULT_STAFF_ROLES.length})
                </div>
                <div className="space-y-1.5">
                  {DEFAULT_STAFF_ROLES.map((role) => {
                    const assignedCount = staffMembers.filter(
                      (s) => s.role.toLowerCase() === role.toLowerCase()
                    ).length;

                    return (
                      <div
                        key={role}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                      >
                        <div className="flex items-center gap-2 font-bold text-[#15192B]">
                          <Shield className="w-3.5 h-3.5 text-slate-400" />
                          <span>{role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {assignedCount} {assignedCount === 1 ? 'member' : 'members'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-200/80 px-2 py-0.5 rounded-md">
                            Default
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Roles List */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Custom Roles ({customRoles.length})
                </div>

                {customRoles.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    No custom roles added yet. Create one below.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {customRoles.map((cr) => {
                      const isEditingThis = editingRoleId === cr.id;
                      const assignedCount = staffMembers.filter(
                        (s) => s.role.toLowerCase() === cr.name.toLowerCase()
                      ).length;

                      if (isEditingThis) {
                        return (
                          <div
                            key={cr.id}
                            className="flex items-center gap-2 p-2 rounded-xl bg-indigo-50 border border-indigo-200"
                          >
                            <input
                              type="text"
                              value={editingRoleName}
                              onChange={(e) => setEditingRoleName(e.target.value)}
                              className="flex-1 p-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameRole(cr.id)}
                              className="btn-primary p-1.5 text-xs font-bold rounded-lg"
                              title="Save name"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRoleId(null);
                                setEditingRoleName('');
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={cr.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2 font-bold text-[#15192B]">
                            <span className="w-2 h-2 rounded-full bg-[#172DC3]" />
                            <span>{cr.name}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                assignedCount > 0
                                  ? 'bg-indigo-50 text-[#172DC3] border border-indigo-100'
                                  : 'text-slate-400 bg-slate-100'
                              }`}
                            >
                              {assignedCount} {assignedCount === 1 ? 'member' : 'members'}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRoleId(cr.id);
                                  setEditingRoleName(cr.name);
                                  setManageRoleError(null);
                                }}
                                className="p-1 text-slate-400 hover:text-[#172DC3] transition rounded hover:bg-slate-100"
                                title="Rename role"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRoleInManager(cr)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition rounded hover:bg-slate-100"
                                title="Delete role"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Add Custom Role Form */}
            <form
              onSubmit={handleAddNewRoleInManager}
              className="pt-3 border-t border-slate-100 flex items-center gap-2"
            >
              <input
                type="text"
                value={newRoleInput}
                onChange={(e) => {
                  setNewRoleInput(e.target.value);
                  setManageRoleError(null);
                }}
                placeholder="Enter new custom role name..."
                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
              />
              <button
                type="submit"
                disabled={!newRoleInput.trim()}
                className="btn-primary px-4 py-2.5 text-xs font-bold flex items-center gap-1 shrink-0 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Role</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
