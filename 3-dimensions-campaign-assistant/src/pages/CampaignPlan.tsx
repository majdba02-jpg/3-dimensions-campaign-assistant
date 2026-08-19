import React, { useState, useEffect } from 'react';
import {
  CampaignBrief,
  CampaignPlan as CampaignPlanType,
  CalendarItem,
  StaffMember,
} from '../types';
import {
  Lock,
  Unlock,
  RefreshCw,
  Calendar as CalendarIcon,
  List,
  Grid,
  Sparkles,
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  AlertTriangle,
  Edit3,
  X,
} from 'lucide-react';
import { StaffProfilePopover } from '../components/StaffProfilePopover';

interface CampaignPlanProps {
  brief: CampaignBrief | null;
  plan: CampaignPlanType | null;
  staffMembers: StaffMember[];
  onSavePlan: (updatedPlan: CampaignPlanType) => Promise<void>;
  onSaveBrief?: (updatedBrief: CampaignBrief) => Promise<void>;
  onRegenerateComponent: (
    componentKey: string,
    lockedKeys: string[],
    instructions?: string
  ) => Promise<void>;
  isGenerating: boolean;
  onOpenContentReview: (item: CalendarItem) => void;
}

export const CampaignPlan: React.FC<CampaignPlanProps> = ({
  brief,
  plan,
  staffMembers,
  onSavePlan,
  onSaveBrief,
  onRegenerateComponent,
  isGenerating,
  onOpenContentReview,
}) => {
  const [calendarView, setCalendarView] = useState<'grid' | 'table'>('table');
  const [lockedComponents, setLockedComponents] = useState<Record<string, boolean>>({});
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(brief?.name || '');

  useEffect(() => {
    if (brief) {
      setNameInput(brief.name);
      setIsEditingName(false);
    }
  }, [brief?.id, brief?.name]);

  if (!plan || !brief) {
    return (
      <div className="p-12 text-center bg-[#F8FAFC] min-h-[60vh] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#172DC3] mb-3">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-[#15192B] text-base">
          {brief ? `No Campaign Plan Generated for "${brief.name}"` : 'No Campaign Plan Selected'}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {brief
            ? 'This campaign brief does not have a generated plan yet. You can generate directions and a plan from the campaign brief.'
            : 'Please create a new campaign or select an existing campaign from the Campaign Library.'}
        </p>
      </div>
    );
  }

  const handleSaveName = async () => {
    if (!nameInput.trim() || !onSaveBrief) return;
    const updated = {
      ...brief,
      name: nameInput.trim(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveBrief(updated);
    setIsEditingName(false);
  };

  const toggleLock = (key: string) => {
    setLockedComponents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isLocked = (key: string) => !!lockedComponents[key];

  const handleRegenerateSingle = async (key: string) => {
    if (isLocked(key)) return;
    const lockedKeys = Object.keys(lockedComponents).filter((k) => lockedComponents[k]);
    await onRegenerateComponent(key, lockedKeys);
  };

  const handleAssignStaff = (itemId: string, staffId: string) => {
    const updatedCalendar = plan.calendar.map((item) => {
      if (item.id === itemId) {
        const currentList = item.concernedPeopleIds || [];
        const newList = currentList.includes(staffId)
          ? currentList.filter((id) => id !== staffId)
          : [...currentList, staffId];
        return { ...item, concernedPeopleIds: newList };
      }
      return item;
    });

    onSavePlan({ ...plan, calendar: updatedCalendar });
  };

  const handleCopyPlanText = () => {
    const text = `CAMPAIGN PLAN: ${brief.name}
Concept: ${plan.concept}
Core Message: ${plan.coreMessage}
Value Proposition: ${plan.valueProposition}
Content Pillars: ${plan.contentPillars.join(', ')}

CALENDAR ITEMS (${plan.calendar.length}):
${plan.calendar
  .map(
    (c) =>
      `[${c.date}] [${c.platform} - ${c.format}] ${c.topic}\nHook: ${c.hook}\nCaption: ${c.caption}\nCTA: ${c.cta}\n`
  )
  .join('\n---\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Campaign Banner Header */}
      <div className="card-tier-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-[#172DC3] uppercase tracking-wider">
              {brief.type}
            </span>
            <span className="text-xs text-slate-500 font-medium">• {brief.audienceSegment} Audience</span>
            <span className="text-xs text-slate-500 font-medium">• {brief.language}</span>
          </div>
          {isEditingName ? (
            <div className="flex items-center gap-2 mt-1 mb-1">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="text-lg font-black text-[#15192B] border border-indigo-300 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setNameInput(brief.name);
                    setIsEditingName(false);
                  }
                }}
              />
              <button
                onClick={handleSaveName}
                className="btn-primary text-xs px-2.5 py-1 font-bold"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setNameInput(brief.name);
                  setIsEditingName(false);
                }}
                className="btn-secondary text-xs px-2.5 py-1 font-bold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/title">
              <h1 className="text-xl font-black text-[#15192B]">{brief.name}</h1>
              {onSaveBrief && (
                <button
                  onClick={() => setIsEditingName(true)}
                  title="Edit campaign name"
                  className="opacity-60 hover:opacity-100 p-1 text-slate-400 hover:text-[#172DC3] transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-slate-600 font-medium mt-1">
            Product: <strong className="text-[#15192B]">{brief.productOrService}</strong> | Goal: {brief.objective}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPlanText}
            className="btn-secondary flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
          >
            {copiedNotice ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copiedNotice ? 'Copied to Clipboard' : 'Copy Plan Summary'}</span>
          </button>
        </div>
      </div>

      {/* STRATEGIC COMPONENTS WORKSPACE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Strategic Campaign Components (Lock fields before regenerating)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Concept & Core Message */}
          <div className={`card-tier-1 p-5 space-y-3 transition duration-200 ${isLocked('concept') ? 'border-2 border-[#172DC3] bg-indigo-50/20' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#CB19C2]" />
                <span>Concept & Core Message</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleLock('concept')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    isLocked('concept') ? 'bg-[#160857] text-white' : 'btn-secondary'
                  }`}
                >
                  {isLocked('concept') ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{isLocked('concept') ? 'Locked' : 'Lock'}</span>
                </button>
                {!isLocked('concept') && (
                  <button
                    onClick={() => handleRegenerateSingle('concept')}
                    disabled={isGenerating}
                    className="btn-secondary px-2.5 py-1 text-xs font-bold flex items-center gap-1 text-[#172DC3]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Regen</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Concept</span>
              <p className="text-xs text-slate-800 font-medium mt-0.5">{plan.concept}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Core Message</span>
              <p className="text-xs font-bold text-[#160857] bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 mt-0.5">
                "{plan.coreMessage}"
              </p>
            </div>
          </div>

          {/* Value Proposition & Pillars */}
          <div className={`card-tier-1 p-5 space-y-3 transition duration-200 ${isLocked('valueProposition') ? 'border-2 border-[#172DC3] bg-indigo-50/20' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#15192B] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6344BF]" />
                <span>Value Prop & Pillars</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleLock('valueProposition')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                    isLocked('valueProposition') ? 'bg-[#160857] text-white' : 'btn-secondary'
                  }`}
                >
                  {isLocked('valueProposition') ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{isLocked('valueProposition') ? 'Locked' : 'Lock'}</span>
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Value Proposition</span>
              <p className="text-xs text-slate-800 font-medium mt-0.5">{plan.valueProposition}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Content Pillars</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {plan.contentPillars.map((p, idx) => (
                  <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-semibold">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Designer & Videographer Production Briefs */}
          <div className={`card-tier-1 p-5 space-y-3 md:col-span-2 ${isLocked('creativeBriefs') ? 'border-2 border-[#172DC3] bg-indigo-50/20' : ''}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#15192B] uppercase tracking-wider">
                Production & Creative Briefs (Designer & Videographer)
              </span>
              <button
                onClick={() => toggleLock('creativeBriefs')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  isLocked('creativeBriefs') ? 'bg-[#160857] text-white' : 'btn-secondary'
                }`}
              >
                {isLocked('creativeBriefs') ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked('creativeBriefs') ? 'Locked' : 'Lock'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-[#15192B] flex items-center gap-1.5 mb-1">
                  <ImageIcon className="w-3.5 h-3.5 text-[#172DC3]" />
                  <span>3D Designer Brief</span>
                </span>
                <p className="text-xs text-slate-700 font-medium">{plan.designerBrief}</p>
              </div>

              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-200/80">
                <span className="text-xs font-bold text-[#15192B] flex items-center gap-1.5 mb-1">
                  <Film className="w-3.5 h-3.5 text-[#A90CBF]" />
                  <span>Videographer Shot List & Directions</span>
                </span>
                <p className="text-xs text-slate-700 font-medium">{plan.videographerBrief}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECOMMENDED PUBLISHING CADENCE & STRATEGY */}
      {plan.recommendedCadence && (
        <div className="card-tier-1 p-5 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/30 border border-indigo-100/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#172DC3] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#CB19C2]" />
              <span>Recommended Posting Cadence ({brief.durationDays} Days)</span>
            </h3>
            <span className="text-xs font-bold text-slate-600">
              Total Primary Posts: <strong className="text-[#15192B]">{plan.recommendedCadence.totalPrimaryPosts}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Reels / Shorts</span>
              <span className="text-base font-black text-[#15192B]">{plan.recommendedCadence.reels}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Carousels</span>
              <span className="text-base font-black text-[#15192B]">{plan.recommendedCadence.carousels}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Feed Photos</span>
              <span className="text-base font-black text-[#15192B]">{plan.recommendedCadence.feedPosts}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Stories</span>
              <span className="text-base font-black text-[#15192B]">{plan.recommendedCadence.stories}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 font-medium bg-white/80 p-3 rounded-xl border border-slate-200/60 italic">
            "{plan.recommendedCadence.rationale}"
          </p>
        </div>
      )}

      {/* CONTENT CALENDAR WORKSPACE */}
      <div className="card-tier-1 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#15192B] flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#172DC3]" />
              <span>Campaign Content Calendar ({plan.calendar.length} Posts)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Assign staff members, view scripts, or click to open individual post review workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setCalendarView('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  calendarView === 'table' ? 'bg-white text-[#172DC3] shadow-xs' : 'text-slate-600'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setCalendarView('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  calendarView === 'grid' ? 'bg-white text-[#172DC3] shadow-xs' : 'text-slate-600'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grid Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* CALENDAR TABLE VIEW */}
        {calendarView === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Platform & Format</th>
                  <th className="py-3 px-4">Topic / Hook / Copy</th>
                  <th className="py-3 px-3">Call To Action</th>
                  <th className="py-3 px-3">Concerned Staff</th>
                  <th className="py-3 px-3 text-center">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {plan.calendar.map((item) => (
                  <tr key={item.id} className="hover:bg-indigo-50/30 transition">
                    <td className="py-3 px-3 whitespace-nowrap font-mono text-[#15192B] font-bold">
                      {item.date}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap space-y-1">
                      <div className="font-bold text-[#15192B]">{item.platform}</div>
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-[#172DC3]">
                        {item.format}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#15192B]">{item.topic}</span>
                        {item.factualStatus === 'requires_confirmation' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Requires confirmation</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#160857] font-semibold italic mt-0.5">
                        Hook: "{item.hook}"
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">{item.caption}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium max-w-xs">{item.cta}</td>
                    <td className="py-3 px-3 min-w-[170px]">
                      {/* Concerned People Dropdown Selector & Interactive Chips */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1">
                          {(item.concernedPeopleIds || []).map((staffId) => {
                            const staff = staffMembers.find((s) => s.id === staffId);
                            if (!staff) return null;
                            return (
                              <div
                                key={staff.id}
                                className="inline-flex items-center gap-1 bg-indigo-50/90 hover:bg-indigo-100/90 text-[#172DC3] border border-indigo-200/90 text-[10px] pl-1.5 pr-1 py-0.5 rounded-md font-bold transition shadow-2xs"
                              >
                                <StaffProfilePopover staff={staff}>
                                  <span className="cursor-pointer hover:underline flex items-center gap-1">
                                    <span>{staff.name}</span>
                                    <span className="text-[9px] text-slate-500 font-semibold border-l border-indigo-200 pl-1 ml-0.5">
                                      {staff.role}
                                    </span>
                                  </span>
                                </StaffProfilePopover>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssignStaff(item.id, staff.id);
                                  }}
                                  className="text-slate-400 hover:text-rose-600 rounded p-0.5 transition ml-0.5"
                                  title={`Unassign ${staff.name}`}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <select
                          onChange={(e) => {
                            if (e.target.value) handleAssignStaff(item.id, e.target.value);
                            e.target.value = '';
                          }}
                          className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-full font-medium focus:outline-none focus:ring-1 focus:ring-[#172DC3]/30"
                        >
                          <option value="">+ Assign Staff Member...</option>
                          {staffMembers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} - {s.role}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onOpenContentReview(item)}
                        className="btn-primary px-3 py-1.5 text-xs font-bold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* CALENDAR GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.calendar.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200/80 hover:border-[#172DC3]/40 transition duration-200 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#15192B]">{item.date}</span>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 border border-indigo-100 text-[#172DC3]">
                      {item.platform} • {item.format}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-[#15192B] text-sm">{item.topic}</h4>
                    {item.factualStatus === 'requires_confirmation' && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Confirm</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#160857] font-semibold italic">"{item.hook}"</p>
                  <p className="text-xs text-slate-600 line-clamp-3 bg-white p-2.5 rounded-xl border border-slate-200/80 font-medium">
                    {item.caption}
                  </p>

                  {/* Assigned Team Members in Card View */}
                  {(item.concernedPeopleIds || []).length > 0 && (
                    <div className="pt-1.5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Assigned Team:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(item.concernedPeopleIds || []).map((staffId) => {
                          const staff = staffMembers.find((s) => s.id === staffId);
                          if (!staff) return null;
                          return (
                            <StaffProfilePopover key={staff.id} staff={staff}>
                              <span className="inline-flex items-center gap-1 bg-white hover:bg-indigo-50/80 text-[#172DC3] border border-slate-200 hover:border-indigo-200 text-[10px] px-2 py-0.5 rounded-md font-bold transition cursor-pointer shadow-2xs">
                                <span>{staff.name}</span>
                                <span className="text-[9px] text-slate-400 font-semibold">({staff.role})</span>
                              </span>
                            </StaffProfilePopover>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="text-[10px] text-slate-500 font-semibold">
                    Deadline: {item.productionDeadline || '3 days prior'}
                  </div>
                  <button
                    onClick={() => onOpenContentReview(item)}
                    className="btn-primary px-3 py-1 text-xs font-bold"
                  >
                    Open Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
