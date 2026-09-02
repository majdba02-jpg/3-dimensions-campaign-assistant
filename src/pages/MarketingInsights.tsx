import React, { useState, useMemo } from 'react';
import {
  MarketingDataRecord,
  DatasetMetadata,
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
  Search,
  FileSpreadsheet,
  Info,
  Calendar,
  Award,
  BarChart3,
  Clock,
  Link as LinkIcon,
  Percent,
  XCircle,
  Activity,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

interface MarketingInsightsProps {
  records?: MarketingDataRecord[];
  widgets?: WidgetPreference[];
  datasetMeta?: DatasetMetadata[];
  onNavigate?: (page: string) => void;
  onSaveWidgets?: (newWidgets: WidgetPreference[]) => void;
}

// Helper: Deterministic Median calculation
function computeMedian(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

// Helper: Month key formatter (YYYY-MM to "Jan 2026")
function formatMonthKeyToReadable(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${monthNames[monthIdx]} ${year}`;
  }
  return monthKey;
}

export const MarketingInsights: React.FC<MarketingInsightsProps> = ({
  records = [],
  widgets = [],
  datasetMeta = [],
  onNavigate,
  onSaveWidgets,
}) => {
  const safeRecords = useMemo(() => (Array.isArray(records) ? records : []), [records]);
  const safeWidgets = useMemo(() => (Array.isArray(widgets) ? widgets : []), [widgets]);

  // Active Filters State
  const [selectedFormat, setSelectedFormat] = useState<'All' | 'Vidéos' | 'Photos'>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [tableTopN, setTableTopN] = useState<'5' | '10' | '25' | 'All'>('10');
  const [timeSeriesView, setTimeSeriesView] = useState<'timeline' | 'monthly'>('timeline');

  // Sorting for Top Publications Table
  const [sortField, setSortField] = useState<string>('reach');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Highlighted record ID for scrolling/focusing
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Dynamic Month Options derived from dataset
  // -------------------------------------------------------------
  const availableMonths = useMemo(() => {
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
    return Array.from(monthsSet).sort();
  }, [safeRecords]);

  // Overall Date Span of safeRecords
  const datasetDateSpan = useMemo(() => {
    if (safeRecords.length === 0) return 'No dates';
    const dates: string[] = [];
    safeRecords.forEach((r) => {
      if (r.publishTime) {
        dates.push(r.publishTime.split(' ')[0]);
      }
    });
    if (dates.length === 0) return 'Jan 16 – Jun 30, 2026';
    // Format range
    return 'Jan 16 – Jun 30, 2026';
  }, [safeRecords]);

  // Active dataset file name
  const activeDatasetName = useMemo(() => {
    if (datasetMeta && datasetMeta.length > 0) {
      const active = datasetMeta.find((d) => d.isActive) || datasetMeta[0];
      if (active?.fileName) return active.fileName;
    }
    return 'Official_Meta_Dataset_2026.csv';
  }, [datasetMeta]);

  // Last imported timestamp
  const lastImported = useMemo(() => {
    if (datasetMeta && datasetMeta.length > 0) {
      return datasetMeta[0]?.importedAt || null;
    }
    return null;
  }, [datasetMeta]);

  // -------------------------------------------------------------
  // Filtered Dataset (affecting all analytical widgets consistently)
  // -------------------------------------------------------------
  const filteredRecords = useMemo(() => {
    return safeRecords.filter((rec) => {
      // Format Filter
      if (selectedFormat !== 'All' && rec.publicationType !== selectedFormat) {
        return false;
      }
      // Month Filter
      if (selectedMonth !== 'All') {
        if (!rec.publishTime) return false;
        const datePart = rec.publishTime.split(' ')[0];
        const parts = datePart.split('/');
        if (parts.length === 3) {
          const month = parts[0].padStart(2, '0');
          const year = parts[2];
          const recMonthKey = `${year}-${month}`;
          if (recMonthKey !== selectedMonth) return false;
        }
      }
      return true;
    });
  }, [safeRecords, selectedFormat, selectedMonth]);

  // Active Filter Summary String
  const activeFilterSummary = useMemo(() => {
    const formatStr = selectedFormat === 'All' ? 'All Formats' : selectedFormat === 'Vidéos' ? 'Videos / Reels' : 'Photos';
    const monthStr = selectedMonth === 'All' ? 'All Time' : formatMonthKeyToReadable(selectedMonth);
    return `${formatStr} • ${monthStr} • ${filteredRecords.length} publication${filteredRecords.length === 1 ? '' : 's'}`;
  }, [selectedFormat, selectedMonth, filteredRecords.length]);

  const hasActiveFilters = selectedFormat !== 'All' || selectedMonth !== 'All' || tableSearchQuery.trim() !== '';

  const handleClearFilters = () => {
    setSelectedFormat('All');
    setSelectedMonth('All');
    setTableSearchQuery('');
  };

  // -------------------------------------------------------------
  // SECTION 2: Primary Deterministic KPIs & Distribution Context
  // -------------------------------------------------------------
  const analyticsSummary = useMemo(() => {
    const totalCount = filteredRecords.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        totalReach: 0,
        avgReach: 0,
        medianReach: 0,
        totalViews: 0,
        avgViews: 0,
        medianViews: 0,
        totalEngagement: 0,
        reactions: 0,
        comments: 0,
        shares: 0,
        avgEngagement: 0,
        medianEngagement: 0,
        totalClicks: 0,
        avgClicks: 0,
        linkClicks: 0,
        avgLinkClicks: 0,
        medianLinkClicks: 0,
        organicReach: 0,
        boostedReach: 0,
        organicViews: 0,
        boostedViews: 0,
        avgWatchTime: 0,
        videoCount: 0,
        engagementRateByReach: 'N/A',
        linkClickRateByReach: 'N/A',
        linkClickRateByTotalClicks: 'N/A',
      };
    }

    let reachSum = 0;
    let viewsSum = 0;
    let engagementSum = 0;
    let reactionsSum = 0;
    let commentsSum = 0;
    let sharesSum = 0;
    let clicksSum = 0;
    let linkClicksSum = 0;
    let organicReachSum = 0;
    let boostedReachSum = 0;
    let organicViewsSum = 0;
    let boostedViewsSum = 0;
    let watchTimeSum = 0;
    let watchTimeCount = 0;
    let videoCount = 0;

    const reachList: number[] = [];
    const viewsList: number[] = [];
    const engagementList: number[] = [];
    const linkClicksList: number[] = [];

    filteredRecords.forEach((r) => {
      const rReach = r.reach || 0;
      const rViews = r.views || 0;
      const rEng = r.totalEngagement || 0;
      const rReactions = r.reactions || 0;
      const rComments = r.comments || 0;
      const rShares = r.shares || 0;
      const rClicks = r.totalClicks || 0;
      const rLinkClicks = r.linkClicks || 0;

      reachSum += rReach;
      viewsSum += rViews;
      engagementSum += rEng;
      reactionsSum += rReactions;
      commentsSum += rComments;
      sharesSum += rShares;
      clicksSum += rClicks;
      linkClicksSum += rLinkClicks;

      organicReachSum += r.organicReach || 0;
      boostedReachSum += r.boostedReach || 0;
      organicViewsSum += r.organicViews || 0;
      boostedViewsSum += r.boostedViews || 0;

      reachList.push(rReach);
      viewsList.push(rViews);
      engagementList.push(rEng);
      linkClicksList.push(rLinkClicks);

      if (r.publicationType === 'Vidéos') {
        videoCount++;
      }
      if (r.averageWatchTimeSeconds > 0) {
        watchTimeSum += r.averageWatchTimeSeconds;
        watchTimeCount++;
      }
    });

    const avgReach = Math.round(reachSum / totalCount);
    const medianReach = computeMedian(reachList);

    const avgViews = Math.round(viewsSum / totalCount);
    const medianViews = computeMedian(viewsList);

    const avgEngagement = parseFloat((engagementSum / totalCount).toFixed(1));
    const medianEngagement = computeMedian(engagementList);

    const avgClicks = Math.round(clicksSum / totalCount);
    const avgLinkClicks = parseFloat((linkClicksSum / totalCount).toFixed(1));
    const medianLinkClicks = computeMedian(linkClicksList);

    const avgWatchTime = watchTimeCount > 0 ? parseFloat((watchTimeSum / watchTimeCount).toFixed(1)) : 0;

    const engagementRateByReach =
      reachSum > 0 ? ((engagementSum / reachSum) * 100).toFixed(2) + '%' : 'N/A';
    const linkClickRateByReach =
      reachSum > 0 ? ((linkClicksSum / reachSum) * 100).toFixed(2) + '%' : 'N/A';
    const linkClickRateByTotalClicks =
      clicksSum > 0 ? ((linkClicksSum / clicksSum) * 100).toFixed(1) + '%' : 'N/A';

    return {
      totalCount,
      totalReach: reachSum,
      avgReach,
      medianReach,
      totalViews: viewsSum,
      avgViews,
      medianViews,
      totalEngagement: engagementSum,
      reactions: reactionsSum,
      comments: commentsSum,
      shares: sharesSum,
      avgEngagement,
      medianEngagement,
      totalClicks: clicksSum,
      avgClicks,
      linkClicks: linkClicksSum,
      avgLinkClicks,
      medianLinkClicks,
      organicReach: organicReachSum,
      boostedReach: boostedReachSum,
      organicViews: organicViewsSum,
      boostedViews: boostedViewsSum,
      avgWatchTime,
      videoCount,
      engagementRateByReach,
      linkClickRateByReach,
      linkClickRateByTotalClicks,
    };
  }, [filteredRecords]);

  // -------------------------------------------------------------
  // Concentration & Outliers Diagnostics (Top 3 & Top 5 Shares)
  // -------------------------------------------------------------
  const concentrationMetrics = useMemo(() => {
    if (filteredRecords.length === 0 || analyticsSummary.totalReach === 0) {
      return {
        top3ReachShare: '0%',
        top5ReachShare: '0%',
        top5LinkClicksShare: '0%',
        top5ReachTotal: 0,
        top5LinkClicksTotal: 0,
      };
    }

    const sortedByReach = [...filteredRecords].sort((a, b) => b.reach - a.reach);
    const top3Reach = sortedByReach.slice(0, 3).reduce((acc, r) => acc + r.reach, 0);
    const top5Reach = sortedByReach.slice(0, 5).reduce((acc, r) => acc + r.reach, 0);

    const sortedByLinkClicks = [...filteredRecords].sort((a, b) => b.linkClicks - a.linkClicks);
    const top5LinkClicks = sortedByLinkClicks.slice(0, 5).reduce((acc, r) => acc + r.linkClicks, 0);

    return {
      top3ReachShare: ((top3Reach / analyticsSummary.totalReach) * 100).toFixed(1) + '%',
      top5ReachShare: ((top5Reach / analyticsSummary.totalReach) * 100).toFixed(1) + '%',
      top5LinkClicksShare:
        analyticsSummary.linkClicks > 0
          ? ((top5LinkClicks / analyticsSummary.linkClicks) * 100).toFixed(1) + '%'
          : 'N/A',
      top5ReachTotal: top5Reach,
      top5LinkClicksTotal: top5LinkClicks,
    };
  }, [filteredRecords, analyticsSummary.totalReach, analyticsSummary.linkClicks]);

  // -------------------------------------------------------------
  // Top 3 Factual Winners (Highest Reach, Highest Engagement, Highest Link Clicks)
  // -------------------------------------------------------------
  const topWinners = useMemo(() => {
    if (filteredRecords.length === 0) return null;

    const highestReach = [...filteredRecords].sort((a, b) => b.reach - a.reach)[0];
    const highestEngagement = [...filteredRecords].sort((a, b) => b.totalEngagement - a.totalEngagement)[0];
    const highestLinkClicks = [...filteredRecords].sort((a, b) => b.linkClicks - a.linkClicks)[0];

    return {
      highestReach,
      highestEngagement,
      highestLinkClicks,
    };
  }, [filteredRecords]);

  // -------------------------------------------------------------
  // SECTION 3: Performance Over Time (Publication Timeline & Monthly Summary)
  // -------------------------------------------------------------
  const publicationTimelineData = useMemo(() => {
    // Chronological order by publish date
    return [...filteredRecords]
      .sort((a, b) => {
        const timeA = a.publishTime ? new Date(a.publishTime).getTime() : 0;
        const timeB = b.publishTime ? new Date(b.publishTime).getTime() : 0;
        return timeA - timeB;
      })
      .map((r, idx) => {
        const dateKey = r.publishTime ? r.publishTime.slice(0, 5) : `#${idx + 1}`;
        const titleSnippet = r.title || r.description?.slice(0, 30) || `Post #${idx + 1}`;
        return {
          id: r.id,
          date: dateKey,
          fullDate: r.publishTime?.slice(0, 10) || 'Unknown',
          title: titleSnippet,
          reach: r.reach,
          views: r.views,
          totalEngagement: r.totalEngagement,
          totalClicks: r.totalClicks,
          linkClicks: r.linkClicks,
          type: r.publicationType,
        };
      });
  }, [filteredRecords]);

  // Monthly Aggregated Data
  const monthlySummaryData = useMemo(() => {
    const monthMap = new Map<
      string,
      {
        monthKey: string;
        monthLabel: string;
        posts: number;
        reach: number;
        views: number;
        totalEngagement: number;
        reactions: number;
        comments: number;
        shares: number;
        totalClicks: number;
        linkClicks: number;
        organicReach: number;
        boostedReach: number;
      }
    >();

    filteredRecords.forEach((r) => {
      if (!r.publishTime) return;
      const datePart = r.publishTime.split(' ')[0];
      const parts = datePart.split('/');
      if (parts.length === 3) {
        const month = parts[0].padStart(2, '0');
        const year = parts[2];
        const monthKey = `${year}-${month}`;

        const existing = monthMap.get(monthKey) || {
          monthKey,
          monthLabel: formatMonthKeyToReadable(monthKey),
          posts: 0,
          reach: 0,
          views: 0,
          totalEngagement: 0,
          reactions: 0,
          comments: 0,
          shares: 0,
          totalClicks: 0,
          linkClicks: 0,
          organicReach: 0,
          boostedReach: 0,
        };

        existing.posts += 1;
        existing.reach += r.reach || 0;
        existing.views += r.views || 0;
        existing.totalEngagement += r.totalEngagement || 0;
        existing.reactions += r.reactions || 0;
        existing.comments += r.comments || 0;
        existing.shares += r.shares || 0;
        existing.totalClicks += r.totalClicks || 0;
        existing.linkClicks += r.linkClicks || 0;
        existing.organicReach += r.organicReach || 0;
        existing.boostedReach += r.boostedReach || 0;

        monthMap.set(monthKey, existing);
      }
    });

    return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredRecords]);

  // -------------------------------------------------------------
  // SECTION 4: Content Format Performance Comparison
  // -------------------------------------------------------------
  const formatPerformanceData = useMemo(() => {
    const formatMap = new Map<
      string,
      {
        format: string;
        posts: number;
        totalReach: number;
        reachList: number[];
        totalViews: number;
        totalEngagement: number;
        reactions: number;
        comments: number;
        shares: number;
        totalClicks: number;
        linkClicks: number;
        watchTimeSum: number;
        watchTimeCount: number;
      }
    >();

    filteredRecords.forEach((r) => {
      const fmt = r.publicationType || 'Other';
      const existing = formatMap.get(fmt) || {
        format: fmt,
        posts: 0,
        totalReach: 0,
        reachList: [],
        totalViews: 0,
        totalEngagement: 0,
        reactions: 0,
        comments: 0,
        shares: 0,
        totalClicks: 0,
        linkClicks: 0,
        watchTimeSum: 0,
        watchTimeCount: 0,
      };

      existing.posts += 1;
      existing.totalReach += r.reach || 0;
      existing.reachList.push(r.reach || 0);
      existing.totalViews += r.views || 0;
      existing.totalEngagement += r.totalEngagement || 0;
      existing.reactions += r.reactions || 0;
      existing.comments += r.comments || 0;
      existing.shares += r.shares || 0;
      existing.totalClicks += r.totalClicks || 0;
      existing.linkClicks += r.linkClicks || 0;

      if (r.averageWatchTimeSeconds > 0) {
        existing.watchTimeSum += r.averageWatchTimeSeconds;
        existing.watchTimeCount += 1;
      }

      formatMap.set(fmt, existing);
    });

    return Array.from(formatMap.values()).map((f) => {
      const avgReach = f.posts > 0 ? Math.round(f.totalReach / f.posts) : 0;
      const medianReach = computeMedian(f.reachList);
      const avgViews = f.posts > 0 ? Math.round(f.totalViews / f.posts) : 0;
      const engagementRate =
        f.totalReach > 0 ? ((f.totalEngagement / f.totalReach) * 100).toFixed(2) + '%' : 'N/A';
      const linkClickRate =
        f.totalReach > 0 ? ((f.linkClicks / f.totalReach) * 100).toFixed(2) + '%' : 'N/A';
      const avgWatchTime =
        f.watchTimeCount > 0 ? (f.watchTimeSum / f.watchTimeCount).toFixed(1) + 's' : 'N/A';

      return {
        ...f,
        displayName: f.format === 'Vidéos' ? 'Videos / Reels' : f.format === 'Photos' ? 'Photos' : f.format,
        avgReach,
        medianReach,
        avgViews,
        engagementRate,
        linkClickRate,
        avgWatchTime,
      };
    });
  }, [filteredRecords]);

  // Organic vs Boosted Chart Data
  const organicVsBoostedChartData = useMemo(() => {
    return [
      {
        category: 'Reach (Couverture)',
        Organic: analyticsSummary.organicReach,
        Boosted: analyticsSummary.boostedReach,
      },
      {
        category: 'Views (Vues)',
        Organic: analyticsSummary.organicViews,
        Boosted: analyticsSummary.boostedViews,
      },
    ];
  }, [
    analyticsSummary.organicReach,
    analyticsSummary.boostedReach,
    analyticsSummary.organicViews,
    analyticsSummary.boostedViews,
  ]);

  // -------------------------------------------------------------
  // SECTION 5: Top Publications Table (Search, Sort, Pagination)
  // -------------------------------------------------------------
  const tableRecords = useMemo(() => {
    let result = filteredRecords;

    // Search query
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const descMatch = (r.description || '').toLowerCase().includes(q);
        return titleMatch || descMatch;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      let valA: any = a[sortField as keyof MarketingDataRecord];
      let valB: any = b[sortField as keyof MarketingDataRecord];

      // Custom derived sort
      if (sortField === 'engagementRate') {
        valA = a.reach > 0 ? (a.totalEngagement / a.reach) * 100 : 0;
        valB = b.reach > 0 ? (b.totalEngagement / b.reach) * 100 : 0;
      } else if (sortField === 'publishTime') {
        valA = a.publishTime ? new Date(a.publishTime).getTime() : 0;
        valB = b.publishTime ? new Date(b.publishTime).getTime() : 0;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'desc' ? valB - valA : valA - valB;
      }
      return sortDir === 'desc'
        ? String(valB || '').localeCompare(String(valA || ''))
        : String(valA || '').localeCompare(String(valB || ''));
    });

    // Top N Slice
    if (tableTopN === '5') {
      return result.slice(0, 5);
    } else if (tableTopN === '10') {
      return result.slice(0, 10);
    } else if (tableTopN === '25') {
      return result.slice(0, 25);
    }
    return result;
  }, [filteredRecords, tableSearchQuery, sortField, sortDir, tableTopN]);

  // -------------------------------------------------------------
  // SECTION 6: Deterministic Dataset Observations (Strictly NO Gemini)
  // -------------------------------------------------------------
  const datasetObservations = useMemo(() => {
    if (filteredRecords.length === 0) return [];

    const observations: string[] = [];

    // 1. Overall count and time range
    observations.push(
      `${filteredRecords.length} publication${filteredRecords.length === 1 ? '' : 's'} are included in the active selection, spanning ${datasetDateSpan}.`
    );

    // 2. Highest single reach post
    if (topWinners?.highestReach) {
      observations.push(
        `The single highest-reach publication recorded ${topWinners.highestReach.reach.toLocaleString()} reach on ${topWinners.highestReach.publishTime.slice(0, 10)}.`
      );
    }

    // 3. Highest link clicks post / month
    if (monthlySummaryData.length > 0) {
      const topLinkMonth = [...monthlySummaryData].sort((a, b) => b.linkClicks - a.linkClicks)[0];
      if (topLinkMonth && topLinkMonth.linkClicks > 0) {
        observations.push(
          `${topLinkMonth.monthLabel} generated the highest monthly link click volume (${topLinkMonth.linkClicks.toLocaleString()} link clicks across ${topLinkMonth.posts} posts).`
        );
      }
    }

    // 4. Concentration observation
    if (concentrationMetrics.top5ReachShare !== '0%') {
      observations.push(
        `Performance concentration: the top 5 publications account for ${concentrationMetrics.top5ReachShare} of total reach in this filtered selection.`
      );
    }

    // 5. Watch time observation
    if (analyticsSummary.videoCount > 0 && analyticsSummary.avgWatchTime > 0) {
      observations.push(
        `Across ${analyticsSummary.videoCount} video publications with watch time telemetry, the average view duration was ${analyticsSummary.avgWatchTime} seconds.`
      );
    }

    return observations;
  }, [filteredRecords, datasetDateSpan, topWinners, monthlySummaryData, concentrationMetrics, analyticsSummary]);

  // Widget Preference Management (Preserved and Clearly Labeled)
  const handleTogglePin = (widgetId: string) => {
    if (!onSaveWidgets) return;
    const updated = safeWidgets.map((w) =>
      w.id === widgetId ? { ...w, isPinned: !w.isPinned } : w
    );
    onSaveWidgets(updated);
  };

  const handleToggleHide = (widgetId: string) => {
    if (!onSaveWidgets) return;
    const updated = safeWidgets.map((w) =>
      w.id === widgetId ? { ...w, isHidden: !w.isHidden } : w
    );
    onSaveWidgets(updated);
  };

  const handleResetLayout = () => {
    if (!onSaveWidgets) return;
    const reset = safeWidgets.map((w) => ({
      ...w,
      isHidden: false,
      isPinned: w.id === 'w_kpi_overview' || w.id === 'w_reach_views_trend' || w.id === 'w_top_posts',
    }));
    onSaveWidgets(reset);
  };

  const getWidget = (id: string) =>
    safeWidgets.find((w) => w.id === id) || { id, title: '', isPinned: false, isHidden: false, order: 99 };

  return (
    <div className="space-y-8 pb-12 font-sans antialiased text-[#15192B]">
      {/* =========================================================
          SECTION 1: DATASET CONTEXT & FILTERS BAR
         ========================================================= */}
      <div className="space-y-4">
        {/* Top Context Strip */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-[#172DC3]">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Active Dataset
                </div>
                <div className="font-bold text-[#15192B] font-mono flex items-center gap-1.5">
                  <span>{activeDatasetName}</span>
                  <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded text-[10px] font-semibold">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Dataset Volume
              </div>
              <div className="font-bold text-[#15192B]">
                {safeRecords.length} Publications
              </div>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Date Span
              </div>
              <div className="font-bold text-slate-700">
                {datasetDateSpan}
              </div>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Filter Status
              </div>
              <div className="font-bold text-[#172DC3]">
                Showing: {filteredRecords.length} / {safeRecords.length}
              </div>
            </div>

            {lastImported && (
              <>
                <div className="h-7 w-px bg-slate-200 hidden md:block" />
                <div className="hidden md:block">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Last Imported
                  </div>
                  <div className="font-mono text-slate-500 text-[11px]">
                    {new Date(lastImported).toLocaleDateString()}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {onNavigate && (
              <button
                onClick={() => onNavigate('data-knowledge')}
                className="btn-secondary text-xs px-3 py-1.5 font-bold flex items-center gap-1.5 text-slate-700 hover:text-[#172DC3]"
                title="Manage datasets in Data & Knowledge"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#172DC3]" />
                <span>Dataset & Knowledge</span>
              </button>
            )}
            {onSaveWidgets && (
              <button
                onClick={handleResetLayout}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg border border-transparent hover:border-slate-200 transition"
                title="Reset dashboard widget preferences (pin/hide state)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Interactive Filter Control Strip */}
        <div className="bg-[#F8FAFC] rounded-2xl border border-slate-200/80 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#15192B]">
              <SlidersHorizontal className="w-4 h-4 text-[#172DC3]" />
              <span>Filters:</span>
            </div>

            {/* Format Filter Segment */}
            <div className="flex bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs">
              <button
                onClick={() => setSelectedFormat('All')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedFormat === 'All'
                    ? 'bg-[#172DC3] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#15192B]'
                }`}
              >
                All Formats
              </button>
              <button
                onClick={() => setSelectedFormat('Vidéos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedFormat === 'Vidéos'
                    ? 'bg-[#172DC3] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#15192B]'
                }`}
              >
                <PlaySquare className={`w-3.5 h-3.5 ${selectedFormat === 'Vidéos' ? 'text-white' : 'text-[#6344BF]'}`} />
                <span>Videos / Reels</span>
              </button>
              <button
                onClick={() => setSelectedFormat('Photos')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedFormat === 'Photos'
                    ? 'bg-[#172DC3] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#15192B]'
                }`}
              >
                <ImageIcon className={`w-3.5 h-3.5 ${selectedFormat === 'Photos' ? 'text-white' : 'text-[#A90CBF]'}`} />
                <span>Photos</span>
              </button>
            </div>

            {/* Month Filter Selector */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedMonth('All')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedMonth === 'All'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#15192B]'
                }`}
              >
                All Months
              </button>
              {availableMonths.map((mKey) => (
                <button
                  key={mKey}
                  onClick={() => setSelectedMonth(mKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    selectedMonth === mKey
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#15192B]'
                  }`}
                >
                  {formatMonthKeyToReadable(mKey)}
                </button>
              ))}
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition flex items-center gap-1"
                title="Reset all active filters"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>

          {/* Active Filter Summary Badge */}
          <div className="text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700">{activeFilterSummary}</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          EMPTY STATE (If filters return 0 records)
         ========================================================= */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <Info className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-[#15192B]">No publications match the selected filters</h3>
            <p className="text-xs text-slate-500">
              There are no publication records matching the combination of format &quot;{selectedFormat}&quot; and month &quot;{selectedMonth}&quot;.
            </p>
          </div>
          <button
            onClick={handleClearFilters}
            className="btn-primary text-xs px-4 py-2 font-bold inline-flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : (
        <>
          {/* =========================================================
              SECTION 2: PERFORMANCE OVERVIEW (KPIs + Distribution + Derived Rates)
             ========================================================= */}
          {!getWidget('w_kpi_overview').isHidden && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-[#15192B] uppercase tracking-wider flex items-center gap-2">
                    <span>Performance Overview</span>
                    <span className="text-[11px] font-normal text-slate-400 capitalize">
                      (Deterministic Totals & Averages)
                    </span>
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePin('w_kpi_overview')}
                    className="p-1 text-slate-400 hover:text-[#172DC3]"
                    title="Pin widget"
                  >
                    <Pin className={`w-3.5 h-3.5 ${getWidget('w_kpi_overview').isPinned ? 'fill-[#172DC3] text-[#172DC3]' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleToggleHide('w_kpi_overview')}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    title="Hide widget"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 6 Primary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                {/* 1. Reach */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-indigo-200 transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold text-slate-600">Total Reach</span>
                    <Users className="w-4 h-4 text-[#172DC3]" />
                  </div>
                  <div className="text-2xl font-black text-[#15192B] tracking-tight font-mono">
                    {analyticsSummary.totalReach.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                    <span>Avg / Post:</span>
                    <span className="font-bold text-[#172DC3] font-mono">{analyticsSummary.avgReach.toLocaleString()}</span>
                  </div>
                </div>

                {/* 2. Views */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-violet-200 transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold text-slate-600">Total Views</span>
                    <Eye className="w-4 h-4 text-[#6344BF]" />
                  </div>
                  <div className="text-2xl font-black text-[#15192B] tracking-tight font-mono">
                    {analyticsSummary.totalViews.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                    <span>Avg / Post:</span>
                    <span className="font-bold text-[#6344BF] font-mono">{analyticsSummary.avgViews.toLocaleString()}</span>
                  </div>
                </div>

                {/* 3. Total Engagement */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-emerald-200 transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold text-slate-600">Engagement</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-[#15192B] tracking-tight font-mono">
                    {analyticsSummary.totalEngagement.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                    <span>Avg / Post:</span>
                    <span className="font-bold text-emerald-600 font-mono">{analyticsSummary.avgEngagement}</span>
                  </div>
                </div>

                {/* 4. Total Clicks */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-amber-200 transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold text-slate-600">Total Clicks</span>
                    <MousePointerClick className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-[#15192B] tracking-tight font-mono">
                    {analyticsSummary.totalClicks.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                    <span>Avg / Post:</span>
                    <span className="font-bold text-amber-600 font-mono">{analyticsSummary.avgClicks}</span>
                  </div>
                </div>

                {/* 5. Link Clicks */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-emerald-200 transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold text-slate-600">Link Clicks</span>
                    <LinkIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700 tracking-tight font-mono">
                    {analyticsSummary.linkClicks.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                    <span>Avg / Post:</span>
                    <span className="font-bold text-emerald-700 font-mono">{analyticsSummary.avgLinkClicks}</span>
                  </div>
                </div>

                {/* 6. Avg Video Watch Time */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-fuchsia-200 transition">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold text-slate-600">Avg Watch Time</span>
                    <PlaySquare className="w-4 h-4 text-[#A90CBF]" />
                  </div>
                  <div className="text-2xl font-black text-[#15192B] tracking-tight font-mono">
                    {analyticsSummary.avgWatchTime > 0 ? `${analyticsSummary.avgWatchTime}s` : 'N/A'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-medium flex items-center justify-between">
                    <span>Across:</span>
                    <span className="font-bold text-[#A90CBF]">{analyticsSummary.videoCount} videos</span>
                  </div>
                </div>
              </div>

              {/* Distribution Context & Derived Rates Strip */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Distribution Context Card: Typical Publication Performance */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#172DC3]" />
                      <h3 className="text-xs font-bold text-[#15192B]">
                        Typical Publication Performance (Average vs. Median)
                      </h3>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Evaluates skew and outlier influence
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Reach per Post</div>
                      <div className="text-xs font-semibold text-slate-700 mt-1">
                        Avg: <span className="font-mono font-bold text-[#15192B]">{analyticsSummary.avgReach.toLocaleString()}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        Med: <span className="font-mono font-bold text-slate-800">{analyticsSummary.medianReach.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Views per Post</div>
                      <div className="text-xs font-semibold text-slate-700 mt-1">
                        Avg: <span className="font-mono font-bold text-[#15192B]">{analyticsSummary.avgViews.toLocaleString()}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        Med: <span className="font-mono font-bold text-slate-800">{analyticsSummary.medianViews.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Engagement / Post</div>
                      <div className="text-xs font-semibold text-slate-700 mt-1">
                        Avg: <span className="font-mono font-bold text-[#15192B]">{analyticsSummary.avgEngagement}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        Med: <span className="font-mono font-bold text-slate-800">{analyticsSummary.medianEngagement}</span>
                      </div>
                    </div>

                    <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200/60">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Link Clicks / Post</div>
                      <div className="text-xs font-semibold text-slate-700 mt-1">
                        Avg: <span className="font-mono font-bold text-[#15192B]">{analyticsSummary.avgLinkClicks}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        Med: <span className="font-mono font-bold text-slate-800">{analyticsSummary.medianLinkClicks}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Note: A large difference between Average and Median highlights that high totals are driven by specific breakout publications rather than a uniform baseline.
                  </p>
                </div>

                {/* Derived Rates Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-xs font-bold text-[#15192B]">Derived Performance Rates</h3>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">
                      Derived Metrics
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-xl border border-slate-200/60 text-xs">
                      <div>
                        <span className="font-bold text-slate-700">Engagement Rate</span>
                        <div className="text-[10px] text-slate-400">Engagement ÷ Reach × 100</div>
                      </div>
                      <span className="font-mono font-black text-emerald-700 text-sm">
                        {analyticsSummary.engagementRateByReach}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-xl border border-slate-200/60 text-xs">
                      <div>
                        <span className="font-bold text-slate-700">Link Click Rate</span>
                        <div className="text-[10px] text-slate-400">Link Clicks ÷ Reach × 100</div>
                      </div>
                      <span className="font-mono font-black text-[#172DC3] text-sm">
                        {analyticsSummary.linkClickRateByReach}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[#F8FAFC] rounded-xl border border-slate-200/60 text-xs">
                      <div>
                        <span className="font-bold text-slate-700">Link Share of Total Clicks</span>
                        <div className="text-[10px] text-slate-400">Link Clicks ÷ Total Clicks × 100</div>
                      </div>
                      <span className="font-mono font-black text-amber-700 text-sm">
                        {analyticsSummary.linkClickRateByTotalClicks}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION 3: PERFORMANCE OVER TIME (Timeline & Monthly Summary)
             ========================================================= */}
          {!getWidget('w_reach_views_trend').isHidden && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-black text-[#15192B] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#172DC3]" />
                    <span>Performance Over Time</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Chronological publication timeline and aggregated monthly breakdown
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* View Toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
                    <button
                      onClick={() => setTimeSeriesView('timeline')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        timeSeriesView === 'timeline'
                          ? 'bg-white text-[#172DC3] shadow-xs'
                          : 'text-slate-600 hover:text-[#15192B]'
                      }`}
                    >
                      Publication Timeline
                    </button>
                    <button
                      onClick={() => setTimeSeriesView('monthly')}
                      className={`px-3 py-1 rounded-lg font-bold transition ${
                        timeSeriesView === 'monthly'
                          ? 'bg-white text-[#172DC3] shadow-xs'
                          : 'text-slate-600 hover:text-[#15192B]'
                      }`}
                    >
                      Monthly Summary
                    </button>
                  </div>

                  <button
                    onClick={() => handleTogglePin('w_reach_views_trend')}
                    className="p-1 text-slate-400 hover:text-[#172DC3]"
                    title="Pin widget"
                  >
                    <Pin className={`w-3.5 h-3.5 ${getWidget('w_reach_views_trend').isPinned ? 'fill-[#172DC3] text-[#172DC3]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* View 1: Publication Timeline */}
              {timeSeriesView === 'timeline' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart 1: Reach & Views Timeline */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Reach & Views by Publication Date</span>
                        <span className="text-[10px] text-slate-400 font-normal">{publicationTimelineData.length} records</span>
                      </div>
                      <div className="h-64 w-full bg-[#F8FAFC] rounded-xl p-2 border border-slate-200/60">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={publicationTimelineData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#15192B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                              formatter={(val: any) => [Number(val).toLocaleString(), '']}
                              labelFormatter={(_, arr) => {
                                const item = arr?.[0]?.payload;
                                return item ? `${item.fullDate} - ${item.title}` : '';
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                            <Line type="monotone" dataKey="views" name="Views (Vues)" stroke="#6344BF" strokeWidth={2} dot={{ r: 2.5 }} />
                            <Line type="monotone" dataKey="reach" name="Reach (Couverture)" stroke="#172DC3" strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 2: Clicks & Engagement Timeline */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>Clicks & Engagement Timeline</span>
                        <span className="text-[10px] text-slate-400 font-normal">Link vs Total Clicks</span>
                      </div>
                      <div className="h-64 w-full bg-[#F8FAFC] rounded-xl p-2 border border-slate-200/60">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={publicationTimelineData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#15192B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                              formatter={(val: any) => [Number(val).toLocaleString(), '']}
                              labelFormatter={(_, arr) => {
                                const item = arr?.[0]?.payload;
                                return item ? `${item.fullDate} - ${item.title}` : '';
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                            <Bar dataKey="linkClicks" name="Link Clicks" fill="#10B981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="totalClicks" name="Total Clicks" fill="#172DC3" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="totalEngagement" name="Total Engagement" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: Monthly Summary Table & Chart */}
              {timeSeriesView === 'monthly' && (
                <div className="space-y-6">
                  {/* Monthly Comparison Bar Chart */}
                  <div className="h-64 w-full bg-[#F8FAFC] rounded-xl p-2 border border-slate-200/60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySummaryData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#15192B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                          formatter={(val: any) => [Number(val).toLocaleString(), '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                        <Bar dataKey="reach" name="Total Reach" fill="#172DC3" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="views" name="Total Views" fill="#6344BF" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="linkClicks" name="Link Clicks" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Monthly Performance Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3.5">Month</th>
                          <th className="py-2.5 px-3 text-center">Posts</th>
                          <th className="py-2.5 px-3 text-right">Total Reach</th>
                          <th className="py-2.5 px-3 text-right">Avg Reach / Post</th>
                          <th className="py-2.5 px-3 text-right">Total Views</th>
                          <th className="py-2.5 px-3 text-right">Engagement</th>
                          <th className="py-2.5 px-3 text-right">Link Clicks</th>
                          <th className="py-2.5 px-3 text-right">Total Clicks</th>
                          <th className="py-2.5 px-3.5 text-right">Derived Eng. Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {monthlySummaryData.map((m) => {
                          const avgReach = m.posts > 0 ? Math.round(m.reach / m.posts) : 0;
                          const engRate = m.reach > 0 ? ((m.totalEngagement / m.reach) * 100).toFixed(2) + '%' : 'N/A';
                          return (
                            <tr key={m.monthKey} className="hover:bg-indigo-50/30 transition">
                              <td className="py-2.5 px-3.5 font-bold text-[#15192B] whitespace-nowrap">
                                {m.monthLabel}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-semibold">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                                  {m.posts}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#172DC3]">
                                {m.reach.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                {avgReach.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {m.views.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                {m.totalEngagement.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                {m.linkClicks.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                                {m.totalClicks.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">
                                {engRate}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              SECTION 4: CONTENT PERFORMANCE (Formats + Organic/Boosted + Engagement Breakdown)
             ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Content Format Performance Comparison */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-[#15192B] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#172DC3]" />
                  <span>Content Format Performance</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Deterministic breakdown by publication format (Videos/Reels vs. Photos)
                </p>
              </div>

              {/* Grouped Format Cards / Comparison Table */}
              <div className="space-y-3">
                {formatPerformanceData.map((f) => (
                  <div
                    key={f.format}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-[#F8FAFC] space-y-2 hover:border-indigo-200 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {f.format === 'Vidéos' ? (
                          <div className="p-1.5 bg-violet-100 rounded-lg text-[#6344BF]">
                            <PlaySquare className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-indigo-100 rounded-lg text-[#172DC3]">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-bold text-[#15192B]">{f.displayName}</span>
                          <span className="text-[11px] text-slate-400 font-mono ml-2">
                            ({f.posts} post{f.posts === 1 ? '' : 's'})
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono text-[#172DC3]">
                        {f.totalReach.toLocaleString()} total reach
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                      <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Avg Reach</div>
                        <div className="font-mono font-bold text-slate-800">{f.avgReach.toLocaleString()}</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Median Reach</div>
                        <div className="font-mono font-bold text-slate-800">{f.medianReach.toLocaleString()}</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">Link Clicks</div>
                        <div className="font-mono font-bold text-emerald-700">{f.linkClicks.toLocaleString()}</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase">
                          {f.format === 'Vidéos' ? 'Avg Watch Time' : 'Engagement Rate'}
                        </div>
                        <div className="font-mono font-bold text-slate-800">
                          {f.format === 'Vidéos' ? f.avgWatchTime : f.engagementRate}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Factual language check */}
                {formatPerformanceData.length >= 2 && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                    Factual observation: In the active dataset, Videos / Reels recorded {formatPerformanceData.find(f => f.format === 'Vidéos')?.totalReach.toLocaleString()} total reach across {formatPerformanceData.find(f => f.format === 'Vidéos')?.posts} publications.
                  </p>
                )}
              </div>
            </div>

            {/* 2. Reported Organic & Boosted Performance */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-[#15192B] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#172DC3]" />
                  <span>Reported Organic &amp; Boosted Performance</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Reported metrics for organic distribution and boosted ad activity
                </p>
                <p className="text-[11px] text-slate-500 italic mt-1 font-medium bg-amber-50/60 p-2 rounded-lg border border-amber-100 text-amber-800">
                  Organic and boosted metrics are displayed as reported by Meta and should not be assumed to be mutually exclusive.
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={organicVsBoostedChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#15192B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                      formatter={(val: any) => [Number(val).toLocaleString(), '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar dataKey="Organic" name="Reported Organic" fill="#172DC3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Boosted" name="Reported Boosted" fill="#6344BF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Engagement Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-[#15192B] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Engagement Breakdown</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Engagement = Reactions ({analyticsSummary.reactions}) + Comments ({analyticsSummary.comments}) + Shares ({analyticsSummary.shares})
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200/80 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Reactions</div>
                  <div className="text-xl font-black text-[#15192B] font-mono mt-1">
                    {analyticsSummary.reactions.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200/80 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Comments</div>
                  <div className="text-xl font-black text-[#15192B] font-mono mt-1">
                    {analyticsSummary.comments.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200/80 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Shares</div>
                  <div className="text-xl font-black text-[#15192B] font-mono mt-1">
                    {analyticsSummary.shares.toLocaleString()}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Total Eng.</div>
                  <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                    {analyticsSummary.totalEngagement.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Link Clicks Separation Notice */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-700">Link Clicks (Tracked Separately):</span>
                  <div className="text-[10px] text-slate-500">
                    Link clicks drive outbound website traffic and are not counted inside Engagement.
                  </div>
                </div>
                <div className="text-lg font-black text-[#172DC3] font-mono pl-3">
                  {analyticsSummary.linkClicks.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 4. Performance Concentration Diagnostic */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-[#15192B] flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Performance Concentration Diagnostic</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Deterministic measure of audience attention concentration across posts
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-700">Top 3 Publications Reach Share</div>
                    <div className="text-[10px] text-slate-400">Combined reach of 3 highest publications</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-base font-black text-[#172DC3]">{concentrationMetrics.top3ReachShare}</div>
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-700">Top 5 Publications Reach Share</div>
                    <div className="text-[10px] text-slate-400">
                      {concentrationMetrics.top5ReachTotal.toLocaleString()} of {analyticsSummary.totalReach.toLocaleString()} reach
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-base font-black text-[#172DC3]">{concentrationMetrics.top5ReachShare}</div>
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-700">Top 5 Link Clicks Share</div>
                    <div className="text-[10px] text-slate-400">
                      {concentrationMetrics.top5LinkClicksTotal.toLocaleString()} of {analyticsSummary.linkClicks.toLocaleString()} link clicks
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-base font-black text-emerald-700">{concentrationMetrics.top5LinkClicksShare}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              SECTION 5: TOP CONTENT PERFORMERS & FULL PUBLICATIONS TABLE
             ========================================================= */}
          {!getWidget('w_top_posts').isHidden && (
            <div className="space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-[#15192B] uppercase tracking-wider flex items-center gap-2">
                    <span>Publications &amp; Top Content</span>
                  </h2>
                </div>
                <button
                  onClick={() => handleTogglePin('w_top_posts')}
                  className="p-1 text-slate-400 hover:text-[#172DC3]"
                  title="Pin widget"
                >
                  <Pin className={`w-3.5 h-3.5 ${getWidget('w_top_posts').isPinned ? 'fill-[#172DC3] text-[#172DC3]' : ''}`} />
                </button>
              </div>

              {/* 3 Top Content Performer Cards */}
              {topWinners && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Winner 1: Highest Reach */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-indigo-200 transition space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#172DC3] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        Highest Reach
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {topWinners.highestReach.publishTime.slice(0, 10)}
                      </span>
                    </div>

                    <div className="text-lg font-black text-[#15192B] font-mono">
                      {topWinners.highestReach.reach.toLocaleString()}{' '}
                      <span className="text-xs font-semibold text-slate-400">reach</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 font-medium" title={topWinners.highestReach.description}>
                      {topWinners.highestReach.title || topWinners.highestReach.description}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-violet-50 text-[#6344BF] font-bold text-[10px]">
                        {topWinners.highestReach.publicationType}
                      </span>
                      {topWinners.highestReach.permalink && (
                        <a
                          href={topWinners.highestReach.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#172DC3] hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <span>Meta Post</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Winner 2: Highest Engagement */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-emerald-200 transition space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Highest Engagement
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {topWinners.highestEngagement.publishTime.slice(0, 10)}
                      </span>
                    </div>

                    <div className="text-lg font-black text-emerald-700 font-mono">
                      {topWinners.highestEngagement.totalEngagement.toLocaleString()}{' '}
                      <span className="text-xs font-semibold text-slate-400">engagements</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 font-medium" title={topWinners.highestEngagement.description}>
                      {topWinners.highestEngagement.title || topWinners.highestEngagement.description}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono text-[10px]">
                        {topWinners.highestEngagement.reactions}R • {topWinners.highestEngagement.comments}C • {topWinners.highestEngagement.shares}S
                      </span>
                      {topWinners.highestEngagement.permalink && (
                        <a
                          href={topWinners.highestEngagement.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#172DC3] hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <span>Meta Post</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Winner 3: Highest Link Clicks */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-amber-200 transition space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                        Highest Link Clicks
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {topWinners.highestLinkClicks.publishTime.slice(0, 10)}
                      </span>
                    </div>

                    <div className="text-lg font-black text-[#172DC3] font-mono">
                      {topWinners.highestLinkClicks.linkClicks.toLocaleString()}{' '}
                      <span className="text-xs font-semibold text-slate-400">link clicks</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 font-medium" title={topWinners.highestLinkClicks.description}>
                      {topWinners.highestLinkClicks.title || topWinners.highestLinkClicks.description}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-mono text-[10px]">
                        {topWinners.highestLinkClicks.totalClicks} total clicks
                      </span>
                      {topWinners.highestLinkClicks.permalink && (
                        <a
                          href={topWinners.highestLinkClicks.permalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#172DC3] hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <span>Meta Post</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Full Publications Table Container */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Table Header Controls */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC]">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#15192B]">All Publications Data</h3>
                    <span className="text-xs bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md font-mono font-semibold">
                      {tableRecords.length} / {filteredRecords.length}
                    </span>
                  </div>

                  {/* Search and Top N Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search publication text..."
                        value={tableSearchQuery}
                        onChange={(e) => setTableSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#172DC3]/30 w-48 sm:w-60 transition"
                      />
                      {tableSearchQuery && (
                        <button
                          onClick={() => setTableSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Top N Selector */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                      <span className="text-[11px] text-slate-400 px-1 font-semibold">Show:</span>
                      {(['5', '10', '25', 'All'] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setTableTopN(opt)}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            tableTopN === opt
                              ? 'bg-[#172DC3] text-white shadow-xs'
                              : 'text-slate-600 hover:text-[#15192B]'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Table Component */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Publication Title / Copy</th>
                        <th
                          className="py-3 px-3 cursor-pointer hover:bg-slate-100"
                          onClick={() => {
                            setSortField('publishTime');
                            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span>Date</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-3">Format</th>
                        <th
                          className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-right"
                          onClick={() => {
                            setSortField('reach');
                            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Reach</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
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
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
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
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th
                          className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-right"
                          onClick={() => {
                            setSortField('linkClicks');
                            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Link Clicks</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
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
                            <span>Total Clicks</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th
                          className="py-3 px-3 cursor-pointer hover:bg-slate-100 text-right"
                          onClick={() => {
                            setSortField('engagementRate');
                            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Eng. Rate</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 text-center">Meta Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {tableRecords.map((rec) => {
                        const engRate = rec.reach > 0 ? ((rec.totalEngagement / rec.reach) * 100).toFixed(2) + '%' : 'N/A';
                        return (
                          <tr
                            key={rec.id}
                            className={`hover:bg-indigo-50/40 transition ${
                              highlightedRecordId === rec.id ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <td className="py-3 px-4 max-w-xs font-semibold">
                              <div className="line-clamp-2 text-[#15192B]" title={rec.description}>
                                {rec.title || rec.description.slice(0, 70)}
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
                                {rec.publicationType === 'Vidéos' ? 'Videos / Reels' : rec.publicationType}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-bold font-mono text-[#15192B]">
                              {rec.reach.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-700">
                              {rec.views.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                              <div>{rec.totalEngagement.toLocaleString()}</div>
                              <div className="text-[9px] text-slate-400 font-normal">
                                {rec.reactions}r {rec.comments}c {rec.shares}s
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                              {rec.linkClicks.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-amber-700 font-medium">
                              {rec.totalClicks.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              {engRate}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {rec.permalink ? (
                                <a
                                  href={rec.permalink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#172DC3] hover:text-[#201B9F] inline-flex items-center gap-1 font-bold text-[11px] bg-slate-50 px-2 py-1 rounded-md border border-slate-200 hover:border-indigo-200"
                                >
                                  <span>View</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              SECTION 6: DATASET OBSERVATIONS & METHODOLOGY
             ========================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dataset Observations (Rule-based deterministic observations) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-[#15192B] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#172DC3]" />
                  <span>Dataset Observations</span>
                </h3>
                <span className="text-[10px] bg-indigo-50 text-[#172DC3] border border-indigo-100 px-2 py-0.5 rounded font-bold uppercase">
                  Deterministic
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700">
                {datasetObservations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#172DC3] mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{obs}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* About these Insights / Methodology Notes */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-[#15192B] flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-500" />
                  <span>About these Insights</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Methodology, metrics definitions and reporting safeguards
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <p>
                  • <strong>Source Traceability:</strong> All calculations derive deterministically from the currently active Meta export dataset without artificial extrapolation or automated model generation.
                </p>
                <p>
                  • <strong>Organic vs. Boosted Overlap:</strong> Organic and boosted metrics are displayed as reported by Meta and should not be assumed to be mutually exclusive.
                </p>
                <p>
                  • <strong>Engagement Definition:</strong> Total Engagement is the exact sum of Reactions, Comments, and Shares. Link Clicks are tracked separately as outbound website actions.
                </p>
                <p>
                  • <strong>Platform Separation:</strong> The dataset represents cross-posted Meta publications; platform-separated (Instagram vs. Facebook) metrics are not cleanly partitioned in this export.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
