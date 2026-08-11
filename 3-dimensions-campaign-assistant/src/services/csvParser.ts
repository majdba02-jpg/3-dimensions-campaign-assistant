import { MarketingDataRecord, DatasetMetadata } from '../types';

export interface CSVValidationReport {
  isValid: boolean;
  totalRowsDetected: number;
  validRecordsCount: number;
  mappedFields: string[];
  unmappedFields: string[];
  dateRange: { start: string; end: string };
  successChecks: string[];
  warnings: string[];
}

/**
 * Custom robust CSV Line Splitter handling quotes, double quotes, and commas.
 */
function parseCSVLines(csvText: string): string[][] {
  const lines: string[][] = [];
  let currentField = '';
  let currentRecord: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRecord.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRecord.push(currentField.trim());
      if (currentRecord.some(f => f.length > 0)) {
        lines.push(currentRecord);
      }
      currentRecord = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    if (currentRecord.some(f => f.length > 0)) {
      lines.push(currentRecord);
    }
  }

  return lines;
}

function parseNum(val: any): number {
  if (val === undefined || val === null) return 0;
  const cleaned = String(val).replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseMetaCSV(
  csvText: string,
  fileName: string = 'Meta_Export.csv'
): { records: MarketingDataRecord[]; report: CSVValidationReport; metadata: DatasetMetadata } {
  const rawRows = parseCSVLines(csvText.trim());
  if (rawRows.length < 2) {
    return {
      records: [],
      report: {
        isValid: false,
        totalRowsDetected: 0,
        validRecordsCount: 0,
        mappedFields: [],
        unmappedFields: [],
        dateRange: { start: 'N/A', end: 'N/A' },
        successChecks: [],
        warnings: ['CSV file appears empty or contains no header row.'],
      },
      metadata: {
        id: `ds_${Date.now()}`,
        fileName,
        importedAt: new Date().toISOString(),
        totalRecords: 0,
        mappedColumns: [],
        unmappedColumns: [],
        dateRange: { start: 'N/A', end: 'N/A' },
      },
    };
  }

  const headers = rawRows[0].map(h => h.trim().replace(/^"|"$/g, ''));
  const dataRows = rawRows.slice(1);

  // Column index finder helpers
  const findCol = (...aliases: string[]): number => {
    // 1. Try exact match first
    const exactIdx = headers.findIndex(h => {
      const lowerH = h.trim().toLowerCase();
      return aliases.some(alias => lowerH === alias.trim().toLowerCase());
    });
    if (exactIdx !== -1) return exactIdx;

    // 2. Try substring match, but exclude aggregate engagement header when searching for sub-metrics
    return headers.findIndex(h => {
      const lowerH = h.trim().toLowerCase();
      return aliases.some(alias => {
        const lowerAlias = alias.trim().toLowerCase();
        if (
          lowerH === 'réactions, commentaires et partages' &&
          (lowerAlias === 'réactions' || lowerAlias === 'commentaires' || lowerAlias === 'partages')
        ) {
          return false;
        }
        return lowerH.includes(lowerAlias);
      });
    });
  };

  const idCol = findCol('Identifiant de la publication', 'Publication ID', 'Post ID', 'id');
  const pageIdCol = findCol('ID de la Page', 'Page ID');
  const pageNameCol = findCol('Nom de la page', 'Page Name');
  const titleCol = findCol('Titre', 'Title');
  const descCol = findCol('Description');
  const durationCol = findCol('Durée', 'Duration');
  const publishTimeCol = findCol('Heure de publication', 'Publish Time', 'Posted Date');
  const permalinkCol = findCol('Permalien', 'Link', 'URL');
  const crosspostCol = findCol('crosspostage', 'crosspost');
  const shareCol = findCol('Est un partage', 'Is Share');
  const pubTypeCol = findCol('Type de publication', 'Post Type', 'Format');
  const viewsCol = findCol('Vues', 'Views', 'Impressions');
  const reachCol = findCol('Couverture', 'Reach');
  const engCol = findCol('Réactions, commentaires et partages', 'Total Engagement', 'Engagement');
  const reactionsCol = findCol('Réactions', 'Reactions', 'Likes');
  const commentsCol = findCol('Commentaires', 'Comments');
  const sharesCol = findCol('Partages', 'Shares');
  const clicksCol = findCol('Total des clics', 'Total Clicks', 'Clicks');
  const linkClicksCol = findCol('Clics sur un lien', 'Link Clicks');
  const orgViewsCol = findCol('Vues de Publications organiques', 'Organic Views');
  const boostViewsCol = findCol('Vues de Publications boostées', 'Boosted Views');
  const orgReachCol = findCol('Couverture de Publications organiques', 'Organic Reach');
  const boostReachCol = findCol('Couverture de Publications boostées', 'Boosted Reach');
  const watchTimeCol = findCol('Secondes regardé', 'Watch Time');
  const avgWatchCol = findCol('Secondes moyen', 'Average Watch Time');
  const views3sCol = findCol('3 secondes', '3s Views');
  const views1mCol = findCol('1 minute', '1m Views');

  const mappedFields: string[] = [];
  const successChecks: string[] = [];
  const warnings: string[] = [];

  if (idCol !== -1) { mappedFields.push('Post ID'); successChecks.push('✓ Publication ID column detected'); }
  if (publishTimeCol !== -1) { mappedFields.push('Publish Time'); successChecks.push('✓ Publication timestamp detected'); }
  if (reachCol !== -1) { mappedFields.push('Reach'); successChecks.push('✓ Reach (Couverture) metric detected'); }
  if (viewsCol !== -1) { mappedFields.push('Views'); successChecks.push('✓ Views (Vues) metric detected'); }
  if (engCol !== -1 || reactionsCol !== -1) { mappedFields.push('Engagement'); successChecks.push('✓ Engagement metrics detected'); }
  if (clicksCol !== -1 || linkClicksCol !== -1) { mappedFields.push('Clicks'); successChecks.push('✓ Clicks and link clicks detected'); }
  if (orgReachCol !== -1 || boostReachCol !== -1) { mappedFields.push('Organic vs Boosted'); successChecks.push('✓ Organic vs. Boosted contribution metrics detected'); }
  if (watchTimeCol !== -1) { mappedFields.push('Watch Time'); successChecks.push('✓ Video watch-time metrics detected'); }

  // Check warnings
  warnings.push('⚠ Platform cannot be reliably split (cross-posted content handled unified)');
  if (pubTypeCol === -1) {
    warnings.push('⚠ Publication type missing; defaulting based on video duration');
  }

  const records: MarketingDataRecord[] = [];
  let minDate = '9999-99-99';
  let maxDate = '0000-00-00';

  dataRows.forEach((row, idx) => {
    if (!row || row.length === 0) return;

    const id = idCol !== -1 ? row[idCol] || `row_${idx}` : `row_${idx}`;
    const title = titleCol !== -1 ? row[titleCol] || '' : '';
    const description = descCol !== -1 ? row[descCol] || '' : '';
    const durationSeconds = durationCol !== -1 ? parseNum(row[durationCol]) : 0;
    const publishTime = publishTimeCol !== -1 ? row[publishTimeCol] || '' : '';
    const permalink = permalinkCol !== -1 ? row[permalinkCol] || '' : '';
    const isCrosspost = crosspostCol !== -1 ? row[crosspostCol] === '1' || row[crosspostCol]?.toLowerCase() === 'true' : false;
    const isShare = shareCol !== -1 ? row[shareCol] === '1' || row[shareCol]?.toLowerCase() === 'true' : false;
    
    let publicationType = pubTypeCol !== -1 ? row[pubTypeCol] : '';
    if (!publicationType) {
      publicationType = durationSeconds > 0 ? 'Vidéos' : 'Photos';
    }

    const views = viewsCol !== -1 ? parseNum(row[viewsCol]) : 0;
    const reach = reachCol !== -1 ? parseNum(row[reachCol]) : 0;
    const reactions = reactionsCol !== -1 ? parseNum(row[reactionsCol]) : 0;
    const comments = commentsCol !== -1 ? parseNum(row[commentsCol]) : 0;
    const shares = sharesCol !== -1 ? parseNum(row[sharesCol]) : 0;
    
    let totalEngagement = engCol !== -1 ? parseNum(row[engCol]) : 0;
    if (totalEngagement === 0 && (reactions > 0 || comments > 0 || shares > 0)) {
      totalEngagement = reactions + comments + shares;
    }

    const totalClicks = clicksCol !== -1 ? parseNum(row[clicksCol]) : 0;
    const linkClicks = linkClicksCol !== -1 ? parseNum(row[linkClicksCol]) : 0;
    const organicViews = orgViewsCol !== -1 ? parseNum(row[orgViewsCol]) : 0;
    const boostedViews = boostViewsCol !== -1 ? parseNum(row[boostViewsCol]) : 0;
    const organicReach = orgReachCol !== -1 ? parseNum(row[orgReachCol]) : 0;
    const boostedReach = boostReachCol !== -1 ? parseNum(row[boostReachCol]) : 0;
    const watchTimeSeconds = watchTimeCol !== -1 ? parseNum(row[watchTimeCol]) : 0;
    const averageWatchTimeSeconds = avgWatchCol !== -1 ? parseNum(row[avgWatchCol]) : 0;
    const views3s = views3sCol !== -1 ? parseNum(row[views3sCol]) : 0;
    const views1m = views1mCol !== -1 ? parseNum(row[views1mCol]) : 0;

    if (publishTime) {
      if (publishTime < minDate) minDate = publishTime;
      if (publishTime > maxDate) maxDate = publishTime;
    }

    records.push({
      id,
      pageId: pageIdCol !== -1 ? row[pageIdCol] : '61564880291097',
      pageName: pageNameCol !== -1 ? row[pageNameCol] : 'Infinite Dimensions',
      title: title || description.slice(0, 50),
      description,
      durationSeconds,
      publishTime,
      permalink,
      isCrosspost,
      isShare,
      publicationType,
      views,
      reach,
      totalEngagement,
      reactions,
      comments,
      shares,
      totalClicks,
      linkClicks,
      organicViews,
      boostedViews,
      organicReach,
      boostedReach,
      watchTimeSeconds,
      averageWatchTimeSeconds,
      views3s,
      views1m,
      importedAt: new Date().toISOString(),
    });
  });

  const unmappedFields = headers.filter(
    h => !mappedFields.some(mf => h.toLowerCase().includes(mf.toLowerCase()))
  );

  const report: CSVValidationReport = {
    isValid: records.length > 0,
    totalRowsDetected: dataRows.length,
    validRecordsCount: records.length,
    mappedFields,
    unmappedFields,
    dateRange: {
      start: minDate !== '9999-99-99' ? minDate : '01/16/2026',
      end: maxDate !== '0000-00-00' ? maxDate : '06/30/2026',
    },
    successChecks,
    warnings,
  };

  const metadata: DatasetMetadata = {
    id: `ds_${Date.now()}`,
    fileName,
    importedAt: new Date().toISOString(),
    totalRecords: records.length,
    mappedColumns: mappedFields,
    unmappedColumns: unmappedFields,
    dateRange: report.dateRange,
  };

  return { records, report, metadata };
}
