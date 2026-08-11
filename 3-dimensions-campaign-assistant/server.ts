import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { validateAndRepairCampaignPlan } from './src/utils/planValidation.js';

// Polyfill directory context safely for both ESM/CJS runtime environments
const appDir = process.cwd();

const app = express();
const PORT = 3000;

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
 * Exponential backoff retry handler for Gemini API calls
 * Retries up to 3 times for 503 / UNAVAILABLE / overloaded errors with delays ~1s, 2s, 4s.
 */
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelayMs = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      attempt++;
      return await fn();
    } catch (err: any) {
      const is503OrBusy =
        err?.status === 503 ||
        err?.code === 503 ||
        (err?.message && (
          err.message.includes('503') ||
          err.message.includes('UNAVAILABLE') ||
          err.message.includes('overloaded') ||
          err.message.includes('high demand') ||
          err.message.includes('resource exhausted') ||
          err.message.includes('Service Unavailable')
        ));

      if (is503OrBusy && attempt < maxAttempts) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s
        console.warn(`Gemini API 503/Busy (Attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Gemini API request failed after maximum retry attempts.');
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
 * 1. Generate 3 Distinct Campaign Directions
 */
app.post('/api/gemini/directions', async (req, res) => {
  try {
    const { brief, brandKit, feedbackMemory, campaignReferences } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are a world-class Marketing Director and Brand Strategist for "3 Dimensions" (Infinite Dimensions), a premier 3D-printing and digital fabrication company in Tunis, Tunisia.
Your job is to generate THREE (3) genuinely distinct, strategic campaign directions based on the user's campaign brief.

Key Strategic Requirements:
1. Provide THREE distinct strategic angles (e.g., Angle 1: Educational / Expertise-Led & Process, Angle 2: Technical Proof & B2B/Quality Focus, Angle 3: Storytelling & Community/Promo Hook).
2. Format must be strict valid JSON object containing an array "directions" with exactly 3 direction objects.
3. Support the requested language: ${brief.language || 'English & Darija'}.
4. If generating Tunisian Darija, write in Arabic script and retain natural English/French tech terms.

Brand Kit Context:
${brandKit ? JSON.stringify(brandKit) : 'No custom brand kit provided.'}

Benchmark Campaign References:
${campaignReferences && campaignReferences.length > 0 ? JSON.stringify(campaignReferences) : 'No references supplied.'}

Feedback Memory Context:
${feedbackMemory && feedbackMemory.length > 0 ? JSON.stringify(feedbackMemory) : 'No prior feedback recorded.'}`;

    const prompt = `Campaign Brief Details:
- Name: ${brief.name}
- Objective: ${brief.objective}
- Type: ${brief.type}
- Audience Segment: ${brief.audienceSegment}
- Product/Service: ${brief.productOrService}
- Target Audience: ${brief.targetAudience} (${brief.audienceAge || 'N/A'})
- Dates: ${brief.startDate} to ${brief.endDate} (${brief.durationDays} days)
- Platforms: ${Array.isArray(brief.platforms) ? brief.platforms.join(', ') : brief.platforms}
- Language: ${brief.language}
- Content Formats: ${Array.isArray(brief.desiredFormats) ? brief.desiredFormats.join(', ') : brief.desiredFormats}
- CTA: ${brief.cta}
${brief.contentPillars && brief.contentPillars.length > 0 ? `- Selected Content Pillars: ${brief.contentPillars.join(', ')}` : ''}
${brief.usedAssumptions ? `- Active Assumptions: ${JSON.stringify(brief.usedAssumptions)}` : ''}
${brief.additionalInstructions ? `- Additional Directives: ${brief.additionalInstructions}` : ''}

Generate 3 distinct campaign directions as a JSON object with a "directions" array of 3 items.`;

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
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    concept: { type: Type.STRING },
                    coreMessage: { type: Type.STRING },
                    strategicRationale: { type: Type.STRING },
                    suggestedPillars: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    highLevelDirection: { type: Type.STRING },
                  },
                  required: ['title', 'concept', 'coreMessage', 'strategicRationale', 'suggestedPillars', 'highLevelDirection'],
                },
              },
            },
            required: ['directions'],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{"directions":[]}');
    const directions = (parsed.directions || []).map((dir: any, idx: number) => ({
      ...dir,
      id: dir.id || `dir_${Date.now()}_${idx + 1}`,
    }));

    res.json({ success: true, directions });
  } catch (error: any) {
    console.error('Error generating directions:', error);
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503
        ? 'Gemini is temporarily busy due to high demand. Your campaign brief has been saved. Please try again in a few moments.'
        : error.message || 'Failed to generate campaign directions',
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
- Product / Service: ${productOrService}
- Primary Objective: ${objective}
- Target Audience Description: ${targetAudience}
- Target Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms || 'Instagram, Facebook'}
- Language: ${language || 'English & Darija'}
${additionalInstructions ? `- Additional Creative Directives: ${additionalInstructions}` : ''}

APPROVED COMPANY KNOWLEDGE:
- Approved Brand Kit: ${brandKit ? JSON.stringify(brandKit) : 'None (Use user brief context only)'}
- Approved Products & Services Catalog: ${products && products.length > 0 ? JSON.stringify(products.map((p: any) => ({ name: p.name, category: p.category, description: p.description, approvedClaims: p.approvedClaims }))) : 'None (Use user brief context only)'}
- Benchmark Campaign References: ${campaignReferences && campaignReferences.length > 0 ? JSON.stringify(campaignReferences) : 'None'}

EXISTING & REJECTED PILLARS (DO NOT REPEAT):
- Existing Pillars: ${JSON.stringify(existingPillars || [])}
- Rejected / Removed Pillars: ${JSON.stringify(rejectedPillars || [])}

Generate 3 fresh, complementary, non-duplicate content pillars strictly grounded in this context.`;

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
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503
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
    const { brief, selectedDirection, brandKit, products, staffMembers, feedbackMemory, campaignReferences } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are the senior marketing strategist for "3 Dimensions" 3D printing company in Tunis.
Generate a comprehensive, detailed campaign plan and full content calendar matching the SINGLE selected direction provided.

STRICT CALENDAR & GROUNDING MANDATES:
1. Every calendar item date MUST be strictly between ${brief.startDate} and ${brief.endDate} inclusive. NEVER schedule posts before ${brief.startDate} or after ${brief.endDate}.
2. Recommend a realistic, thoughtful posting cadence in "recommendedCadence" ({ totalPrimaryPosts, reels, carousels, feedPosts, stories, rationale }). Do NOT output an excessive number of primary feed posts if not warranted.
3. PRESERVE USER CONTENT PILLARS: User specified pillars: ${JSON.stringify(brief.contentPillars || [])}.
4. FACTUAL STATUS ASSIGNMENT: For any concept, claim, or topic depending on unverified company capabilities, set factualStatus: "requires_confirmation". Otherwise set "grounded" or "creative".
5. PRODUCTION BRIEFS: Use conditional wording for physical assets or equipment ("Close-up of 3D printing process, if available").

Approved Brand Kit: ${JSON.stringify(brandKit || {})}
Approved Products/Services: ${JSON.stringify(products || [])}
Staff Directory: ${JSON.stringify(staffMembers || [])}
Benchmark References: ${JSON.stringify(campaignReferences || [])}
Feedback Memory: ${JSON.stringify(feedbackMemory || [])}`;

    const prompt = `Selected Strategic Direction ONLY:
${JSON.stringify(selectedDirection)}

Brief Details:
${JSON.stringify(brief)}

Generate a complete JSON object for the Campaign Plan containing:
- concept: string
- coreMessage: string
- valueProposition: string
- factualStatus: "grounded" | "creative" | "requires_confirmation"
- contentPillars: string[] (preserve user pillars: ${JSON.stringify(brief.contentPillars || [])})
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
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
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

