// ═══════════════════════════════════════════════════════════════
//  gemini-webhook.js
//  Mi Smart Speaker → Gemini AI Bridge
//
//  This Netlify Function receives voice queries from Google Actions,
//  sends them to Gemini 2.0 Flash, and returns spoken responses.
// ═══════════════════════════════════════════════════════════════

import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Config ────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = process.env.GEMINI_MODEL   || "gemini-2.0-flash";
const MAX_TOKENS     = parseInt(process.env.GEMINI_MAX_TOKENS || "300", 10);

// System prompt — shapes how Gemini responds for a voice speaker
const SYSTEM_PROMPT = `You are a helpful, friendly, and concise AI voice assistant 
running on a smart speaker. Your name is Gemini.

Important rules for voice responses:
- Keep answers SHORT and CONVERSATIONAL (2-4 sentences max)
- Do NOT use markdown, bullet points, asterisks, hashes, or formatting
- Do NOT say "Sure!", "Certainly!", or filler phrases — get to the point
- Speak naturally as if talking to a person face to face
- For factual questions, lead with the direct answer first
- If you don't know something, say so honestly and briefly`;

// ── Helpers ───────────────────────────────────────────────────

/**
 * Strips all markdown formatting from a string so it
 * sounds natural when read aloud by the speaker's TTS engine.
 */
function cleanForVoice(text) {
  return text
    .replace(/#{1,6}\s+/g, "")          // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")    // bold
    .replace(/\*(.+?)\*/g, "$1")        // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → link text
    .replace(/^\s*[-*+•]\s+/gm, "")    // bullet points
    .replace(/^\s*\d+\.\s+/gm, "")     // numbered lists
    .replace(/>{1,}\s*/g, "")           // blockquotes
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1") // underline/italic
    .replace(/\n{2,}/g, " ")            // collapse blank lines
    .replace(/\n/g, " ")                // collapse single newlines
    .replace(/\s{2,}/g, " ")            // collapse spaces
    .trim();
}

/**
 * Extracts the user's text query from the Actions on Google
 * webhook request body (supports both v2 and legacy formats).
 */
function extractQuery(body) {
  // Actions Builder / Actions SDK v2 format
  if (body?.intent?.query) return body.intent.query;

  // Legacy Dialogflow / Actions SDK v1 format
  if (body?.queryResult?.queryText) return body.queryResult.queryText;
  if (body?.result?.resolvedQuery)  return body.result.resolvedQuery;

  // Fallback: scan entire body as string
  const raw = JSON.stringify(body);
  const match = raw.match(/"query"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Determines if this is the initial invocation (no real query yet)
 * vs an actual follow-up question.
 */
function isInvocationIntent(body) {
  const intentName = body?.intent?.name || body?.handler?.name || "";
  const invocationNames = [
    "actions.intent.MAIN",
    "MAIN",
    "main",
    "Welcome",
    "Default Welcome Intent",
  ];
  return invocationNames.some(n =>
    intentName.toLowerCase().includes(n.toLowerCase())
  );
}

/**
 * Builds the JSON response that Google Actions expects.
 */
function buildActionsResponse({ speech, endConversation = false }) {
  return {
    prompt: {
      override: true,
      firstSimple: {
        speech: speech,
        text: speech,
      },
    },
    ...(endConversation && {
      scene: {
        next: { name: "actions.scene.END_CONVERSATION" },
      },
    }),
  };
}

// ── Main Handler ──────────────────────────────────────────────

export const handler = async (event) => {
  // ── CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: "",
    };
  }

  // ── Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  // ── Parse body
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body." }),
    };
  }

  // ── Check API key
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY environment variable is not set!");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildActionsResponse({
          speech: "I'm not configured yet. Please add the Gemini API key to the environment variables.",
          endConversation: true,
        })
      ),
    };
  }

  // ── Handle initial invocation (first "Hey Google, talk to my assistant")
  if (isInvocationIntent(body)) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildActionsResponse({
          speech:
            "Hi! I'm Gemini, your AI assistant. What would you like to know?",
        })
      ),
    };
  }

  // ── Extract user query
  const userQuery = extractQuery(body);
  if (!userQuery) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildActionsResponse({
          speech: "Sorry, I didn't catch that. Could you say it again?",
        })
      ),
    };
  }

  // ── Detect exit phrases
  const exitPhrases = ["goodbye", "bye", "exit", "stop", "quit", "cancel", "close"];
  if (exitPhrases.some(p => userQuery.toLowerCase().includes(p))) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildActionsResponse({
          speech: "Goodbye! Talk to you later.",
          endConversation: true,
        })
      ),
    };
  }

  // ── Call Gemini API
  try {
    console.log(`[Gemini] Query: "${userQuery.substring(0, 100)}..."`);

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: MAX_TOKENS,
        temperature: 0.8,
        topP: 0.95,
      },
    });

    const result = await model.generateContent(userQuery);
    const rawText = result.response.text();
    const cleanText = cleanForVoice(rawText);

    console.log(`[Gemini] Response: "${cleanText.substring(0, 150)}..."`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(
        buildActionsResponse({ speech: cleanText })
      ),
    };
  } catch (error) {
    console.error("[Gemini] API Error:", error.message);

    // Friendly fallback for rate limits
    const isRateLimit = error.message?.includes("429") ||
                        error.message?.includes("quota");
    const fallback = isRateLimit
      ? "I'm getting too many requests right now. Please try again in a minute."
      : "Sorry, I ran into a problem getting an answer. Please try again.";

    return {
      statusCode: 200, // Must return 200 so Actions doesn't show error
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildActionsResponse({ speech: fallback })),
    };
  }
};
