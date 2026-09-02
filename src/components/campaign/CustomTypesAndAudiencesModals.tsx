import React, { useState } from 'react';
import {
  CustomCampaignType,
  CustomTargetAudience,
  CampaignBrief,
} from '../../types';
import { DEFAULT_CAMPAIGN_TYPES } from '../../data/campaignConstants';
import { Plus, Edit2, Trash2, AlertTriangle, Check, X, Shield } from 'lucide-react';

interface ManageCampaignTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTypes: CustomCampaignType[];
  campaigns: CampaignBrief[];
  onAddType: (name: string) => Promise<CustomCampaignType>;
  onUpdateType: (id: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteType: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export const ManageCampaignTypesModal: React.FC<ManageCampaignTypesModalProps> = ({
  isOpen,
  onClose,
  customTypes,
  campaigns,
  onAddType,
  onUpdateType,
  onDeleteType,
}) => {
  const [newTypeName, setNewTypeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [warningModal, setWarningModal] = useState<{
    action: 'edit' | 'delete';
    id: string;
    newName?: string;
    campaignCount: number;
    typeName: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const countUsage = (typeName: string) => {
    return campaigns.filter(
      (c) => c.type && c.type.toLowerCase() === typeName.toLowerCase()
    ).length;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = newTypeName.trim();
    if (!trimmed) return;

    const allNames = [
      ...DEFAULT_CAMPAIGN_TYPES,
      ...customTypes.map((t) => t.name),
    ];
    if (allNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`A campaign type named "${trimmed}" already exists.`);
      return;
    }

    try {
      await onAddType(trimmed);
      setNewTypeName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add campaign type');
    }
  };

  const initiateEdit = (type: CustomCampaignType) => {
    setErrorMsg('');
    const count = countUsage(type.name);
    if (count > 0) {
      setWarningModal({
        action: 'edit',
        id: type.id,
        typeName: type.name,
        campaignCount: count,
      });
      setEditingId(type.id);
      setEditName(type.name);
    } else {
      setEditingId(type.id);
      setEditName(type.name);
    }
  };

  const executeEdit = async (id: string) => {
    setErrorMsg('');
    const trimmed = editName.trim();
    if (!trimmed) return;

    const res = await onUpdateType(id, trimmed);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update campaign type');
    } else {
      setEditingId(null);
      setWarningModal(null);
    }
  };

  const initiateDelete = (type: CustomCampaignType) => {
    setErrorMsg('');
    const count = countUsage(type.name);
    if (count > 0) {
      setWarningModal({
        action: 'delete',
        id: type.id,
        typeName: type.name,
        campaignCount: count,
      });
    } else {
      onDeleteType(type.id);
    }
  };

  const executeDelete = async (id: string) => {
    await onDeleteType(id);
    setWarningModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-[#15192B]">Manage Campaign Types</h3>
            <p className="text-xs text-slate-500 font-medium">Configure standard and custom campaign classifications</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Add Form */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Add new campaign type..."
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
          />
          <button
            type="submit"
            className="btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Type</span>
          </button>
        </form>

        {/* Types List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-1">
            System Defaults (Standard)
          </div>
          {DEFAULT_CAMPAIGN_TYPES.map((t) => (
            <div
              key={t}
              className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 border border-slate-200/70 rounded-xl text-xs"
            >
              <span className="font-semibold text-slate-700">{t}</span>
              <span className="text-[10px] text-slate-400 font-mono font-medium">System Default</span>
            </div>
          ))}

          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 pt-3">
            Custom Campaign Types ({customTypes.length})
          </div>
          {customTypes.length === 0 ? (
            <div className="text-xs text-slate-400 italic p-4 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 font-medium">
              No custom campaign types created yet.
            </div>
          ) : (
            customTypes.map((type) => {
              const count = countUsage(type.name);
              return (
                <div
                  key={type.id}
                  className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs"
                >
                  {editingId === type.id ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-indigo-300 rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => executeEdit(type.id)}
                        className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#15192B]">{type.name}</span>
                        {count > 0 && (
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-[#172DC3] rounded-md font-bold">
                            Used in {count} campaign{count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => initiateEdit(type)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => initiateDelete(type)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-bold"
          >
            Done
          </button>
        </div>

        {/* Historical Impact Confirmation Modal */}
        {warningModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-sm w-full p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <h4 className="text-sm font-bold text-slate-900">
                  {warningModal.action === 'edit'
                    ? 'Confirm Campaign Type Rename'
                    : 'Confirm Campaign Type Deletion'}
                </h4>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                This campaign type is currently used by{' '}
                <span className="font-bold text-slate-900">{warningModal.campaignCount}</span>{' '}
                campaign{warningModal.campaignCount > 1 ? 's' : ''}. Changing or deleting it may make
                historical campaign classification inconsistent.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setWarningModal(null);
                    setEditingId(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (warningModal.action === 'delete') {
                      executeDelete(warningModal.id);
                    } else {
                      setWarningModal(null);
                    }
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors"
                >
                  Continue Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ManageTargetAudiencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customAudiences: CustomTargetAudience[];
  campaigns: CampaignBrief[];
  onAddAudience: (name: string, description?: string) => Promise<CustomTargetAudience>;
  onUpdateAudience: (id: string, newName: string, description?: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteAudience: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export const ManageTargetAudiencesModal: React.FC<ManageTargetAudiencesModalProps> = ({
  isOpen,
  onClose,
  customAudiences,
  campaigns,
  onAddAudience,
  onUpdateAudience,
  onDeleteAudience,
}) => {
  const [newAudienceName, setNewAudienceName] = useState('');
  const [newAudienceDesc, setNewAudienceDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const countUsage = (name: string) => {
    return campaigns.filter((c) => {
      if (c.targetAudiences && c.targetAudiences.some((a) => a.toLowerCase() === name.toLowerCase())) {
        return true;
      }
      return c.targetAudience && c.targetAudience.toLowerCase().includes(name.toLowerCase());
    }).length;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const trimmed = newAudienceName.trim();
    if (!trimmed) return;

    if (customAudiences.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`An audience named "${trimmed}" already exists.`);
      return;
    }

    try {
      await onAddAudience(trimmed, newAudienceDesc.trim() || undefined);
      setNewAudienceName('');
      setNewAudienceDesc('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add audience');
    }
  };

  const executeEdit = async (id: string) => {
    setErrorMsg('');
    const trimmed = editName.trim();
    if (!trimmed) return;

    const res = await onUpdateAudience(id, trimmed, editDesc.trim() || undefined);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to update audience');
    } else {
      setEditingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-[#15192B]">Manage Target Audiences</h3>
            <p className="text-xs text-slate-500 font-medium">Add or manage reusable audience profiles</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Add Form */}
        <form onSubmit={handleAdd} className="space-y-2">
          <input
            type="text"
            required
            placeholder="Audience name (e.g. Architecture Students, Tech Startup Founders)..."
            value={newAudienceName}
            onChange={(e) => setNewAudienceName(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Optional description / characteristics..."
              value={newAudienceDesc}
              onChange={(e) => setNewAudienceDesc(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
            />
            <button
              type="submit"
              className="btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Audiences List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {customAudiences.length === 0 ? (
            <div className="text-xs text-slate-400 italic p-4 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 font-medium">
              No custom target audiences saved yet. Add your first reusable audience profile above.
            </div>
          ) : (
            customAudiences.map((aud) => {
              const count = countUsage(aud.name);
              return (
                <div
                  key={aud.id}
                  className="p-3 bg-white border border-slate-200/90 rounded-xl text-xs space-y-1.5"
                >
                  {editingId === aud.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-indigo-300 rounded-lg focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description..."
                        className="w-full px-3 py-1.5 text-xs border border-indigo-300 rounded-lg focus:outline-none"
                      />
                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => executeEdit(aud.id)}
                          className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#15192B]">{aud.name}</span>
                          {count > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-[#172DC3] rounded-md font-bold">
                              {count} campaign{count > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {aud.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                            {aud.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(aud.id);
                            setEditName(aud.name);
                            setEditDesc(aud.description || '');
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAudience(aud.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
