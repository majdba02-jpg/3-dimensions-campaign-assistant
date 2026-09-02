import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { validateAndRepairCampaignPlan } from './src/utils/planValidation.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

// Polyfill directory context safely for both ESM/CJS runtime environments
const appDir = process.cwd();

const app = express();
const PORT = 3000;

const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' ||
  path.basename(process.argv[1] || '') === 'server.cjs';

app.use(express.json({ limit: '10mb' }));

// Centralized Gemini Model Configuration
const GEMINI_CONFIG = {
  model: 'gemini-3.6-flash',
};

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

/**
 * Extract retry delay in milliseconds from Gemini / HTTP error metadata
 */
function extractRetryDelayMs(err: any, fallbackMs = 2500): number {
  if (!err) return fallbackMs;

  // 1. Direct property on error (e.g. err.retryDelay, err.retryAfterMs)
  if (typeof err.retryDelay === 'number' && err.retryDelay > 0) {
    return Math.min(Math.max(err.retryDelay, 500), 10000);
  }
  if (typeof err.retryAfterMs === 'number' && err.retryAfterMs > 0) {
    return Math.min(Math.max(err.retryAfterMs, 500), 10000);
  }

  // 2. HTTP headers (e.g. 'retry-after', 'retry-after-ms')
  const headers = err.headers || err.response?.headers;
  if (headers) {
    const retryAfterHeader =
      typeof headers.get === 'function'
        ? headers.get('retry-after') || headers.get('retry-after-ms')
        : headers['retry-after'] || headers['retry-after-ms'];

    if (retryAfterHeader) {
      const parsed = parseFloat(String(retryAfterHeader));
      if (!isNaN(parsed) && parsed > 0) {
        const ms = parsed > 100 ? parsed : parsed * 1000;
        return Math.min(Math.max(Math.round(ms), 500), 10000);
      }
    }
  }

  // 3. Regex on error message string (e.g. "Retry after 3.2s" or "Please retry in 3000ms")
  if (typeof err.message === 'string') {
    const match = err.message.match(/(?:retry(?: after)?|wait)\s+(\d+(?:\.\d+)?)\s*(s|ms|seconds|milliseconds)?/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = (match[2] || 's').toLowerCase();
      const ms = unit.startsWith('ms') || unit.startsWith('milli') ? val : val * 1000;
      if (!isNaN(ms) && ms > 0) {
        return Math.min(Math.max(Math.round(ms), 500), 10000);
      }
    }
  }

  return fallbackMs;
}

/**
 * Exponential backoff retry handler for Gemini API calls
 * Retries up to 2 times for 503 / UNAVAILABLE / overloaded errors.
 * For 429 (quota / rate limit): allows at most ONE safe retry with metadata-informed delay, never infinite loops.
 */
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 2,
  initialDelayMs = 1500
): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      attempt++;
      return await fn();
    } catch (err: any) {
      const is429 =
        err?.status === 429 ||
        err?.code === 429 ||
        err?.is429 ||
        (err?.message && (
          err.message.includes('429') ||
          err.message.includes('RESOURCE_EXHAUSTED') ||
          err.message.includes('Quota') ||
          err.message.includes('token count') ||
          err.message.includes('rate limit')
        ));

      if (is429) {
        // Allow at most ONE automatic retry for 429 if on first attempt
        if (attempt === 1) {
          const retryDelay = extractRetryDelayMs(err, 2500);
          console.warn(`[Gemini API] 429 Rate Limit encountered. Respecting retry guidance: waiting ${retryDelay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        } else {
          const quotaErr: any = new Error(
            'Gemini free-tier quota is temporarily exhausted. Your campaign data is safe. Please wait a moment and try again.'
          );
          quotaErr.status = 429;
          quotaErr.is429 = true;
          throw quotaErr;
        }
      }

      const is503OrBusy =
        err?.status === 503 ||
        err?.code === 503 ||
        err?.is503 ||
        (err?.message && (
          err.message.includes('503') ||
          err.message.includes('UNAVAILABLE') ||
          err.message.includes('overloaded') ||
          err.message.includes('high demand') ||
          err.message.includes('Service Unavailable')
        ));

      if (is503OrBusy && attempt < maxAttempts) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini API] 503/Busy (Attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        if (is503OrBusy) {
          const busyErr: any = new Error('Gemini is temporarily busy. Your campaign data is safe. Please try again in a moment.');
          busyErr.status = 503;
          busyErr.is503 = true;
          throw busyErr;
        }
        throw err;
      }
    }
  }
  throw new Error('Gemini API request failed after retry attempt.');
}

/**
 * Server-side in-flight request deduplication map
 * Prevents identical concurrent requests from firing duplicate Gemini calls.
 */
const inFlightOperations = new Map<string, Promise<any>>();

async function executeWithInFlightDedup<T>(key: string, operationFn: () => Promise<T>): Promise<T> {
  if (inFlightOperations.has(key)) {
    if (!IS_PRODUCTION) {
      console.log(`[Gemini Guard] Reusing in-flight request for key: ${key}`);
    }
    return inFlightOperations.get(key)!;
  }
  const promise = operationFn().finally(() => {
    inFlightOperations.delete(key);
  });
  inFlightOperations.set(key, promise);
  return promise;
}

/**
 * Development request diagnostics (dev only, no secrets or full datasets logged)
 */
function logGeminiDiagnostics(
  operation: string,
  campaignId: string | undefined,
  prompt: string,
  systemInstruction?: string
) {
  if (IS_PRODUCTION) return;
  const totalChars = (prompt?.length || 0) + (systemInstruction?.length || 0);
  const estTokens = Math.round(totalChars / 4);
  console.log(`[Gemini] operation=${operation}${campaignId ? ` campaign=${campaignId}` : ''}`);
  console.log(`[Gemini] approximate context size=${totalChars} chars (~${estTokens} est. tokens)`);
  console.log(`[Gemini] request started`);
}

/**
 * Compact Context Serialization Utilities
 * Ensures only populated, strictly required fields are transmitted to Gemini.
 */
function getCompactBrandKit(brandKit: any) {
  if (!brandKit || typeof brandKit !== 'object') return null;
  const compact: Record<string, any> = {};
  if (brandKit.companyName?.trim()) compact.companyName = brandKit.companyName.trim();
  if (brandKit.tagline?.trim()) compact.tagline = brandKit.tagline.trim();
  if (brandKit.description?.trim()) compact.description = brandKit.description.trim();
  if (Array.isArray(brandKit.brandTones) && brandKit.brandTones.length > 0) {
    compact.brandTones = brandKit.brandTones;
  }
  if (Array.isArray(brandKit.approvedClaims) && brandKit.approvedClaims.length > 0) {
    const claims = brandKit.approvedClaims
      .map((c: any) => (typeof c === 'string' ? c.trim() : c?.claim?.trim()))
      .filter(Boolean);
    if (claims.length > 0) compact.approvedClaims = claims;
  }
  if (Array.isArray(brandKit.avoidClaims) && brandKit.avoidClaims.length > 0) {
    const avoids = brandKit.avoidClaims
      .map((c: any) => (typeof c === 'string' ? c.trim() : c?.claim?.trim()))
      .filter(Boolean);
    if (avoids.length > 0) compact.avoidClaims = avoids;
  }
  if (Array.isArray(brandKit.preferredTerminology) && brandKit.preferredTerminology.length > 0) {
    compact.preferredTerminology = brandKit.preferredTerminology;
  }
  if (Array.isArray(brandKit.languageStyleGuide) && brandKit.languageStyleGuide.length > 0) {
    compact.languageStyleGuide = brandKit.languageStyleGuide;
  }
  if (brandKit.creativeDirectives?.trim()) {
    compact.creativeDirectives = brandKit.creativeDirectives.trim();
  }
  return Object.keys(compact).length > 0 ? compact : null;
}

function getCompactSelectedProducts(brief: any, products: any[]) {
  if (!Array.isArray(products) || products.length === 0) return [];

  const selectedNames = new Set<string>();
  const selectedIds = new Set<string>();

  if (Array.isArray(brief.promotionItems)) {
    brief.promotionItems.forEach((p: any) => {
      if (p.name) selectedNames.add(p.name.toLowerCase().trim());
      if (p.id) selectedIds.add(p.id);
    });
  }
  if (brief.productOrService) {
    const parts = brief.productOrService.split(',').map((s: string) => s.toLowerCase().trim());
    parts.forEach((p: string) => selectedNames.add(p));
  }
  if (Array.isArray(brief.selectedProductIds)) {
    brief.selectedProductIds.forEach((id: string) => selectedIds.add(id));
  }
  if (brief.productId) {
    selectedIds.add(brief.productId);
  }

  const filtered = products.filter((p: any) => {
    if (!p) return false;
    const nameMatch = p.name && selectedNames.has(p.name.toLowerCase().trim());
    const idMatch = p.id && selectedIds.has(p.id);
    return nameMatch || idMatch;
  });

  // Limit to max 2 relevant items to avoid bloating prompt context
  const itemsToUse = filtered.length > 0 ? filtered.slice(0, 2) : (products.length > 0 ? [products[0]] : []);

  return itemsToUse.map((p: any) => ({
    name: p.name,
    category: p.category,
    description: p.description,
    approvedClaims: Array.isArray(p.approvedClaims) ? p.approvedClaims.slice(0, 4) : [],
    keyBenefits: Array.isArray(p.keyBenefits) ? p.keyBenefits.slice(0, 4) : [],
    supportedMaterials: Array.isArray(p.supportedMaterials) ? p.supportedMaterials.slice(0, 4) : undefined,
  }));
}

function getCompactFeedbackMemory(context: any, feedbackMemory: any[]) {
  if (!Array.isArray(feedbackMemory) || feedbackMemory.length === 0) return [];

  // 1. Filter only active items (treat undefined isActive as true for backward compatibility)
  const activeItems = feedbackMemory.filter(
    (item: any) => item && item.isActive !== false
  );
  if (activeItems.length === 0) return [];

  const targetFormat = String(context.format || context.contentFormat || '').toLowerCase();
  const targetAudience = String(context.audienceSegment || context.audience || '').toLowerCase();
  const targetPlatform = String(context.platform || '').toLowerCase();
  const targetProductId = String(context.productOrServiceId || context.selectedOffering || '').toLowerCase();
  const targetLanguages: string[] = Array.isArray(context.languages)
    ? context.languages.map((l: any) => String(l).toLowerCase())
    : context.language
    ? [String(context.language).toLowerCase()]
    : [];

  // 2. Score relevance based on contextual match
  const scored = activeItems.map((item: any) => {
    let score = 0;
    const itemFormat = String(item.format || item.contentFormat || item.scope?.format || '').toLowerCase();
    const itemAudience = String(item.audienceSegment || item.scope?.audienceSegment || '').toLowerCase();
    const itemPlatform = String(item.platform || item.scope?.platform || '').toLowerCase();
    const itemProductId = String(item.productOrServiceId || item.scope?.productOrServiceId || '').toLowerCase();
    const itemLanguages: string[] = Array.isArray(item.languages)
      ? item.languages.map((l: any) => String(l).toLowerCase())
      : item.language
      ? [String(item.language).toLowerCase()]
      : Array.isArray(item.scope?.languages)
      ? item.scope.languages.map((l: any) => String(l).toLowerCase())
      : [];

    const isGlobal = Boolean(
      item.scope?.isGlobal ||
      (!itemFormat && !itemAudience && !itemPlatform && !itemProductId && itemLanguages.length === 0)
    );

    if (targetFormat && itemFormat && (targetFormat.includes(itemFormat) || itemFormat.includes(targetFormat))) {
      score += 4;
    }
    if (targetAudience && itemAudience && (targetAudience.includes(itemAudience) || itemAudience.includes(targetAudience) || itemAudience === 'both')) {
      score += 3;
    }
    if (targetPlatform && itemPlatform && (targetPlatform.includes(itemPlatform) || itemPlatform.includes(targetPlatform))) {
      score += 2;
    }
    if (targetLanguages.length > 0 && itemLanguages.length > 0 && itemLanguages.some((l) => targetLanguages.some((tl) => tl.includes(l) || l.includes(tl)))) {
      score += 2;
    }
    if (targetProductId && itemProductId && targetProductId === itemProductId) {
      score += 3;
    }
    if (item.feedbackType === 'Brand / Style Rule' || item.feedbackType === 'Correction') {
      score += 2;
    }
    if (isGlobal) {
      score += 1;
    }

    return { item, score };
  });

  // 3. Rank by score desc, then by createdAt desc (newer first)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dateA = a.item.createdAt ? new Date(a.item.createdAt).getTime() : 0;
    const dateB = b.item.createdAt ? new Date(b.item.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // 4. Strict cap: maximum 3–5 items
  const slice = scored.slice(0, 4);

  return slice.map(({ item }) => {
    let type = item.feedbackType;
    if (!type) {
      if (item.rating === 'Positive') type = 'Positive Preference';
      else if (item.rating === 'Negative') type = 'Avoid / Negative';
      else type = 'Brand / Style Rule';
    }

    const scopeParts: string[] = [];
    const scopeAudience = item.audienceSegment || item.scope?.audienceSegment;
    const scopeFormat = item.format || item.contentFormat || item.scope?.format;
    const scopeLang = item.languages?.length ? item.languages.join('/') : item.language;

    if (scopeAudience) scopeParts.push(scopeAudience);
    if (scopeFormat) scopeParts.push(scopeFormat);
    if (scopeLang) scopeParts.push(scopeLang);

    const scopeTag = scopeParts.length > 0 ? `[${scopeParts.join(' ')}]` : '[General]';
    const instruction = item.instruction || item.explanation || item.correctedVersion || item.text || item.guideline || '';

    return {
      type,
      scope: scopeTag,
      instruction,
      formatted: `[${type}]${scopeTag} ${instruction}`,
    };
  });
}

function getCompactCampaignReferences(brief: any, campaignReferences: any[]) {
  if (!Array.isArray(campaignReferences) || campaignReferences.length === 0) return [];
  const selectedIds = new Set(brief.selectedReferenceIds || []);
  if (selectedIds.size === 0) return [];

  const matched = campaignReferences.filter((r: any) => selectedIds.has(r.id)).slice(0, 2);
  return matched.map((r: any) => ({
    title: r.title || r.name,
    takeaways: r.takeaways || r.keyInsights || r.notes || r.description,
  }));
}

function getCompactCampaignBrief(brief: any) {
  const compact: Record<string, any> = {
    name: brief.name || 'Untitled Campaign',
    campaignType: brief.campaignType || brief.type || 'Standard',
    audienceSegment: brief.audienceSegment || 'Both',
    targetAudiences:
      Array.isArray(brief.targetAudiences) && brief.targetAudiences.length > 0
        ? brief.targetAudiences
        : brief.targetAudience
        ? [brief.targetAudience]
        : [],
    audienceNotes: brief.audienceNotes || undefined,
    ageRange:
      brief.minAge || brief.maxAge
        ? `${brief.minAge || 'All'} - ${brief.maxAge || 'All'}`
        : undefined,
    locations:
      Array.isArray(brief.locations) && brief.locations.length > 0
        ? brief.locations
        : undefined,
    languages:
      Array.isArray(brief.languages) && brief.languages.length > 0
        ? brief.languages
        : ['Tunisian Darija', 'English'],
    objective: brief.objective || '',
    productOrService:
      Array.isArray(brief.promotionItems) && brief.promotionItems.length > 0
        ? brief.promotionItems.map((p: any) => p.name).join(', ')
        : brief.productOrService || 'Custom 3D Printing Service',
    startDate: brief.startDate,
    endDate: brief.endDate,
    durationDays: brief.durationDays || 7,
    targetPlatforms:
      Array.isArray(brief.targetPlatforms) && brief.targetPlatforms.length > 0
        ? brief.targetPlatforms
        : Array.isArray(brief.platforms)
        ? brief.platforms
        : ['Instagram', 'Facebook'],
    desiredFormats:
      Array.isArray(brief.desiredFormats) && brief.desiredFormats.length > 0
        ? brief.desiredFormats
        : ['Reel', 'Carousel', 'Feed Post'],
    cta: brief.cta || 'Contact for Quote',
    campaignTone:
      Array.isArray(brief.campaignToneList) && brief.campaignToneList.length > 0
        ? brief.campaignToneList
        : brief.campaignTone
        ? [brief.campaignTone]
        : ['Professional', 'Innovative'],
    keyMessage: brief.keyMessage || '',
    primaryKPIs:
      Array.isArray(brief.primaryKPIs) && brief.primaryKPIs.length > 0
        ? brief.primaryKPIs
        : ['Inquiries / Leads'],
    funnelIntent: brief.funnelIntent || 'Consideration',
    promotionOffer: brief.promotionOffer || undefined,
    seasonalContext: brief.seasonalContext || undefined,
    contentPillars: Array.isArray(brief.contentPillars) ? brief.contentPillars : [],
    creativeDirectives: brief.additionalInstructions || brief.additionalDirectives || undefined,
    availableResources: brief.availableResources
      ? {
          hasProductPhotos: !!brief.availableResources.hasProductPhotos,
          hasVideoFootage: !!brief.availableResources.hasVideoFootage,
          hasExistingGraphics: !!brief.availableResources.hasExistingGraphics,
          hasProductForShooting: !!brief.availableResources.hasProductForShooting,
          hasTeamOnCamera: !!brief.availableResources.hasTeamOnCamera,
          hasTestimonialMaterial: !!brief.availableResources.hasTestimonialMaterial,
          notes: brief.availableResources.notes || undefined,
        }
      : undefined,
  };

  // Accepted/Resolved assumptions only
  if (Array.isArray(brief.assumptions)) {
    const resolved = brief.assumptions
      .filter((a: any) => a.status === 'Accepted' || a.status === 'Edited')
      .map((a: any) => ({
        category: a.category,
        value: a.editedValue || a.proposedValue,
      }));
    if (resolved.length > 0) {
      compact.resolvedAssumptions = resolved;
    }
  }

  return compact;
}

function getCompactSelectedDirection(selectedDirection: any) {
  if (!selectedDirection) return null;
  return {
    title: selectedDirection.title,
    strategicAngle: selectedDirection.strategicAngle || selectedDirection.highLevelDirection,
    concept: selectedDirection.concept,
    coreMessage: selectedDirection.coreMessage,
    strategicRationale: selectedDirection.strategicRationale,
    campaignPillars: selectedDirection.suggestedPillars || selectedDirection.campaignPillars || [],
    directionSpecificPillar: selectedDirection.directionSpecificPillar || undefined,
  };
}

/**
 * Strict Factual Grounding Mandate System Prompt
 */
const FACTUAL_GROUNDING_RULES = `
FACTUAL GROUNDING & TRUTH MANDATE FOR "3 DIMENSIONS" (Infinite Dimensions):
You must strictly distinguish between three categories of information:
1. CONFIRMED USER FACTS: Information explicitly stated in the campaign brief (e.g., target dates, platforms, audience, specified objective, product/service name).
2. APPROVED COMPANY FACTS: Verified data from the company's approved Brand Kit and Products & Services catalog (e.g., approved materials, documented services, verified claims).
3. CREATIVE CONTENT IDEAS: Educational campaign angles, concepts, video hooks, storytelling themes, and promotional concepts that DO NOT assert unverified company capabilities.

CRITICAL CONSTRAINTS:
- NEVER present category 3 (Creative Content Ideas) as category 1 or 2 (Confirmed Facts).
- You are strictly forbidden from asserting unverified company capabilities such as:
  * High-precision fabrication or certified tolerances
  * Architectural scale-model services
  * Custom batch enclosures or manufacturing runs
  * Jigs and fixtures fabrication
  * Specific material recommendations (PLA, PETG, Resin, ABS) unless listed in approved catalog
  * Design for Additive Manufacturing (DfAM) consulting or CAD evaluation services
  * Production-batch volume capabilities
  * Specific local-manufacturing supply-chain claims
  UNLESS explicitly supported by approved company knowledge.
- IDEAS vs CLAIMS:
  * ALLOWED: "Explore how 3D printing can support architectural visualization."
  * FORBIDDEN WITHOUT APPROVED KNOWLEDGE: "3 Dimensions produces architectural scale models."
- If Industry Focus is blank or generic, do NOT state that 3 Dimensions serves specific sectors (architecture, medical, automotive) as confirmed clients. Offer sector angles as optional concepts.
- When generating copy in Tunisian Darija, write in Arabic script and preserve natural English/French technical terms (e.g., Impression 3D, PLA, PETG, Prototype, Design, Reel, Packaging). Avoid forced slang or excessive emojis.
`;

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * 1. Improve Campaign Objective with AI
 */
app.post('/api/gemini/improve-objective', async (req, res) => {
  try {
    const { objective, campaignType, audienceSegment, productOrService, targetAudience, campaignTone, keyMessage } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are an expert marketing strategist for "3 Dimensions" (Infinite Dimensions), a 3D-printing and fabrication studio in Tunis.
Refine and improve the campaign objective provided by the marketer.
Make it concise, actionable, and aligned with standard marketing outcomes (awareness, engagement, leads, inquiries, conversions).

STRICT RULES:
- DO NOT invent unverified technical specifications, tolerances, pricing, delivery times, or guarantees.
- Ground the suggestion in the provided product/service ("${productOrService || '3D Printing'}") and context.
- Return a strict JSON object with "suggestedObjective" (1-2 sentences) and "rationale" (1 concise sentence explaining the refinement).`;

    const prompt = `Current Campaign Context:
- Current Draft Objective: "${objective || 'Promote 3D printing services'}"
- Campaign Type: ${campaignType || 'General Campaign'}
- Audience Segment: ${audienceSegment || 'Both'}
- Product / Service: ${productOrService || '3D Printing Solutions'}
- Target Audience: ${targetAudience || 'General Audience'}
${campaignTone ? `- Desired Tone: ${Array.isArray(campaignTone) ? campaignTone.join(', ') : campaignTone}` : ''}
${keyMessage ? `- Key Value Message: ${keyMessage}` : ''}

Propose an elevated, crisp marketing objective.`;

    logGeminiDiagnostics('improve-objective', undefined, prompt, systemInstruction);

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedObjective: { type: Type.STRING },
              rationale: { type: Type.STRING },
            },
            required: ['suggestedObjective', 'rationale'],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error improving objective:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini quota reached. Your changes are safe. Please wait a moment.'
        : is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to improve objective',
    });
  }
});

/**
 * 1b. Polish / Improve Key Message with AI
 */
app.post('/api/gemini/improve-key-message', async (req, res) => {
  try {
    const { keyMessage, campaignType, audienceSegment, productOrService, targetAudience } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are an expert copywriter for "3 Dimensions" in Tunis.
Refine the marketer's key value proposition message to make it punchy, compelling, and clearly differentiated.
STRICT RULES:
- Never fabricate unverified tolerances, machine specs, or warranties.
- Return a strict JSON object with "suggestedMessage" (1-2 sentences) and "rationale" (1 sentence).`;

    const prompt = `Current Key Message: "${keyMessage || ''}"
Campaign Type: ${campaignType || 'General'}
Audience Segment: ${audienceSegment || 'Both'}
Product / Service: ${productOrService || '3D Printing Solutions'}
Target Audience: ${targetAudience || 'General Audience'}

Refine the key value message while maintaining factual grounding.`;

    logGeminiDiagnostics('improve-key-message', undefined, prompt, systemInstruction);

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedMessage: { type: Type.STRING },
              rationale: { type: Type.STRING },
            },
            required: ['suggestedMessage', 'rationale'],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{}');
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error improving key message:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini quota reached. Your changes are safe. Please wait a moment.'
        : is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to improve key message',
    });
  }
});

/**
 * 2. Recommend Content Formats
 */
app.post('/api/gemini/recommend-formats', async (req, res) => {
  try {
    const { objective, audience, productOrService, campaignType, platforms, languages, availableResources, references } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are a creative director for "3 Dimensions". Based on the campaign context, platforms, and available resources, recommend the most effective mix of content formats from:
["Reel", "Carousel", "Story", "Feed Photo", "Feed Post"].

STRICT RULES:
- Consider available resources (e.g. if video footage is available, prioritize Reels/Videos; if product photos only, prioritize Carousels and Feed Photos).
- Return strict JSON object with "recommendedFormats" (array of strings from the allowed list) and "rationale" (1-2 sentences explaining why this mix is optimal).`;

    const prompt = `Campaign Context:
- Type: ${campaignType || 'Standard'}
- Product / Service: ${productOrService || '3D Printing'}
- Objective: ${objective || ''}
- Audience: ${audience || ''}
- Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms || 'Instagram, Facebook'}
- Languages: ${Array.isArray(languages) ? languages.join(', ') : languages || 'Tunisian Darija, English'}
${availableResources ? `- Available Resources: ${JSON.stringify(availableResources)}` : ''}
${references && references.length > 0 ? `- References: ${JSON.stringify(references.slice(0, 2))}` : ''}

Recommend optimal content formats from: ["Reel", "Carousel", "Story", "Feed Photo", "Feed Post"].`;

    logGeminiDiagnostics('recommend-formats', undefined, prompt, systemInstruction);

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedFormats: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              rationale: { type: Type.STRING },
            },
            required: ['recommendedFormats', 'rationale'],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{"recommendedFormats":[],"rationale":""}');
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Error recommending formats:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini quota reached. Please wait a moment.'
        : is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to recommend formats',
    });
  }
});

/**
 * 3. Suggest Contextual CTAs
 */
app.post('/api/gemini/suggest-cta', async (req, res) => {
  try {
    const { objective, audience, productOrService, platforms, campaignType, funnelIntent, keyMessage } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are a conversion strategist for "3 Dimensions" in Tunis.
Suggest 3 distinct, punchy, high-converting Call-to-Action (CTA) phrases suitable for social media campaigns in Tunisia.
Return strict JSON with "suggestedCTAs" array containing 3 items with { "cta": string, "rationale": string }.`;

    const prompt = `Context:
- Campaign Type: ${campaignType || 'Standard'}
- Product / Service: ${productOrService || '3D Printing'}
- Objective: ${objective || ''}
- Audience: ${audience || ''}
- Funnel Intent: ${funnelIntent || 'Consideration'}
- Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms || 'Instagram'}
- Key Message: ${keyMessage || ''}

Provide 3 distinct CTA suggestions.`;

    logGeminiDiagnostics('suggest-cta', undefined, prompt, systemInstruction);

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedCTAs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    cta: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: ['cta', 'rationale'],
                },
              },
            },
            required: ['suggestedCTAs'],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{"suggestedCTAs":[]}');
    res.json({ success: true, suggestedCTAs: parsed.suggestedCTAs || [] });
  } catch (error: any) {
    console.error('Error suggesting CTA:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini quota reached. Please wait a moment.'
        : is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to suggest CTA',
    });
  }
});

/**
 * 4. Suggest Campaign Color Palette
 */
app.post('/api/gemini/suggest-palette', async (req, res) => {
  try {
    const { brandColors, campaignType, objective, audience, productOrService, tone, platforms } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are an art director for "3 Dimensions" 3D Printing.
The primary Brand Colors are: ${JSON.stringify(brandColors || ['#0F172A', '#2563EB', '#7C3AED'])}.
Generate 3 to 4 complementary CAMPAIGN ACCENT COLORS (valid 6-character hex format like #3B82F6) specifically tailored to the campaign's visual mood, product type, and audience.
Return a strict JSON object with a "palette" array of objects containing { "name": string, "hex": string, "rationale": string }.`;

    const prompt = `Campaign Mood & Attributes:
- Campaign Type: ${campaignType || 'Standard'}
- Product / Service: ${productOrService || '3D Printing'}
- Objective: ${objective || ''}
- Audience: ${audience || ''}
- Desired Tone: ${Array.isArray(tone) ? tone.join(', ') : tone || 'Professional'}
- Target Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms || 'Instagram'}
- Base Brand Colors: ${JSON.stringify(brandColors || ['#0F172A', '#2563EB', '#7C3AED'])}

Generate 3-4 complementary campaign accent colors with hex codes.`;

    logGeminiDiagnostics('suggest-palette', undefined, prompt, systemInstruction);

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              palette: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    hex: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: ['name', 'hex', 'rationale'],
                },
              },
            },
            required: ['palette'],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{"palette":[]}');
    const validHexRegex = /^#([A-Fa-f0-9]{6})$/;
    const validPalette = (parsed.palette || []).filter((p: any) => validHexRegex.test(p.hex));
    res.json({ success: true, palette: validPalette });
  } catch (error: any) {
    console.error('Error suggesting palette:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini quota reached. Please wait a moment.'
        : is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to suggest palette',
    });
  }
});

/**
 * 5. Review Genuinely Missing Assumptions (Safety Checkpoint for Missing Context Only)
 */
app.post('/api/gemini/assumptions', async (req, res) => {
  try {
    const { brief, brandKit, products, feedbackMemory, campaignReferences } = req.body;
    const ai = getGeminiClient();

    // 1. Build compact representations
    const compactBrief = getCompactCampaignBrief(brief || {});
    const compactBrand = getCompactBrandKit(brandKit);
    const compactProducts = getCompactSelectedProducts(brief || {}, products || []);
    const compactFeedback = getCompactFeedbackMemory(brief || {}, feedbackMemory || []);
    const compactReferences = getCompactCampaignReferences(brief || {}, campaignReferences || []);

    const dedupKey = `assumptions_${compactBrief.name}_${compactBrief.objective}_${compactBrief.productOrService}`;

    const validAssumptions = await executeWithInFlightDedup(dedupKey, async () => {
      const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are an expert marketing strategy reviewer for "3 Dimensions" (Infinite Dimensions) in Tunis.
Your role in this step is SOLELY as a safety checkpoint for OPTIONAL MISSING CONTEXT.

PURPOSE OF ASSUMPTIONS REVIEW:
- Propose an assumption ONLY when:
  1) An optional campaign detail is genuinely missing from the brief,
  2) That missing detail could materially improve strategic-direction generation,
  3) AND the proposal is a safe creative or strategic preference rather than an unverified company fact.
- Do NOT generate assumptions simply to ensure the screen contains something.
- If the brief already contains sufficient context, return an EMPTY ARRAY: "assumptions": [].

CRITICAL NEGATIVE CONSTRAINTS (DO NOT TURN EXISTING USER INPUT INTO AN ASSUMPTION):
- NEVER propose assumptions for values or choices that already exist in the brief, including:
  * Selected languages / dialects
  * Audience Segment (B2B, B2C, Both)
  * Target Audiences / Audience Notes / Age
  * Products / Services / Promotion Items
  * Campaign Objective
  * Call to Action (CTA)
  * Target Platforms & Desired Formats
  * Dates, Duration, or Schedule
  * Selected Campaign Tone
  * Selected KPIs
  * Selected Funnel Intent
  * Content Pillars
  * Creative Directives / Additional Instructions
  * Locations / Governorates

CRITICAL FACTUAL GROUNDING FIX (ANTI-FABRICATION MANDATE):
- Gemini must NEVER create assumptions containing unverified factual or company claims, such as delivery times, tolerances, pricing, warranties, or material fabrication capabilities.

SOURCE TAGS MUST BE TRUTHFUL:
- Only use: "Campaign Brief", "Brand Kit", "Approved Product / Service", "Campaign Reference", "Feedback Memory".

ALLOWED CATEGORIES:
- "Creative Framing", "Audience Sub-segment Angle", "Content Delivery Style", "Seasonal Angle".

Return strict JSON with an "assumptions" array containing objects with: id, category, proposedValue, rationale, sourceTags.`;

      const prompt = `Review this Compact Campaign Brief for Genuinely Missing Optional Context:
${JSON.stringify(compactBrief, null, 2)}
${compactBrand ? `\nApproved Brand Kit:\n${JSON.stringify(compactBrand, null, 2)}` : ''}
${compactProducts.length > 0 ? `\nApproved Products:\n${JSON.stringify(compactProducts, null, 2)}` : ''}
${compactReferences.length > 0 ? `\nBenchmark References:\n${JSON.stringify(compactReferences, null, 2)}` : ''}
${compactFeedback.length > 0 ? `\nFeedback Memory:\n${JSON.stringify(compactFeedback, null, 2)}` : ''}

If the brief is already complete, return "assumptions": []. Otherwise return only safe, creative framing proposals.`;

      logGeminiDiagnostics('assumptions', compactBrief.name, prompt, systemInstruction);

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: GEMINI_CONFIG.model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                assumptions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      category: { type: Type.STRING },
                      proposedValue: { type: Type.STRING },
                      rationale: { type: Type.STRING },
                      sourceTags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ['category', 'proposedValue', 'rationale', 'sourceTags'],
                  },
                },
              },
              required: ['assumptions'],
            },
          },
        })
      );

      const parsed = JSON.parse(response.text || '{"assumptions":[]}');
      const briefLanguages = (Array.isArray(compactBrief.languages) ? compactBrief.languages : []).map((s: string) => s.toLowerCase());

      return (parsed.assumptions || []).filter((a: any) => {
        const val = (a.proposedValue || '').toLowerCase();
        const cat = (a.category || '').toLowerCase();
        const rationale = (a.rationale || '').toLowerCase();
        const fullText = `${val} ${cat} ${rationale}`;

        // Reject delivery time / turnaround claims
        if (
          fullText.includes('48-72h') ||
          fullText.includes('24h') ||
          fullText.includes('delivery across tunisia') ||
          fullText.includes('fast local delivery') ||
          fullText.includes('turnaround time') ||
          fullText.includes('shipping')
        ) {
          return false;
        }

        // Reject redundant language assumptions
        if (
          cat.includes('language') ||
          fullText.includes('tunisian darija') ||
          fullText.includes('arabic') ||
          fullText.includes('french') ||
          briefLanguages.some((l: string) => l && fullText.includes(l))
        ) {
          return false;
        }

        // Reject unverified tolerances or machine specs
        if (fullText.includes('tolerance') || fullText.includes('0.05mm') || fullText.includes('0.1mm')) {
          return false;
        }

        return true;
      }).map((a: any, idx: number) => ({
        ...a,
        id: a.id || `assump_${Date.now()}_${idx + 1}`,
        status: 'Pending',
      }));
    });

    res.json({ success: true, assumptions: validAssumptions });
  } catch (error: any) {
    console.error('Error generating assumptions:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini free-tier quota is temporarily exhausted. Your campaign data is safe. Please wait a moment and try again.'
        : is503
        ? 'Gemini is temporarily busy. Your campaign data is safe. Please try again in a moment.'
        : error.message || 'Failed to review assumptions',
    });
  }
});

/**
 * 6. Generate 3 Distinct Strategic Directions
 */
app.post('/api/gemini/directions', async (req, res) => {
  try {
    const { brief, brandKit, products, feedbackMemory, campaignReferences, assumptions } = req.body;
    const ai = getGeminiClient();

    // 1. Build compact representations
    const compactBrief = getCompactCampaignBrief(brief || {});
    const compactBrand = getCompactBrandKit(brandKit);
    const compactProducts = getCompactSelectedProducts(brief || {}, products || []);
    const compactFeedback = getCompactFeedbackMemory(brief || {}, feedbackMemory || []);
    const compactReferences = getCompactCampaignReferences(brief || {}, campaignReferences || []);

    const dedupKey = `directions_${compactBrief.name}_${compactBrief.objective}_${compactBrief.productOrService}`;

    const directions = await executeWithInFlightDedup(dedupKey, async () => {
      const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are the Executive Marketing Director for "3 Dimensions" (Infinite Dimensions) 3D Printing in Tunis.
Generate EXACTLY THREE (3) distinct, high-impact strategic campaign directions based on the user's campaign brief.

STRATEGIC MANDATES:
1. Each direction must have a distinct STRATEGIC ANGLE (e.g. "Educational & Process Breakdown", "Technical Proof & Quality", "Problem-Solving & Community Inspiration", "Behind the Scenes Craftsmanship").
2. Core message and concept must be tailored to the product/service, target audience, and Tunisia market context.
3. PRESERVE USER-SELECTED PILLARS: Include the marketer's selected pillars (${JSON.stringify(compactBrief.contentPillars || [])}) in "campaignPillars".
4. You may optionally propose 1 unique "directionSpecificPillar" per direction if it enriches the strategic angle.
5. If Darija or Arabic is requested, use authentic Arabic script with natural technical terms.
6. Return strict JSON with a "directions" array containing exactly 3 direction objects.`;

      const prompt = `CAMPAIGN BRIEF SPECIFICATIONS:
${JSON.stringify(compactBrief, null, 2)}
${compactProducts.length > 0 ? `\nAPPROVED PRODUCT FACTS:\n${JSON.stringify(compactProducts, null, 2)}` : ''}
${compactBrand ? `\nBRAND KIT GUIDELINES:\n${JSON.stringify(compactBrand, null, 2)}` : ''}
${compactReferences.length > 0 ? `\nBENCHMARK REFERENCES:\n${JSON.stringify(compactReferences, null, 2)}` : ''}
${compactFeedback.length > 0 ? `\nSTRATEGY FEEDBACK MEMORY:\n${JSON.stringify(compactFeedback, null, 2)}` : ''}
${assumptions && assumptions.length > 0 ? `\nCONFIRMED ASSUMPTIONS:\n${JSON.stringify(assumptions, null, 2)}` : ''}

Generate 3 distinct strategic directions with different strategic angles.`;

      logGeminiDiagnostics('directions', compactBrief.name, prompt, systemInstruction);

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: GEMINI_CONFIG.model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                directions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      strategicAngle: { type: Type.STRING },
                      title: { type: Type.STRING },
                      concept: { type: Type.STRING },
                      coreMessage: { type: Type.STRING },
                      strategicRationale: { type: Type.STRING },
                      campaignPillars: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      directionSpecificPillar: { type: Type.STRING },
                    },
                    required: ['strategicAngle', 'title', 'concept', 'coreMessage', 'strategicRationale', 'campaignPillars'],
                  },
                },
              },
              required: ['directions'],
            },
          },
        })
      );

      const parsed = JSON.parse(response.text || '{"directions":[]}');
      const userPillars = compactBrief.contentPillars || [];
      return (parsed.directions || []).map((dir: any, idx: number) => ({
        ...dir,
        id: `dir_${Date.now()}_${idx + 1}`,
        directionNumber: idx + 1,
        campaignPillars: dir.campaignPillars && dir.campaignPillars.length > 0 ? dir.campaignPillars : userPillars,
        shortlisted: false,
        selectedForPlan: idx === 0,
        isEdited: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    res.json({ success: true, directions });
  } catch (error: any) {
    console.error('Error generating directions:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini free-tier quota is temporarily exhausted. Your campaign brief is safe. Please wait a moment and click "Try Again".'
        : is503
        ? 'Gemini is temporarily busy. Your campaign brief is safe. Please click "Try Again".'
        : error.message || 'Failed to generate campaign directions',
    });
  }
});

/**
 * 7. Replace Single Strategic Direction
 */
app.post('/api/gemini/replace-direction', async (req, res) => {
  try {
    const { brief, existingDirections, directionIndexToReplace, brandKit, products, feedbackMemory } = req.body;
    const ai = getGeminiClient();

    const compactBrief = getCompactCampaignBrief(brief || {});
    const compactBrand = getCompactBrandKit(brandKit);
    const compactProducts = getCompactSelectedProducts(brief || {}, products || []);
    const compactFeedback = getCompactFeedbackMemory(brief || {}, feedbackMemory || []);

    const otherDirections = (existingDirections || [])
      .filter((_: any, idx: number) => idx !== directionIndexToReplace)
      .map((d: any) => ({ directionNumber: d.directionNumber, angle: d.strategicAngle, title: d.title }));

    const dedupKey = `replace_dir_${compactBrief.name}_idx${directionIndexToReplace}`;

    const newDirection = await executeWithInFlightDedup(dedupKey, async () => {
      const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are generating a SINGLE replacement strategic direction for "3 Dimensions" 3D Printing.
CRITICAL MANDATE:
- The new direction MUST have a completely different Strategic Angle and concept from the other existing directions:
${JSON.stringify(otherDirections)}
- Ground all claims in the user brief and approved knowledge.
- Return a strict JSON object with a single "direction" object.`;

      const prompt = `CAMPAIGN BRIEF SPECIFICATIONS:
${JSON.stringify(compactBrief, null, 2)}
${compactProducts.length > 0 ? `\nAPPROVED PRODUCT FACTS:\n${JSON.stringify(compactProducts, null, 2)}` : ''}
${compactBrand ? `\nBRAND KIT GUIDELINES:\n${JSON.stringify(compactBrand, null, 2)}` : ''}
${compactFeedback.length > 0 ? `\nSTRATEGY FEEDBACK MEMORY:\n${JSON.stringify(compactFeedback, null, 2)}` : ''}

Provide 1 fresh, distinct strategic direction replacing direction #${directionIndexToReplace + 1}.`;

      logGeminiDiagnostics('replace-direction', compactBrief.name, prompt, systemInstruction);

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: GEMINI_CONFIG.model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                direction: {
                  type: Type.OBJECT,
                  properties: {
                    strategicAngle: { type: Type.STRING },
                    title: { type: Type.STRING },
                    concept: { type: Type.STRING },
                    coreMessage: { type: Type.STRING },
                    strategicRationale: { type: Type.STRING },
                    campaignPillars: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    directionSpecificPillar: { type: Type.STRING },
                  },
                  required: ['strategicAngle', 'title', 'concept', 'coreMessage', 'strategicRationale', 'campaignPillars'],
                },
              },
              required: ['direction'],
            },
          },
        })
      );

      const parsed = JSON.parse(response.text || '{}');
      const dir = parsed.direction || {};
      return {
        ...dir,
        id: `dir_${Date.now()}_replaced`,
        directionNumber: directionIndexToReplace + 1,
        campaignPillars: dir.campaignPillars || compactBrief.contentPillars || [],
        isReplacement: true,
        shortlisted: false,
        selectedForPlan: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    res.json({ success: true, direction: newDirection });
  } catch (error: any) {
    console.error('Error replacing direction:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini quota reached. Your directions are safe. Please wait a moment and try again.'
        : is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to replace direction',
    });
  }
});

/**
 * 8. Combine Two Shortlisted Directions into a Hybrid Proposal
 */
app.post('/api/gemini/combine-directions', async (req, res) => {
  try {
    const { brief, direction1, direction2, brandKit } = req.body;
    const ai = getGeminiClient();

    const compactBrief = getCompactCampaignBrief(brief || {});
    const compactBrand = getCompactBrandKit(brandKit);
    const compactDir1 = getCompactSelectedDirection(direction1);
    const compactDir2 = getCompactSelectedDirection(direction2);

    const dedupKey = `combine_dir_${direction1.id}_${direction2.id}`;

    const formattedHybrid = await executeWithInFlightDedup(dedupKey, async () => {
      const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are synthesizing TWO shortlisted strategic directions for "3 Dimensions" into a cohesive, superior HYBRID strategic proposal.
MANDATE:
- Synthesize the strengths of Direction 1 ("${compactDir1?.title}") and Direction 2 ("${compactDir2?.title}").
- Create a harmonious unified angle, concept, core message, and rationale.
- Return a strict JSON object with "hybridDirection".`;

      const prompt = `Direction 1:
${JSON.stringify(compactDir1, null, 2)}

Direction 2:
${JSON.stringify(compactDir2, null, 2)}

Brief Context:
${JSON.stringify(compactBrief, null, 2)}
${compactBrand ? `\nBrand Kit Guidelines:\n${JSON.stringify(compactBrand, null, 2)}` : ''}

Generate the synthesized hybrid proposal.`;

      logGeminiDiagnostics('combine-directions', compactBrief.name, prompt, systemInstruction);

      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: GEMINI_CONFIG.model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                hybridDirection: {
                  type: Type.OBJECT,
                  properties: {
                    strategicAngle: { type: Type.STRING },
                    title: { type: Type.STRING },
                    concept: { type: Type.STRING },
                    coreMessage: { type: Type.STRING },
                    strategicRationale: { type: Type.STRING },
                    campaignPillars: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    directionSpecificPillar: { type: Type.STRING },
                  },
                  required: ['strategicAngle', 'title', 'concept', 'coreMessage', 'strategicRationale', 'campaignPillars'],
                },
              },
              required: ['hybridDirection'],
            },
          },
        })
      );

      const parsed = JSON.parse(response.text || '{}');
      const hybrid = parsed.hybridDirection || {};
      return {
        ...hybrid,
        id: `dir_${Date.now()}_hybrid`,
        directionNumber: 4,
        isHybrid: true,
        sourceDirectionIds: [direction1.id, direction2.id],
        shortlisted: true,
        selectedForPlan: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    res.json({ success: true, hybridDirection: formattedHybrid });
  } catch (error: any) {
    console.error('Error combining directions:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini quota reached. Your selections are safe. Please wait a moment and try again.'
        : is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to combine directions',
    });
  }
});

/**
 * 2. Suggest Content Pillars with Strict Context Grounding
 */
app.post('/api/gemini/suggest-pillars', async (req, res) => {
  try {
    const {
      type,
      audienceSegment,
      objective,
      productOrService,
      targetAudience,
      language,
      platforms,
      existingPillars,
      rejectedPillars,
      additionalInstructions,
      brandKit,
      products,
      campaignReferences,
    } = req.body;

    const ai = getGeminiClient();

    const compactBrand = getCompactBrandKit(brandKit);
    const compactProducts = getCompactSelectedProducts({ productOrService }, products || []);
    const compactReferences = getCompactCampaignReferences({ selectedReferenceIds: [] }, campaignReferences || []);

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are a senior brand strategist for "3 Dimensions" (Infinite Dimensions) 3D Printing in Tunis.
Generate THREE (3) fresh, complementary, highly grounded strategic content pillars specifically for the current campaign brief context.

STRICT GROUNDING & RELEVANCE RULES:
1. Prioritize the current campaign brief details (Product/Service, Objective, Target Audience, Audience Segment, Campaign Type) over generic 3D printing ideas.
2. DO NOT infer or claim that 3 Dimensions offers any specific service, material, use case, technical tolerance, or capability UNLESS explicitly stated in the current brief or the approved company knowledge below.
3. If approved company knowledge (Brand Kit / Catalog) is empty or minimal, keep suggestions strictly grounded in the user-provided Product/Service ("${productOrService || '3D Printing'}") and Objective ("${objective || 'Campaign Objective'}").
4. Generate EXACTLY THREE (3) new complementary content pillars that directly support the objective.
5. DO NOT suggest any pillar that overlaps with or is already present in existing pillars: ${JSON.stringify(existingPillars || [])}.
6. DO NOT suggest any pillar that has been previously rejected or removed by the user: ${JSON.stringify(rejectedPillars || [])}.
7. Return strict JSON object with a "pillars" array containing objects with "title" (concise 3-6 word theme) and "rationale" (1 sentence explanation).`;

    const prompt = `CURRENT CAMPAIGN BRIEF CONTEXT:
- Campaign Type: ${type || 'Standard Marketing Campaign'}
- Audience Segment: ${audienceSegment || 'Both'}
- Product / Service: ${productOrService || '3D Printing'}
- Primary Objective: ${objective || ''}
- Target Audience Description: ${targetAudience || ''}
- Target Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms || 'Instagram, Facebook'}
- Language: ${language || 'English & Darija'}
${additionalInstructions ? `- Additional Creative Directives: ${additionalInstructions}` : ''}
${compactBrand ? `\nAPPROVED BRAND KIT:\n${JSON.stringify(compactBrand, null, 2)}` : ''}
${compactProducts.length > 0 ? `\nAPPROVED PRODUCTS/SERVICES:\n${JSON.stringify(compactProducts, null, 2)}` : ''}
${compactReferences.length > 0 ? `\nBENCHMARK REFERENCES:\n${JSON.stringify(compactReferences, null, 2)}` : ''}

EXISTING & REJECTED PILLARS (DO NOT REPEAT):
- Existing Pillars: ${JSON.stringify(existingPillars || [])}
- Rejected / Removed Pillars: ${JSON.stringify(rejectedPillars || [])}

Generate 3 fresh, complementary, non-duplicate content pillars strictly grounded in this context.`;

    logGeminiDiagnostics('suggest-pillars', undefined, prompt, systemInstruction);

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              pillars: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                  },
                  required: ['title', 'rationale'],
                },
              },
            },
            required: ['pillars'],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{"pillars":[]}');
    res.json({ success: true, pillars: parsed.pillars || [] });
  } catch (error: any) {
    console.error('Error suggesting pillars:', error);
    const is429 = error?.status === 429 || error?.is429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.is503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is429 ? 429 : is503 ? 503 : 500).json({
      success: false,
      is429,
      is503,
      error: is429
        ? 'Gemini quota reached. Your selections are safe. Please wait a moment and try again.'
        : is503
        ? 'Gemini is temporarily busy. Please try again in a moment.'
        : error.message || 'Failed to suggest content pillars',
    });
  }
});

/**
 * 3. Generate Detailed Campaign Plan
 */
app.post('/api/gemini/plan', async (req, res) => {
  try {
    const { brief, selectedDirection, brandKit, products, feedbackMemory, campaignReferences } = req.body;
    const ai = getGeminiClient();

    // 1. Build compact representations
    const compactBrief = getCompactCampaignBrief(brief);
    const compactSelectedDirection = getCompactSelectedDirection(selectedDirection);
    const compactBrand = getCompactBrandKit(brandKit);
    const compactProducts = getCompactSelectedProducts(brief, products);
    const compactFeedback = getCompactFeedbackMemory(brief, feedbackMemory);
    const compactReferences = getCompactCampaignReferences(brief, campaignReferences);

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are the senior marketing strategist for "3 Dimensions" 3D printing company in Tunis.
Generate a comprehensive, detailed campaign plan and full content calendar matching the SINGLE selected direction provided.

STRICT CALENDAR & GROUNDING MANDATES:
1. Every calendar item date MUST be strictly between ${compactBrief.startDate} and ${compactBrief.endDate} inclusive. NEVER schedule posts before ${compactBrief.startDate} or after ${compactBrief.endDate}.
2. Recommend a realistic, thoughtful posting cadence in "recommendedCadence" ({ totalPrimaryPosts, reels, carousels, feedPosts, stories, rationale }). Do NOT output an excessive number of primary feed posts if not warranted.
3. PRESERVE USER CONTENT PILLARS: User specified pillars: ${JSON.stringify(compactBrief.contentPillars || [])}.
4. FACTUAL STATUS ASSIGNMENT: For any concept, claim, or topic depending on unverified company capabilities, set factualStatus: "requires_confirmation". Otherwise set "grounded" or "creative".
5. PRODUCTION BRIEFS: Use conditional wording for physical assets or equipment ("Close-up of 3D printing process, if available").`;

    const prompt = `SELECTED STRATEGIC DIRECTION (Authoritative Angle):
${JSON.stringify(compactSelectedDirection, null, 2)}

CAMPAIGN BRIEF SPECIFICATIONS:
${JSON.stringify(compactBrief, null, 2)}
${compactProducts.length > 0 ? `\nAPPROVED PRODUCT/SERVICE FACTS:\n${JSON.stringify(compactProducts, null, 2)}` : ''}
${compactBrand ? `\nBRAND KIT GUIDELINES:\n${JSON.stringify(compactBrand, null, 2)}` : ''}
${compactReferences.length > 0 ? `\nBENCHMARK REFERENCES:\n${JSON.stringify(compactReferences, null, 2)}` : ''}
${compactFeedback.length > 0 ? `\nSTRATEGY FEEDBACK MEMORY:\n${JSON.stringify(compactFeedback, null, 2)}` : ''}

Generate a complete JSON object for the Campaign Plan containing:
- concept: string
- coreMessage: string
- valueProposition: string
- factualStatus: "grounded" | "creative" | "requires_confirmation"
- contentPillars: string[] (preserve user pillars: ${JSON.stringify(compactBrief.contentPillars || [])})
- recommendedCadence: { totalPrimaryPosts: number, reels: number, carousels: number, feedPosts: number, stories: number, rationale: string }
- recommendedFormats: string[]
- contentMixRationale: string
- productionEffortEstimate: string
- visualDirection: string
- designerBrief: string
- videographerBrief: string
- shotList: string[]
- hooksAndCTAs: Array<{ hook: string, cta: string, format: string }>
- hashtags: string[]
- suggestedKPIs: string[]
- postPublicationRecommendations: string
- calendar: Array of Calendar items with fields:
  (id, date, platform, format, topic, hook, caption, cta, status, productionDeadline, reelScript, visualNotes, hashtags, factualStatus)`;

    // 2. Token Count Preflight Audit
    let inputTokens = 0;
    try {
      const tokenCountResult = await ai.models.countTokens({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
        },
      });
      inputTokens = tokenCountResult.totalTokens || 0;
    } catch (tokenErr) {
      console.warn('Token count preflight warning:', tokenErr);
    }

    console.log(`[PLAN TOKEN AUDIT]`);
    console.log(`inputTokens: ${inputTokens}`);
    console.log(`briefIncluded: true`);
    console.log(`brandFieldsIncluded: ${compactBrand ? Object.keys(compactBrand).length : 0}`);
    console.log(`productsIncluded: ${compactProducts.length}`);
    console.log(`referencesIncluded: ${compactReferences.length}`);
    console.log(`feedbackIncluded: ${compactFeedback.length}`);
    console.log(`directionsIncluded: 1`);
    console.log(`metaRowsIncluded: 0`);

    // 3. Safety threshold guard against abnormally oversized requests
    const MAX_ALLOWED_INPUT_TOKENS = 50000;
    if (inputTokens > MAX_ALLOWED_INPUT_TOKENS) {
      console.error(`[PLAN TOKEN AUDIT ERROR] Payload inputTokens (${inputTokens}) exceeds maximum safety threshold (${MAX_ALLOWED_INPUT_TOKENS}).`);
      return res.status(400).json({
        success: false,
        error: `Campaign plan payload exceeds input token threshold (${inputTokens} tokens). Please reduce custom text length before proceeding.`,
      });
    }

    // 4. Exactly one single generation request
    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concept: { type: Type.STRING },
              coreMessage: { type: Type.STRING },
              valueProposition: { type: Type.STRING },
              factualStatus: { type: Type.STRING, enum: ['grounded', 'creative', 'requires_confirmation'] },
              contentPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedCadence: {
                type: Type.OBJECT,
                properties: {
                  totalPrimaryPosts: { type: Type.INTEGER },
                  reels: { type: Type.INTEGER },
                  carousels: { type: Type.INTEGER },
                  feedPosts: { type: Type.INTEGER },
                  stories: { type: Type.INTEGER },
                  rationale: { type: Type.STRING },
                },
                required: ['totalPrimaryPosts', 'reels', 'carousels', 'feedPosts', 'stories', 'rationale'],
              },
              recommendedFormats: { type: Type.ARRAY, items: { type: Type.STRING } },
              contentMixRationale: { type: Type.STRING },
              productionEffortEstimate: { type: Type.STRING },
              visualDirection: { type: Type.STRING },
              designerBrief: { type: Type.STRING },
              videographerBrief: { type: Type.STRING },
              shotList: { type: Type.ARRAY, items: { type: Type.STRING } },
              hooksAndCTAs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    hook: { type: Type.STRING },
                    cta: { type: Type.STRING },
                    format: { type: Type.STRING },
                  },
                  required: ['hook', 'cta', 'format'],
                },
              },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedKPIs: { type: Type.ARRAY, items: { type: Type.STRING } },
              postPublicationRecommendations: { type: Type.STRING },
              calendar: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    date: { type: Type.STRING },
                    platform: { type: Type.STRING },
                    format: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    hook: { type: Type.STRING },
                    caption: { type: Type.STRING },
                    cta: { type: Type.STRING },
                    status: { type: Type.STRING },
                    productionDeadline: { type: Type.STRING },
                    reelScript: { type: Type.STRING },
                    visualNotes: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    factualStatus: { type: Type.STRING, enum: ['grounded', 'creative', 'requires_confirmation'] },
                  },
                  required: ['date', 'platform', 'format', 'topic', 'hook', 'caption', 'cta'],
                },
              },
            },
            required: [
              'concept',
              'coreMessage',
              'valueProposition',
              'contentPillars',
              'recommendedCadence',
              'recommendedFormats',
              'visualDirection',
              'designerBrief',
              'videographerBrief',
              'calendar',
            ],
          },
        },
      })
    );

    const planData = JSON.parse(response.text || '{}');
    const validatedPlan = validateAndRepairCampaignPlan(planData, brief);
    res.json({ success: true, plan: validatedPlan });
  } catch (error: any) {
    console.error('Error generating campaign plan:', error);
    const is429 =
      error?.status === 429 ||
      error?.code === 429 ||
      error?.message?.includes('429') ||
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('Quota') ||
      error?.message?.includes('token count');

    const is503 =
      error?.status === 503 ||
      error?.code === 503 ||
      error?.message?.includes('503') ||
      error?.message?.includes('UNAVAILABLE') ||
      error?.message?.includes('overloaded');

    if (is429) {
      return res.status(429).json({
        success: false,
        is429: true,
        error: 'Gemini free-tier token quota reached. Please wait a few seconds before trying again.',
      });
    }

    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503
        ? 'Gemini is temporarily unavailable due to high demand. Your campaign brief and selected direction have been saved. Please click "Try Again" to generate the plan.'
        : error.message || 'Failed to generate detailed plan',
    });
  }
});

/**
 * 4. Regenerate Single Component with Locked Components Protection
 */
app.post('/api/gemini/regenerate-component', async (req, res) => {
  try {
    const { brief, currentPlan, componentKey, lockedKeys, userInstructions } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are refining a single component ("${componentKey}") of an existing campaign plan for "3 Dimensions" 3D Printing.
CRITICAL MANDATE:
- Do NOT alter any locked components: ${JSON.stringify(lockedKeys)}.
- Focus purely on regenerating and elevating "${componentKey}".
- User feedback / specific instructions: ${userInstructions || 'Elevate impact and freshness.'}
- Return strict JSON object containing updated field for "${componentKey}".`;

    const prompt = `Current Plan Context:
Concept: ${currentPlan.concept}
Core Message: ${currentPlan.coreMessage}
Target Component to Regenerate: ${componentKey}
Current Component Value: ${JSON.stringify(currentPlan[componentKey] || currentPlan.components?.[componentKey])}

Provide updated output for "${componentKey}" as valid JSON object { "${componentKey}": <newValue> }.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      })
    );

    const updatedObj = JSON.parse(response.text || '{}');
    res.json({ success: true, updatedComponent: updatedObj[componentKey] ?? updatedObj });
  } catch (error: any) {
    console.error('Error regenerating component:', error);
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503
        ? 'Gemini is temporarily busy. Please try again in a moment.'
        : error.message || 'Failed to regenerate component',
    });
  }
});

/**
 * 5. Generate Detailed Structured Reel / Video Script
 * Highly token-efficient: transmits only target Reel specifications and grounding essentials.
 */
app.post('/api/gemini/reel-script', async (req, res) => {
  try {
    const {
      campaignName,
      objective,
      audience,
      languages,
      platform,
      tone,
      contentPillar,
      strategicDirection,
      topic,
      hook,
      caption,
      cta,
      approvedProducts,
      creativeDirectives,
      availableResources,
      currentScriptText,
      feedbackMemory,
    } = req.body;

    const ai = getGeminiClient();

    // Compact feedback memory
    const compactFeedback = getCompactFeedbackMemory(
      {
        format: 'Reel / Video',
        audienceSegment: audience,
        platform,
        languages,
      },
      feedbackMemory || []
    );

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are an expert video director, industrial videographer, and creative marketing copywriter for "3 Dimensions" (a precision 3D printing, prototyping, and additive manufacturing company in Tunisia).
Your task is to generate a comprehensive, production-ready, timestamped video shot breakdown for a single Reel / short-form Video item.

PRODUCTION SCRIPT MANDATES:
1. ABSOLUTE BAN ON PLACEHOLDERS:
   - Do NOT output placeholder text, instructions, or meta-descriptions like "Describe visual scene...", "Tunisian narration...", "Add camera note...", "Visual 1", "Dialogue goes here", or "Scene breakdown".
   - Every single column for EVERY segment MUST be filled with concrete, filming-ready and spoken-dialogue content.

2. TOTAL DURATION & TIMED SEGMENTS:
   - Total duration: 15 to 30 seconds.
   - Generate 3 to 7 sequential timed segments (e.g. 00:00–00:04, 00:04–00:08, 00:08–00:15, 00:15–00:22).
   - Timestamps MUST start at 00:00, be chronological, and never overlap.

3. PRODUCTION SCRIPT COLUMNS:
   - startTime: MM:SS format (e.g. "00:00").
   - endTime: MM:SS format (e.g. "00:04").
   - visual: Detailed, concrete visual direction of what is on camera (e.g. "Close-up macro of 3D printer nozzle extruding molten filament layer-by-layer on the build plate", "Engineer holding a freshly cured resin prototype inspecting mechanical fit with a digital caliper").
   - voiceover: The EXACT spoken dialogue in authentic Tunisian Darija written in Arabic script (e.g. "من الفكرة والتصميم... حتى للقطعة الحقيقية في يدك في أقل من 48 ساعة!"). Naturally blend established technical and engineering terms (e.g. "3D printing", "prototypage", "CAO", "SLA", "FDM", "tolérances", "sur mesure") where appropriate for engineering, designer, or business audiences.
   - onScreenText: Concise, punchy on-screen text overlay in English (or French/Darija) for high-contrast mobile engagement (e.g. "From CAD File to Physical Part", "Precision Tolerances ±0.1mm", "Fast Hardware Prototyping in Tunisia").
   - cameraNotes: Practical videographer production notes (e.g. "Macro 4K lens, slow push-in, shallow depth of field", "Over-the-shoulder CAD screen to print bed", "Top-down 45° turntable rotation", "Fast whip-pan transition").

4. GROUNDING INTEGRITY:
   - Ground all details strictly on 3 Dimensions' capabilities and approved products/services.
   - Do not invent fictional certifications or unconfirmed proprietary machines.`;

    const prompt = `TARGET REEL ITEM SPECIFICATIONS:
Topic / Title: ${topic || 'Hardware Prototyping Showcase'}
Opening Hook: ${hook || ''}
Existing Caption Copy: ${caption || ''}
Call to Action (CTA): ${cta || 'Send us your project idea'}
Platform: ${platform || 'Meta / Instagram Reels'}
Target Audience: ${audience || 'Engineers, industrial designers, hardware startups in Tunisia'}
Campaign Objective & Core Angle: ${objective || ''}
Content Pillar: ${contentPillar || ''}
Strategic Direction: ${strategicDirection || ''}
Campaign Tone: ${Array.isArray(tone) ? tone.join(', ') : tone || 'Professional & Technical'}
Languages: ${Array.isArray(languages) ? languages.join(', ') : languages || 'Tunisian Darija & English'}
${currentScriptText ? `\nEXISTING SCRIPT / NOTES / DRAFT:\n${currentScriptText}` : ''}
${creativeDirectives ? `\nCREATIVE / VIDEOGRAPHER DIRECTIVES:\n${creativeDirectives}` : ''}
${approvedProducts && approvedProducts.length > 0 ? `\nAPPROVED PRODUCT FACTS:\n${JSON.stringify(approvedProducts)}` : ''}
${availableResources ? `\nAVAILABLE RESOURCES:\n${JSON.stringify(availableResources)}` : ''}
${compactFeedback.length > 0 ? `\nRELEVANT REUSABLE HUMAN PREFERENCES (FEEDBACK MEMORY):\n${compactFeedback.map((f: any) => f.formatted || `- [${f.type}] ${f.instruction}`).join('\n')}` : ''}

Generate a production-ready JSON object with totalDurationSeconds and complete scriptSegments.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              totalDurationSeconds: { type: Type.INTEGER },
              factualStatus: { type: Type.STRING, enum: ['grounded', 'creative', 'requires_confirmation'] },
              scriptSegments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    startTime: { type: Type.STRING },
                    endTime: { type: Type.STRING },
                    visual: { type: Type.STRING },
                    voiceover: { type: Type.STRING },
                    onScreenText: { type: Type.STRING },
                    cameraNotes: { type: Type.STRING },
                  },
                  required: ['startTime', 'endTime', 'visual', 'voiceover', 'onScreenText', 'cameraNotes'],
                },
              },
            },
            required: ['totalDurationSeconds', 'scriptSegments'],
          },
        },
      })
    );

    const data = JSON.parse(response.text || '{}');
    // Ensure segment IDs exist
    const segments = (data.scriptSegments || []).map((seg: any, idx: number) => ({
      ...seg,
      id: seg.id || `seg_${Date.now()}_${idx + 1}`,
    }));

    res.json({
      success: true,
      totalDurationSeconds: data.totalDurationSeconds || 20,
      factualStatus: data.factualStatus || 'grounded',
      scriptSegments: segments,
    });
  } catch (error: any) {
    console.error('Error generating structured Reel script:', error);
    const is429 = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');

    if (is429) {
      return res.status(429).json({
        success: false,
        is429: true,
        error: 'Gemini rate limit reached. Please wait a few moments and try again.',
      });
    }

    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to generate structured script',
    });
  }
});

// Generate format-specific structured Carousel slides
app.post('/api/gemini/carousel-slides', async (req, res) => {
  try {
    const {
      campaignName,
      objective,
      audience,
      languages,
      platform,
      tone,
      contentPillar,
      strategicDirection,
      topic,
      hook,
      caption,
      cta,
      approvedProducts,
      creativeDirectives,
      availableResources,
      currentNotes,
      feedbackMemory,
    } = req.body;

    const ai = getGeminiClient();

    // Compact feedback memory prioritized for Carousel
    const compactFeedback = getCompactFeedbackMemory(
      {
        format: 'Carousel',
        audienceSegment: audience,
        platform,
        languages,
      },
      feedbackMemory || []
    );

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are an expert social media creative director, visual designer, and technical copywriter for "3 Dimensions" (a precision 3D printing and rapid prototyping company in Tunisia).
Your task is to generate a comprehensive, slide-by-slide production breakdown for a single social media Carousel post.

CAROUSEL PRODUCTION SPECIFICATIONS:
1. ABSOLUTE BAN ON PLACEHOLDERS:
   - Do NOT output placeholder copy such as "Add headline", "Describe visual", "Insert copy", "Slide 1 text", or "Visual goes here".
   - Every single field for EVERY slide MUST contain concrete, finalized copy and clear visual art direction ready for graphic design.

2. SLIDE STRUCTURE & LOGICAL FLOW:
   - Generate approximately 4 to 7 sequential slides.
   - Slide 1 (Cover / Hook): Catchy headline, high-contrast hook text, arresting visual setup.
   - Middle Slides (Problem / Solution / Showcase / Tech Specs / Before & After): Educational or value-packed progression.
   - Final Slide (CTA): Clear call-to-action slide guiding the user to comment, message, or visit the website.

3. REQUIRED SLIDE FIELDS:
   - slideNumber: 1-based integer.
   - purpose: e.g. "Cover / Hook", "Problem Context", "Manufacturing Comparison", "Material & Precision Specs", "Customer Result", "Final CTA".
   - headline: Punchy, high-impact headline for the slide (in Tunisian Darija Arabic script or English).
   - bodyCopy: Concise, readable supporting text (1-3 sentences).
   - visualDirection: Explicit, practical visual instruction for the graphic designer (e.g. "3D exploded render of assembled gears", "Macro photo highlighting smooth matte surface finish", "Side-by-side CAD model vs 3D printed part").
   - onSlideText: Punchy overlay text, stat callouts, or bullet points to be rendered directly onto the slide graphic.

4. CULTURAL & TECHNICAL TONE:
   - If Tunisian Darija is selected, write authentic Darija in clean Arabic script, naturally incorporating accepted engineering/business terms (e.g. "3D printing", "prototypage", "CAO", "SLA", "FDM", "sur mesure", "finition").
   - Ground all technical claims strictly on 3 Dimensions' capabilities and approved products.`;

    const prompt = `TARGET CAROUSEL ITEM SPECIFICATIONS:
Topic / Title: ${topic || '3D Printing Precision Showcase'}
Opening Hook: ${hook || ''}
Existing Caption Copy: ${caption || ''}
Call to Action (CTA): ${cta || 'Send us your CAD file for a free prototype review'}
Platform: ${platform || 'Instagram / LinkedIn / Facebook'}
Target Audience: ${audience || 'Designers, mechanical engineers, and hardware builders in Tunisia'}
Campaign Objective: ${objective || ''}
Content Pillar: ${contentPillar || ''}
Strategic Direction: ${strategicDirection || ''}
Campaign Tone: ${Array.isArray(tone) ? tone.join(', ') : tone || 'Professional & Educational'}
Languages: ${Array.isArray(languages) ? languages.join(', ') : languages || 'Tunisian Darija & English'}
${currentNotes ? `\nEXISTING NOTES / DRAFT:\n${currentNotes}` : ''}
${creativeDirectives ? `\nCREATIVE / DESIGNER DIRECTIVES:\n${creativeDirectives}` : ''}
${approvedProducts && approvedProducts.length > 0 ? `\nAPPROVED PRODUCT FACTS:\n${JSON.stringify(approvedProducts)}` : ''}
${availableResources ? `\nAVAILABLE RESOURCES:\n${JSON.stringify(availableResources)}` : ''}
${compactFeedback.length > 0 ? `\nRELEVANT REUSABLE HUMAN PREFERENCES (FEEDBACK MEMORY):\n${compactFeedback.map((f: any) => f.formatted || `- [${f.type}] ${f.instruction}`).join('\n')}` : ''}

Generate a production-ready JSON object with factualStatus and complete carouselSlides.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              factualStatus: { type: Type.STRING, enum: ['grounded', 'creative', 'requires_confirmation'] },
              carouselSlides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    slideNumber: { type: Type.INTEGER },
                    purpose: { type: Type.STRING },
                    headline: { type: Type.STRING },
                    bodyCopy: { type: Type.STRING },
                    visualDirection: { type: Type.STRING },
                    onSlideText: { type: Type.STRING },
                  },
                  required: ['slideNumber', 'purpose', 'headline', 'bodyCopy', 'visualDirection', 'onSlideText'],
                },
              },
            },
            required: ['carouselSlides'],
          },
        },
      })
    );

    const data = JSON.parse(response.text || '{}');
    const slides = (data.carouselSlides || []).map((s: any, idx: number) => ({
      ...s,
      id: s.id || `slide_${Date.now()}_${idx + 1}`,
      slideNumber: idx + 1,
    }));

    res.json({
      success: true,
      factualStatus: data.factualStatus || 'grounded',
      carouselSlides: slides,
    });
  } catch (error: any) {
    console.error('Error generating structured Carousel slides:', error);
    const is429 = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');

    if (is429) {
      return res.status(429).json({
        success: false,
        is429: true,
        error: 'Gemini rate limit reached. Please wait a few moments and try again.',
      });
    }

    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to generate carousel slides',
    });
  }
});

// Generate format-specific structured Story frames
app.post('/api/gemini/story-frames', async (req, res) => {
  try {
    const {
      campaignName,
      objective,
      audience,
      languages,
      platform,
      tone,
      contentPillar,
      strategicDirection,
      topic,
      hook,
      caption,
      cta,
      approvedProducts,
      creativeDirectives,
      availableResources,
      currentNotes,
      feedbackMemory,
    } = req.body;

    const ai = getGeminiClient();

    // Compact feedback memory prioritized for Story
    const compactFeedback = getCompactFeedbackMemory(
      {
        format: 'Story',
        audienceSegment: audience,
        platform,
        languages,
      },
      feedbackMemory || []
    );

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are an expert social media manager, mobile content creator, and interactive story specialist for "3 Dimensions" (a Tunisian 3D printing and prototyping company).
Your task is to generate a vertical (9:16) frame-by-frame Story plan for a single Instagram/Facebook Story sequence.

STORY PRODUCTION SPECIFICATIONS:
1. ABSOLUTE BAN ON PLACEHOLDERS:
   - Do NOT output placeholder text such as "Insert visual", "Add text", "Poll here", or "Story frame 1".
   - Every frame must contain concrete, engaging, filming/production-ready instructions and finalized text.

2. VERTICAL STORY FLOW:
   - Generate approximately 3 to 5 sequential frames.
   - Frame 1: Hook / Curiosity / Behind-the-scenes spark to stop users from tapping through.
   - Middle Frames: Quick showcase / feature demonstration / process reveal.
   - Interactive & CTA Frame: Poll / Question box / Emoji slider / Link sticker or DM trigger.

3. REQUIRED FRAME FIELDS:
   - frameNumber: 1-based integer.
   - purpose: e.g. "Hook / Question", "Behind the Scenes", "Feature Highlight", "Interactive Poll", "Swipe Up / DM CTA".
   - visualDirection: Vertical 9:16 visual direction (e.g. "Close-up phone camera footage peeling support material from an SLA prototype", "Engineer holding digital caliper next to print bed").
   - onScreenText: Short, high-contrast mobile text overlay (readable in <3 seconds).
   - interactionElement: One of ["None", "Poll", "Question", "Slider", "Link / CTA"].
   - cta: Action prompt if applicable (e.g. "Vote in the poll below", "DM us '3D' for our portfolio", "Swipe up for specs").
   - notes: Audio, sound effect, sticker placement, or production tip (e.g. "Upbeat lo-fi audio, place sticker in lower third").

4. LANGUAGE & CULTURAL TONE:
   - Authentic Tunisian Darija in Arabic script or English, using familiar technical terminology seamlessly.`;

    const prompt = `TARGET STORY ITEM SPECIFICATIONS:
Topic / Title: ${topic || 'Daily 3D Print Behind The Scenes'}
Opening Hook: ${hook || ''}
Existing Caption / Notes: ${caption || ''}
Call to Action (CTA): ${cta || 'DM us your project'}
Platform: ${platform || 'Instagram Stories / Facebook Stories'}
Target Audience: ${audience || 'Makers, engineers, students, and businesses in Tunisia'}
Campaign Objective: ${objective || ''}
Content Pillar: ${contentPillar || ''}
Strategic Direction: ${strategicDirection || ''}
Campaign Tone: ${Array.isArray(tone) ? tone.join(', ') : tone || 'Casual & Direct'}
Languages: ${Array.isArray(languages) ? languages.join(', ') : languages || 'Tunisian Darija & English'}
${currentNotes ? `\nEXISTING NOTES / DRAFT:\n${currentNotes}` : ''}
${creativeDirectives ? `\nCREATIVE DIRECTIVES:\n${creativeDirectives}` : ''}
${approvedProducts && approvedProducts.length > 0 ? `\nAPPROVED PRODUCT FACTS:\n${JSON.stringify(approvedProducts)}` : ''}
${availableResources ? `\nAVAILABLE RESOURCES:\n${JSON.stringify(availableResources)}` : ''}
${compactFeedback.length > 0 ? `\nRELEVANT REUSABLE HUMAN PREFERENCES (FEEDBACK MEMORY):\n${compactFeedback.map((f: any) => f.formatted || `- [${f.type}] ${f.instruction}`).join('\n')}` : ''}

Generate a production-ready JSON object with factualStatus and complete storyFrames.`;

    const response = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_CONFIG.model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              factualStatus: { type: Type.STRING, enum: ['grounded', 'creative', 'requires_confirmation'] },
              storyFrames: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    frameNumber: { type: Type.INTEGER },
                    purpose: { type: Type.STRING },
                    visualDirection: { type: Type.STRING },
                    onScreenText: { type: Type.STRING },
                    interactionElement: { type: Type.STRING, enum: ['None', 'Poll', 'Question', 'Slider', 'Link / CTA'] },
                    cta: { type: Type.STRING },
                    notes: { type: Type.STRING },
                  },
                  required: ['frameNumber', 'purpose', 'visualDirection', 'onScreenText', 'interactionElement'],
                },
              },
            },
            required: ['storyFrames'],
          },
        },
      })
    );

    const data = JSON.parse(response.text || '{}');
    const frames = (data.storyFrames || []).map((f: any, idx: number) => ({
      ...f,
      id: f.id || `frame_${Date.now()}_${idx + 1}`,
      frameNumber: idx + 1,
      interactionElement: f.interactionElement || 'None',
      cta: f.cta || '',
      notes: f.notes || '',
    }));

    res.json({
      success: true,
      factualStatus: data.factualStatus || 'grounded',
      storyFrames: frames,
    });
  } catch (error: any) {
    console.error('Error generating structured Story frames:', error);
    const is429 = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');

    if (is429) {
      return res.status(429).json({
        success: false,
        is429: true,
        error: 'Gemini rate limit reached. Please wait a few moments and try again.',
      });
    }

    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503
        ? 'Gemini is temporarily busy. Please try again.'
        : error.message || 'Failed to generate story frames',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

