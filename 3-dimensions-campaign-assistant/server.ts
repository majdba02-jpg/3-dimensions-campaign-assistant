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
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503 ? 'Gemini is temporarily busy. Please try again.' : error.message || 'Failed to improve objective',
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
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503 ? 'Gemini is temporarily busy. Please try again.' : error.message || 'Failed to improve key message',
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
- Type: ${campaignType}
- Product / Service: ${productOrService}
- Objective: ${objective}
- Audience: ${audience}
- Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms}
- Languages: ${Array.isArray(languages) ? languages.join(', ') : languages}
- Available Resources: ${JSON.stringify(availableResources || {})}
- References: ${JSON.stringify(references || [])}

Recommend optimal content formats from: ["Reel", "Carousel", "Story", "Feed Photo", "Feed Post"].`;

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
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503 ? 'Gemini is temporarily busy. Please try again.' : error.message || 'Failed to recommend formats',
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
- Campaign Type: ${campaignType}
- Product / Service: ${productOrService}
- Objective: ${objective}
- Audience: ${audience}
- Funnel Intent: ${funnelIntent || 'Consideration'}
- Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms}
- Key Message: ${keyMessage || ''}

Provide 3 distinct CTA suggestions.`;

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
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503 ? 'Gemini is temporarily busy. Please try again.' : error.message || 'Failed to suggest CTA',
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
- Campaign Type: ${campaignType}
- Product / Service: ${productOrService}
- Objective: ${objective}
- Audience: ${audience}
- Desired Tone: ${Array.isArray(tone) ? tone.join(', ') : tone}
- Target Platforms: ${Array.isArray(platforms) ? platforms.join(', ') : platforms}
- Base Brand Colors: ${JSON.stringify(brandColors || [])}

Generate 3-4 complementary campaign accent colors with hex codes.`;

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
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503 ? 'Gemini is temporarily busy. Please try again.' : error.message || 'Failed to suggest palette',
    });
  }
});

/**
 * 5. Review Genuinely Missing Assumptions
 */
app.post('/api/gemini/assumptions', async (req, res) => {
  try {
    const { brief, brandKit, products, feedbackMemory } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are an expert marketing reviewer for "3 Dimensions" in Tunis.
Review the user's campaign brief to check if any GENUINELY CRITICAL creative framing or stylistic assumptions are needed before strategic directions are generated.

STRICT ASSUMPTIONS CRITERIA:
1. ONLY propose assumptions for genuinely missing optional fields that would significantly help shape creative direction.
2. If the user has already provided sufficient information, return an EMPTY ARRAY "assumptions": [].
3. You are STRICTLY FORBIDDEN from inventing technical capabilities, materials, tolerances, pricing, certifications, shipping guarantees, or turnaround times as assumptions!
4. Allowed categories for assumptions: "Creative Framing", "Audience Sub-segment Angle", "Content Delivery Style", "Seasonal Angle".
5. Return strict JSON with "assumptions" array containing objects with:
   - id: string
   - category: string
   - proposedValue: string
   - rationale: string
   - sourceTags: string[] (e.g. ['Campaign Brief', 'Brand Kit', 'Feedback Memory'])`;

    const prompt = `Review this Campaign Brief:
${JSON.stringify(brief, null, 2)}

Approved Brand Kit: ${JSON.stringify(brandKit || {})}
Approved Products: ${JSON.stringify(products || [])}
Feedback Memory: ${JSON.stringify(feedbackMemory || [])}

Output only necessary assumptions, or an empty array if information is sufficient.`;

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
    const assumptions = (parsed.assumptions || []).map((a: any, idx: number) => ({
      ...a,
      id: a.id || `assump_${Date.now()}_${idx + 1}`,
      status: 'Pending',
    }));

    res.json({ success: true, assumptions });
  } catch (error: any) {
    console.error('Error generating assumptions:', error);
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503 ? 'Gemini is temporarily busy. Please try again.' : error.message || 'Failed to review assumptions',
    });
  }
});

/**
 * 6. Generate 3 Distinct Strategic Directions
 */
app.post('/api/gemini/directions', async (req, res) => {
  try {
    const { brief, brandKit, feedbackMemory, campaignReferences, assumptions } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are the Executive Marketing Director for "3 Dimensions" (Infinite Dimensions) 3D Printing in Tunis.
Generate EXACTLY THREE (3) distinct, high-impact strategic campaign directions based on the user's campaign brief.

STRATEGIC MANDATES:
1. Each direction must have a distinct STRATEGIC ANGLE (e.g. "Educational & Process Breakdown", "Technical Proof & Quality", "Problem-Solving & Community Inspiration", "Behind the Scenes Craftsmanship").
2. Core message and concept must be tailored to the product/service, target audience, and Tunisia market context.
3. PRESERVE USER-SELECTED PILLARS: Include the marketer's selected pillars (${JSON.stringify(brief.contentPillars || [])}) in "campaignPillars".
4. You may optionally propose 1 unique "directionSpecificPillar" per direction if it enriches the strategic angle.
5. If Darija or Arabic is requested, use authentic Arabic script with natural technical terms.
6. Return strict JSON with a "directions" array containing exactly 3 direction objects.`;

    const prompt = `Campaign Context:
- Name: ${brief.name}
- Objective: ${brief.objective}
- Type: ${brief.type}
- Audience Segment: ${brief.audienceSegment}
- Product / Service: ${brief.productOrService || JSON.stringify(brief.promotionItems || [])}
- Target Audience: ${brief.targetAudience || JSON.stringify(brief.targetAudiences || [])} (${brief.audienceAge || `${brief.minAge || ''}-${brief.maxAge || ''}`})
- Dates: ${brief.startDate} to ${brief.endDate} (${brief.durationDays} days)
- Platforms: ${Array.isArray(brief.targetPlatforms || brief.platforms) ? (brief.targetPlatforms || brief.platforms).join(', ') : brief.platforms}
- Languages: ${Array.isArray(brief.languages) ? brief.languages.join(', ') : brief.language}
- Desired Formats: ${Array.isArray(brief.desiredFormats) ? brief.desiredFormats.join(', ') : brief.desiredFormats}
- CTA: ${brief.cta}
- Target Locations: ${Array.isArray(brief.locations) ? brief.locations.join(', ') : 'Tunisia'}
- Tone: ${Array.isArray(brief.campaignToneList) ? brief.campaignToneList.join(', ') : brief.campaignTone || 'Professional & Engaging'}
- Key Message: ${brief.keyMessage || ''}
- Funnel Intent: ${brief.funnelIntent || 'Consideration'}
- Available Resources: ${JSON.stringify(brief.availableResources || {})}
${assumptions && assumptions.length > 0 ? `- Confirmed Assumptions: ${JSON.stringify(assumptions)}` : ''}
${brief.additionalInstructions ? `- Additional Directives: ${brief.additionalInstructions}` : ''}

Brand Kit Context: ${JSON.stringify(brandKit || {})}
References: ${JSON.stringify(campaignReferences || [])}
Feedback Memory: ${JSON.stringify(feedbackMemory || [])}

Generate 3 distinct strategic directions with different strategic angles.`;

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
    const userPillars = brief.contentPillars || [];
    const directions = (parsed.directions || []).map((dir: any, idx: number) => ({
      ...dir,
      id: `dir_${Date.now()}_${idx + 1}`,
      directionNumber: idx + 1,
      campaignPillars: (dir.campaignPillars && dir.campaignPillars.length > 0) ? dir.campaignPillars : userPillars,
      shortlisted: false,
      selectedForPlan: idx === 0, // default select first
      isEdited: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    res.json({ success: true, directions });
  } catch (error: any) {
    console.error('Error generating directions:', error);
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503 ? 'Gemini is temporarily busy. Please try again.' : error.message || 'Failed to generate campaign directions',
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

    const otherDirections = (existingDirections || []).filter((_: any, idx: number) => idx !== directionIndexToReplace);

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are generating a SINGLE replacement strategic direction for "3 Dimensions" 3D Printing.
CRITICAL MANDATE:
- The new direction MUST have a completely different Strategic Angle and concept from the other existing directions:
${JSON.stringify(otherDirections.map((d: any) => ({ angle: d.strategicAngle, title: d.title, concept: d.concept })))}
- Ground all claims in the user brief and approved knowledge.
- Return a strict JSON object with a single "direction" object.`;

    const prompt = `Campaign Context:
${JSON.stringify(brief, null, 2)}

Provide 1 fresh, distinct strategic direction replacing direction #${directionIndexToReplace + 1}.`;

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
    const newDirection = {
      ...dir,
      id: `dir_${Date.now()}_replaced`,
      directionNumber: directionIndexToReplace + 1,
      campaignPillars: dir.campaignPillars || brief.contentPillars || [],
      isReplacement: true,
      shortlisted: false,
      selectedForPlan: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({ success: true, direction: newDirection });
  } catch (error: any) {
    console.error('Error replacing direction:', error);
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503 ? 'Gemini is temporarily busy. Please try again.' : error.message || 'Failed to replace direction',
    });
  }
});

/**
 * 8. Combine Two Shortlisted Directions into a Hybrid Proposal
 */
app.post('/api/gemini/combine-directions', async (req, res) => {
  try {
    const { brief, direction1, direction2, brandKit, products, feedbackMemory } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `${FACTUAL_GROUNDING_RULES}

You are synthesizing TWO shortlisted strategic directions for "3 Dimensions" into a cohesive, superior HYBRID strategic proposal.
MANDATE:
- Synthesize the strengths of Direction 1 ("${direction1.title}") and Direction 2 ("${direction2.title}").
- Create a harmonious unified angle, concept, core message, and rationale.
- Return a strict JSON object with "hybridDirection" containing:
  - strategicAngle: string
  - title: string
  - concept: string
  - coreMessage: string
  - strategicRationale: string
  - campaignPillars: string[]
  - directionSpecificPillar: string`;

    const prompt = `Direction 1:
${JSON.stringify(direction1)}

Direction 2:
${JSON.stringify(direction2)}

Brief Context:
${JSON.stringify(brief)}

Generate the synthesized hybrid proposal.`;

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
    const formattedHybrid = {
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

    res.json({ success: true, hybridDirection: formattedHybrid });
  } catch (error: any) {
    console.error('Error combining directions:', error);
    const is503 = error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE');
    res.status(is503 ? 503 : 500).json({
      success: false,
      is503,
      error: is503 ? 'Gemini is temporarily busy. Please try again.' : error.message || 'Failed to combine directions',
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

