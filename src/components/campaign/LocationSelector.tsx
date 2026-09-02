import React, { useState } from 'react';
import { LocationGroup } from '../../types';
import { TUNISIA_GOVERNORATES, DEFAULT_LOCATION_GROUPS } from '../../data/campaignConstants';
import { MapPin, Search, Plus, Trash2, Edit2, Settings2, X, Check, AlertTriangle } from 'lucide-react';

interface LocationSelectorProps {
  selectedGovernorates: string[];
  onChangeGovernorates: (governorates: string[]) => void;
  customLocationGroups: LocationGroup[];
  onSaveCustomGroup?: (group: LocationGroup) => void;
  onUpdateCustomGroup?: (group: LocationGroup) => void;
  onDeleteCustomGroup?: (id: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedGovernorates,
  onChangeGovernorates,
  customLocationGroups,
  onSaveCustomGroup,
  onUpdateCustomGroup,
  onDeleteCustomGroup,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupGovernorates, setEditGroupGovernorates] = useState<string[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupGovs, setNewGroupGovs] = useState<string[]>([]);

  const allGroups = [...DEFAULT_LOCATION_GROUPS, ...customLocationGroups];

  const filteredGovernorates = TUNISIA_GOVERNORATES.filter((gov) =>
    gov.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleGovernorate = (gov: string) => {
    if (selectedGovernorates.includes(gov)) {
      onChangeGovernorates(selectedGovernorates.filter((g) => g !== gov));
    } else {
      onChangeGovernorates([...selectedGovernorates, gov]);
    }
  };

  const handleSelectGroup = (group: LocationGroup) => {
    const allInGroupSelected = group.governorates.every((g) =>
      selectedGovernorates.includes(g)
    );

    if (allInGroupSelected) {
      onChangeGovernorates(
        selectedGovernorates.filter((g) => !group.governorates.includes(g))
      );
    } else {
      const combined = Array.from(
        new Set([...selectedGovernorates, ...group.governorates])
      );
      onChangeGovernorates(combined);
    }
  };

  const handleStartEdit = (group: LocationGroup) => {
    setEditingGroupId(group.id);
    setEditGroupName(group.name);
    setEditGroupGovernorates([...group.governorates]);
  };

  const handleSaveEdit = () => {
    if (!editingGroupId || !editGroupName.trim() || editGroupGovernorates.length === 0) return;
    const updated: LocationGroup = {
      id: editingGroupId,
      name: editGroupName.trim(),
      governorates: editGroupGovernorates,
      isCustom: true,
    };
    if (onUpdateCustomGroup) {
      onUpdateCustomGroup(updated);
    } else if (onSaveCustomGroup) {
      onSaveCustomGroup(updated);
    }
    setEditingGroupId(null);
  };

  const handleCreateNewGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || newGroupGovs.length === 0 || !onSaveCustomGroup) return;

    const newGroup: LocationGroup = {
      id: `lgrp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newGroupName.trim(),
      governorates: [...newGroupGovs],
      isCustom: true,
    };

    onSaveCustomGroup(newGroup);
    setNewGroupName('');
    setNewGroupGovs([]);
    setIsCreatingNew(false);
  };

  return (
    <div className="space-y-3" id="location-selector-container">
      {/* Group presets bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Regional Presets:</span>
          <button
            type="button"
            onClick={() => {
              setNewGroupGovs([...selectedGovernorates]);
              setShowManageModal(true);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#172DC3] hover:text-[#201B9F] cursor-pointer"
          >
            <Settings2 className="w-3 h-3" />
            <span>Manage Location Groups</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {allGroups.map((group) => {
            const allSelected =
              group.governorates.length > 0 &&
              group.governorates.every((g) => selectedGovernorates.includes(g));
            const someSelected =
              !allSelected &&
              group.governorates.some((g) => selectedGovernorates.includes(g));

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectGroup(group)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  allSelected
                    ? 'bg-[#172DC3] text-white border-[#172DC3] shadow-xs'
                    : someSelected
                    ? 'bg-indigo-50 text-[#172DC3] border-indigo-200 ring-1 ring-indigo-200'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{group.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    allSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-100 text-slate-600 font-semibold'
                  }`}
                >
                  {group.governorates.length}
                </span>
              </button>
            );
          })}

          <div className="flex items-center gap-1.5 ml-auto text-xs">
            <button
              type="button"
              onClick={() => onChangeGovernorates([...TUNISIA_GOVERNORATES])}
              className="text-[#172DC3] hover:text-[#201B9F] font-bold cursor-pointer"
            >
              Select All (24)
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => onChangeGovernorates([])}
              className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Governorates Checkbox Grid */}
      <div className="border border-slate-200/90 rounded-xl p-3 bg-slate-50/50">
        <div className="relative mb-2.5">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter governorates (e.g., Tunis, Sousse, Sfax, Bizerte)..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
          {filteredGovernorates.map((gov) => {
            const checked = selectedGovernorates.includes(gov);
            return (
              <label
                key={gov}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer border select-none transition-colors ${
                  checked
                    ? 'bg-indigo-50 text-[#160857] border-indigo-200 font-bold shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50/80 hover:border-slate-300 font-medium'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleGovernorate(gov)}
                  className="w-3.5 h-3.5 rounded text-[#172DC3] border-slate-300 focus:ring-[#172DC3] cursor-pointer"
                />
                <span className="truncate">{gov}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Manage Location Groups Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-[#15192B]">Manage Location Groups</h3>
                <p className="text-xs text-slate-500">Create, edit, and organize custom regional governorate presets</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowManageModal(false);
                  setEditingGroupId(null);
                  setIsCreatingNew(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Create New Group Form */}
            {!isCreatingNew && !editingGroupId && (
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(true);
                  setNewGroupGovs(selectedGovernorates.length > 0 ? [...selectedGovernorates] : []);
                }}
                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold w-full justify-center"
              >
                <Plus className="w-4 h-4 text-[#172DC3]" />
                <span>Create New Custom Location Group</span>
              </button>
            )}

            {isCreatingNew && (
              <form onSubmit={handleCreateNewGroup} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#160857]">New Location Group</h4>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Group Name (e.g. Sahel Region, Southern Hubs)..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
                />
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select Member Governorates ({newGroupGovs.length} selected):
                  </label>
                  <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto p-2 bg-white border border-slate-200/90 rounded-lg">
                    {TUNISIA_GOVERNORATES.map((g) => {
                      const checked = newGroupGovs.includes(g);
                      return (
                        <label key={g} className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (checked) setNewGroupGovs(newGroupGovs.filter((x) => x !== g));
                              else setNewGroupGovs([...newGroupGovs, g]);
                            }}
                            className="w-3 h-3 text-[#172DC3] rounded"
                          />
                          <span className="truncate">{g}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="btn-secondary px-3 py-1.5 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newGroupName.trim() || newGroupGovs.length === 0}
                    className="btn-primary px-4 py-1.5 text-xs font-bold disabled:opacity-50"
                  >
                    Save Group
                  </button>
                </div>
              </form>
            )}

            {/* List of Custom Groups */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Custom Groups ({customLocationGroups.length})</h4>
              {customLocationGroups.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No custom location groups saved yet. Click above to create one.
                </div>
              ) : (
                customLocationGroups.map((group) => {
                  if (editingGroupId === group.id) {
                    return (
                      <div key={group.id} className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-950">Editing Group</span>
                          <button
                            type="button"
                            onClick={() => setEditingGroupId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                        <input
                          type="text"
                          value={editGroupName}
                          onChange={(e) => setEditGroupName(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200/90 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#172DC3]/20 focus:border-[#172DC3]"
                        />
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Member Governorates ({editGroupGovernorates.length}):
                          </label>
                          <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto p-2 bg-white border border-slate-200/90 rounded-lg">
                            {TUNISIA_GOVERNORATES.map((g) => {
                              const checked = editGroupGovernorates.includes(g);
                              return (
                                <label key={g} className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      if (checked) setEditGroupGovernorates(editGroupGovernorates.filter((x) => x !== g));
                                      else setEditGroupGovernorates([...editGroupGovernorates, g]);
                                    }}
                                    className="w-3 h-3 text-[#172DC3] rounded"
                                  />
                                  <span className="truncate">{g}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingGroupId(null)}
                            className="btn-secondary px-3 py-1.5 text-xs font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={!editGroupName.trim() || editGroupGovernorates.length === 0}
                            className="btn-primary px-4 py-1.5 text-xs font-bold disabled:opacity-50"
                          >
                            Update Group
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={group.id}
                      className="p-3 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{group.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {group.governorates.join(', ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(group)}
                          className="p-1.5 text-slate-400 hover:text-[#172DC3] hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit group"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteCustomGroup && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomGroup(group.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Default Presets (Read-only reference) */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Built-in Regional Presets</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  {DEFAULT_LOCATION_GROUPS.map((dg) => (
                    <div key={dg.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                      <div className="font-bold text-slate-800">{dg.name}</div>
                      <div className="text-[10px] text-slate-400">{dg.governorates.length} governorates</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
