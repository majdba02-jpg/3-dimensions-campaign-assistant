import React, { useState, useMemo } from 'react';
import {
  MarketingDataRecord,
  WidgetPreference,
} from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  TrendingUp,
  Eye,
  Users,
  MousePointerClick,
  Pin,
  EyeOff,
  RotateCcw,
  ExternalLink,
  SlidersHorizontal,
  PlaySquare,
  Image as ImageIcon,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface MarketingInsightsProps {
  records?: MarketingDataRecord[];
  widgets?: WidgetPreference[];
  onSaveWidgets: (newWidgets: WidgetPreference[]) => void;
}

export const MarketingInsights: React.FC<MarketingInsightsProps> = ({
  records = [],
  widgets = [],
  onSaveWidgets,
}) => {
  const safeRecords = Array.isArray(records) ? records : [];
  const safeWidgets = Array.isArray(widgets) ? widgets : [];

  // Filters
  const [selectedFormat, setSelectedFormat] = useState<'All' | 'Vidéos' | 'Photos'>('All');
  const [selectedDateOption, setSelectedDateOption] = useState<string>('All Time');
  const [sortField, setSortField] = useState<keyof MarketingDataRecord>('reach');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Dynamically derive available date filters from uploaded records
  const availableDateOptions = useMemo(() => {
    const monthsSet = new Set<string>();
    safeRecords.forEach((r) => {
      if (r.publishTime) {
        const datePart = r.publishTime.split(' ')[0];
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const month = parts[0].padStart(2, '0');
          const year = parts[2];
          monthsSet.add(`${year}-${month}`);
        }
      }
    });
    return ['All Time', ...Array.from(monthsSet).sort()];
  }, [safeRecords]);

  // Filtered dataset calculated deterministically
  const filteredRecords = useMemo(() => {
    return safeRecords.filter((rec) => {
      // Format filter
      if (selectedFormat !== 'All' && rec.publicationType !== selectedFormat) {
        return false;
      }
      // Dynamic Date filter
      if (selectedDateOption !== 'All Time') {
        if (!rec.publishTime) return false;
        const datePart = rec.publishTime.split(' ')[0];
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const month = parts[0].padStart(2, '0');
          const year = parts[2];
          const recMonthKey = `${year}-${month}`;
          if (recMonthKey !== selectedDateOption) return false;
        }
      }
      return true;
    });
  }, [records, selectedFormat, selectedDateOption]);

  // Deterministic KPI Summary Calculations
  const kpis = useMemo(() => {
    const totalRecords = filteredRecords.length;
    if (totalRecords === 0) {
      return {
        totalReach: 0,
        totalViews: 0,
        totalEngagement: 0,
        totalClicks: 0,
        linkClicks: 0,
        organicReach: 0,
        boostedReach: 0,
        avgWatchTime: 0,
      };
    }

    let reach = 0;
    let views = 0;
    let engagement = 0;
    let clicks = 0;
    let linkClicks = 0;
    let organicReach = 0;
    let boostedReach = 0;
    let watchTimeSum = 0;
    let watchTimeCount = 0;

    filteredRecords.forEach((r) => {
      reach += r.reach || 0;
      views += r.views || 0;
      engagement += r.totalEngagement || 0;
      clicks += r.totalClicks || 0;
      linkClicks += r.linkClicks || 0;
      organicReach += r.organicReach || 0;
      boostedReach += r.boostedReach || 0;
      if (r.averageWatchTimeSeconds > 0) {
        watchTimeSum += r.averageWatchTimeSeconds;
        watchTimeCount++;
      }
    });

    return {
      totalReach: reach,
      totalViews: views,
      totalEngagement: engagement,
      totalClicks: clicks,
      linkClicks,
      organicReach,
      boostedReach,
      avgWatchTime: watchTimeCount > 0 ? (watchTimeSum / watchTimeCount).toFixed(1) : '0',
    };
  }, [filteredRecords]);

  // Chart 1: Time Series Trend
  const timeSeriesData = useMemo(() => {
    const map = new Map<string, { date: string; reach: number; views: number; engagement: number }>();

    filteredRecords.forEach((r) => {
      // Format MM/DD
      const dateKey = r.publishTime ? r.publishTime.slice(0, 5) : 'Unknown';
      const existing = map.get(dateKey) || { date: dateKey, reach: 0, views: 0, engagement: 0 };
      existing.reach += r.reach;
      existing.views += r.views;
      existing.engagement += r.totalEngagement;
      map.set(dateKey, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRecords]);

  // Chart 2: Organic vs Boosted Contribution
  const organicVsBoostedData = useMemo(() => {
    let orgReach = 0;
    let boostReach = 0;
    let orgViews = 0;
    let boostViews = 0;

    filteredRecords.forEach((r) => {
      orgReach += r.organicReach;
      boostReach += r.boostedReach;
      orgViews += r.organicViews;
      boostViews += r.boostedViews;
    });

    return [
      { category: 'Reach (Couverture)', Organic: orgReach, Boosted: boostReach },
      { category: 'Views (Vues)', Organic: orgViews, Boosted: boostViews },
    ];
  }, [filteredRecords]);

  // Clicks Trend Data
  const clicksTrendData = useMemo(() => {
    const map = new Map<string, { date: string; totalClicks: number; linkClicks: number }>();
    filteredRecords.forEach((r) => {
      const d = r.publishTime ? r.publishTime.slice(0, 10) : 'Unknown';
      const existing = map.get(d) || { date: d, totalClicks: 0, linkClicks: 0 };
      existing.totalClicks += r.totalClicks || 0;
      existing.linkClicks += r.linkClicks || 0;
      map.set(d, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRecords]);

  // Table Sorted Data
  const sortedTableRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const valA = a[sortField] ?? 0;
      const valB = b[sortField] ?? 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'desc' ? valB - valA : valA - valB;
      }
      return sortDir === 'desc'
        ? String(valB).localeCompare(String(valA))
        : String(valA).localeCompare(String(valB));
    });
  }, [filteredRecords, sortField, sortDir]);

  // Widget Toggles
  const handleTogglePin = (widgetId: string) => {
    const updated = widgets.map((w) =>
      w.id === widgetId ? { ...w, isPinned: !w.isPinned } : w
    );
    onSaveWidgets(updated);
  };

  const handleToggleHide = (widgetId: string) => {
    const updated = widgets.map((w) =>
      w.id === widgetId ? { ...w, isHidden: !w.isHidden } : w
    );
    onSaveWidgets(updated);
  };

  const handleResetWidgets = () => {
    const reset = widgets.map((w) => ({ ...w, isHidden: false, isPinned: w.id === 'w_kpi_overview' || w.id === 'w_reach_views_trend' || w.id === 'w_top_posts' }));
    onSaveWidgets(reset);
  };

  const getWidget = (id: string) => widgets.find((w) => w.id === id) || { id, title: '', isPinned: false, isHidden: false, order: 99 };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="card-tier-1 p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#15192B]">
            <SlidersHorizontal className="w-4 h-4 text-[#172DC3]" />
            <span>Filters:</span>
          </div>

          {/* Format Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setSelectedFormat('All')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                selectedFormat === 'All'
                  ? 'bg-white text-[#172DC3] shadow-xs'
                  : 'text-slate-600 hover:text-[#15192B]'
              }`}
            >
              All Formats
            </button>
            <button
              onClick={() => setSelectedFormat('Vidéos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                selectedFormat === 'Vidéos'
                  ? 'bg-white text-[#172DC3] shadow-xs'
                  : 'text-slate-600 hover:text-[#15192B]'
              }`}
            >
              <PlaySquare className="w-3.5 h-3.5 text-[#6344BF]" />
              <span>Vidéos / Reels</span>
            </button>
            <button
              onClick={() => setSelectedFormat('Photos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                selectedFormat === 'Photos'
                  ? 'bg-white text-[#172DC3] shadow-xs'
                  : 'text-slate-600 hover:text-[#15192B]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-[#A90CBF]" />
              <span>Photos</span>
            </button>
          </div>

          {/* Dynamic Date Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
            {availableDateOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setSelectedDateOption(opt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedDateOption === opt
                    ? 'bg-white text-[#172DC3] shadow-xs'
                    : 'text-slate-600 hover:text-[#15192B]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Layout controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetWidgets}
            className="btn-secondary text-xs px-3 py-1.5 font-bold flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Layout</span>
          </button>
        </div>
      </div>

      {/* WIDGET 1: KPI Overview Cards */}
      {!getWidget('w_kpi_overview').isHidden && (
        <div className="relative group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Performance Overview
              </span>
              {getWidget('w_kpi_overview').isPinned && (
                <span className="bg-indigo-50 border border-indigo-100 text-[#172DC3] text-[10px] px-2 py-0.5 rounded-md font-bold">
                  Pinned
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
              <button
                onClick={() => handleTogglePin('w_kpi_overview')}
                title="Pin widget"
                className="p-1 text-slate-400 hover:text-[#172DC3]"
              >
                <Pin className={`w-3.5 h-3.5 ${getWidget('w_kpi_overview').isPinned ? 'fill-[#172DC3] text-[#172DC3]' : ''}`} />
              </button>
              <button
                onClick={() => handleToggleHide('w_kpi_overview')}
                title="Hide widget"
                className="p-1 text-slate-400 hover:text-rose-600"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="card-tier-1 p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Total Reach</span>
                <Users className="w-4 h-4 text-[#172DC3]" />
              </div>
              <div className="text-xl font-black text-[#15192B] tracking-tight">
                {kpis.totalReach.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Couverture unique</div>
            </div>

            <div className="card-tier-1 p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Total Views</span>
                <Eye className="w-4 h-4 text-[#6344BF]" />
              </div>
              <div className="text-xl font-black text-[#15192B] tracking-tight">
                {kpis.totalViews.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Total impres. & views</div>
            </div>

            <div className="card-tier-1 p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Total Engagement</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-[#15192B] tracking-tight">
                {kpis.totalEngagement.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Reactions + Comments + Shares</div>
            </div>

            <div className="card-tier-1 p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Clicks / Link Clicks</span>
                <MousePointerClick className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-[#15192B] tracking-tight">
                {kpis.totalClicks.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">
                {kpis.linkClicks} website link clicks
              </div>
            </div>

            <div className="card-tier-1 p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Organic Reach</span>
                <Layers className="w-4 h-4 text-[#201B9F]" />
              </div>
              <div className="text-xl font-black text-[#15192B] tracking-tight">
                {kpis.organicReach.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">
                Boosted: {kpis.boostedReach.toLocaleString()}
              </div>
            </div>

            <div className="card-tier-1 p-4">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Avg Video Watch Time</span>
                <PlaySquare className="w-4 h-4 text-[#A90CBF]" />
              </div>
              <div className="text-xl font-black text-[#15192B] tracking-tight">
                {kpis.avgWatchTime}s
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Per video view</div>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Main Analytics Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WIDGET 2: Reach & Views Over Time */}
        {!getWidget('w_reach_views_trend').isHidden && (
          <div className="card-tier-1 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#15192B] flex items-center gap-2">
                  <span>Reach & Views Timeline</span>
                  {getWidget('w_reach_views_trend').isPinned && (
                    <span className="bg-indigo-50 border border-indigo-100 text-[#172DC3] text-[10px] px-1.5 py-0.2 rounded-md font-bold">
                      Pinned
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Historical performance by publication date</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTogglePin('w_reach_views_trend')}
                  className="p-1 text-slate-400 hover:text-[#172DC3]"
                >
                  <Pin className={`w-3.5 h-3.5 ${getWidget('w_reach_views_trend').isPinned ? 'fill-[#172DC3] text-[#172DC3]' : ''}`} />
                </button>
                <button
                  onClick={() => handleToggleHide('w_reach_views_trend')}
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#160857', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="views" name="Views (Vues)" stroke="#172DC3" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="reach" name="Reach (Couverture)" stroke="#A90CBF" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* WIDGET 3: Reported Organic & Boosted Performance */}
        {!getWidget('w_organic_vs_boosted').isHidden && (
          <div className="card-tier-1 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#15192B] flex items-center gap-2">
                  <span>Reported Organic & Boosted Performance</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">Comparing organic growth against boosted ad campaigns</p>
                <p className="text-[11px] text-slate-500 italic mt-1 font-medium">
                  Organic and boosted metrics are displayed as reported by Meta and should not be assumed to be mutually exclusive.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTogglePin('w_organic_vs_boosted')}
                  className="p-1 text-slate-400 hover:text-[#172DC3]"
                >
                  <Pin className={`w-3.5 h-3.5 ${getWidget('w_organic_vs_boosted').isPinned ? 'fill-[#172DC3] text-[#172DC3]' : ''}`} />
                </button>
                <button
                  onClick={() => handleToggleHide('w_organic_vs_boosted')}
                  className="p-1 text-slate-400 hover:text-rose-600"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={organicVsBoostedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="category" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#160857', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Organic" name="Reported Organic" fill="#172DC3" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Boosted" name="Reported Boosted" fill="#6344BF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* WIDGET 4: Clicks & Link Clicks Timeline */}
        {!getWidget('w_clicks_trend').isHidden && (
          <div className="card-tier-1 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#15192B]">Clicks & Link Clicks Timeline</h3>
                <p className="text-xs text-slate-500 font-medium">Website link clicks and total publication clicks over time</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleTogglePin('w_clicks_trend')} className="p-1 text-slate-400 hover:text-[#172DC3]">
                  <Pin className={`w-3.5 h-3.5 ${getWidget('w_clicks_trend').isPinned ? 'fill-[#172DC3] text-[#172DC3]' : ''}`} />
                </button>
                <button onClick={() => handleToggleHide('w_clicks_trend')} className="p-1 text-slate-400 hover:text-rose-600">
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clicksTrendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#160857', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="linkClicks" name="Link Clicks" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="totalClicks" name="Total Clicks" fill="#172DC3" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* WIDGET 6: Clicks & Engagement Ratio */}
        {!getWidget('w_engagement_clicks').isHidden && (
          <div className="card-tier-1 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#15192B]">Engagement & Clicks Breakdown</h3>
                <p className="text-xs text-slate-500 font-medium">Total reactions, comments, shares and link clicks</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleTogglePin('w_engagement_clicks')} className="p-1 text-slate-400 hover:text-[#172DC3]">
                  <Pin className={`w-3.5 h-3.5 ${getWidget('w_engagement_clicks').isPinned ? 'fill-[#172DC3] text-[#172DC3]' : ''}`} />
                </button>
                <button onClick={() => handleToggleHide('w_engagement_clicks')} className="p-1 text-slate-400 hover:text-rose-600">
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-200/80">
                <div className="text-xs text-slate-500 font-semibold">Reactions</div>
                <div className="text-2xl font-black text-[#15192B]">
                  {filteredRecords.reduce((acc, r) => acc + r.reactions, 0)}
                </div>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-200/80">
                <div className="text-xs text-slate-500 font-semibold">Comments</div>
                <div className="text-2xl font-black text-[#15192B]">
                  {filteredRecords.reduce((acc, r) => acc + r.comments, 0)}
                </div>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-200/80">
                <div className="text-xs text-slate-500 font-semibold">Shares</div>
                <div className="text-2xl font-black text-[#15192B]">
                  {filteredRecords.reduce((acc, r) => acc + r.shares, 0)}
                </div>
              </div>
              <div className="p-4 bg-[#F8FAFC] rounded-xl border border-slate-200/80">
                <div className="text-xs text-slate-500 font-semibold">Link Clicks</div>
                <div className="text-2xl font-black text-[#172DC3]">
                  {filteredRecords.reduce((acc, r) => acc + r.linkClicks, 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WIDGET 5: Top Performing Publications Table */}
      {!getWidget('w_top_posts').isHidden && (
        <div className="card-tier-1 overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#15192B] flex items-center gap-2">
                <span>Top Publications Table</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                  {sortedTableRecords.length} Posts
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Exact performance metrics from Meta dataset export. Sort columns to analyze top performers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => handleTogglePin('w_top_posts')} className="p-1.5 text-slate-400 hover:text-[#172DC3]">
                <Pin className={`w-4 h-4 ${getWidget('w_top_posts').isPinned ? 'fill-[#172DC3] text-[#172DC3]' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Publication Title / Copy</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-right"
                    onClick={() => {
                      setSortField('reach');
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Reach</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-right"
                    onClick={() => {
                      setSortField('views');
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Views</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-right"
                    onClick={() => {
                      setSortField('totalEngagement');
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Engagement</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-right"
                    onClick={() => {
                      setSortField('totalClicks');
                      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                    }}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Clicks</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {sortedTableRecords.slice(0, 15).map((rec) => (
                  <tr key={rec.id} className="hover:bg-indigo-50/40 transition">
                    <td className="py-3 px-4 max-w-xs font-semibold">
                      <div className="line-clamp-2 text-[#15192B]" title={rec.description}>
                        {rec.title || rec.description.slice(0, 60)}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {rec.publishTime.slice(0, 10)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          rec.publicationType === 'Vidéos'
                            ? 'bg-violet-50 text-[#6344BF] border border-violet-100'
                            : 'bg-indigo-50 text-[#172DC3] border border-indigo-100'
                        }`}
                      >
                        {rec.publicationType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold font-mono text-[#15192B]">
                      {rec.reach.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {rec.views.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                      {rec.totalEngagement.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700 font-medium">
                      {rec.totalClicks} ({rec.linkClicks} link)
                    </td>
                    <td className="py-3 px-4 text-center">
                      {rec.permalink && (
                        <a
                          href={rec.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#172DC3] hover:text-[#201B9F] inline-flex items-center gap-1 font-bold text-[11px]"
                        >
                          <span>Meta</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
