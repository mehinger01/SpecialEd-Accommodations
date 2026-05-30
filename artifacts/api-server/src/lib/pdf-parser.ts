/**
 * PDF Parser Module
 *
 * Extracts accommodation items from IEP, 504, and BIP documents using
 * rule-based pattern matching. No external AI services are used.
 *
 * This module is intentionally separated from the web layer so it can
 * be tested independently and extended (e.g., with more patterns,
 * different document types, or a future ML pipeline) without touching routes.
 */

// Import from lib path to avoid pdf-parse@1's startup test-file read
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

export interface ParsedAccommodation {
  category: string;
  description: string;
  rawText: string;
}

export interface ParseResult {
  rawText: string;
  accommodations: ParsedAccommodation[];
  pageCount: number;
}

/**
 * Known accommodation categories and the keywords that signal them.
 * Each entry maps a canonical category label to an array of trigger phrases.
 * Patterns are matched case-insensitively against individual lines or bullets.
 */
const CATEGORY_PATTERNS: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: "Extended Time",
    patterns: [
      /extended\s+time/i,
      /time\s+and\s+a\s+half/i,
      /double\s+time/i,
      /extra\s+time/i,
      /additional\s+time/i,
      /time\s+extension/i,
    ],
  },
  {
    category: "Preferential Seating",
    patterns: [
      /preferential\s+seat/i,
      /front\s+of\s+(?:the\s+)?(?:class|room)/i,
      /seat(?:ing)?\s+(?:near|close\s+to|in\s+front)/i,
      /distraction[- ]free\s+seat/i,
    ],
  },
  {
    category: "Reduced Distraction",
    patterns: [
      /reduced?\s+distraction/i,
      /quiet\s+(?:setting|environment|room|space|area)/i,
      /distraction[- ]free\s+(?:environment|testing|area|setting)/i,
      /separate\s+(?:setting|room|testing\s+room)/i,
    ],
  },
  {
    category: "Read Aloud",
    patterns: [
      /read\s+aloud/i,
      /reading\s+assistance/i,
      /oral\s+(?:reading|presentation|administration)/i,
      /text[\s-]to[\s-]speech/i,
      /audio\s+(?:version|format|presentation)/i,
    ],
  },
  {
    category: "Scribe / Written Response",
    patterns: [
      /scribe/i,
      /scribing/i,
      /oral\s+response/i,
      /dictation/i,
      /speech[\s-]to[\s-]text/i,
      /allow(?:ed)?\s+to\s+type/i,
    ],
  },
  {
    category: "Calculator / Computation Aid",
    patterns: [
      /calculator/i,
      /computation\s+aid/i,
      /math\s+tool/i,
      /multiplication\s+table/i,
      /number\s+line/i,
    ],
  },
  {
    category: "Graphic Organizer / Visual Aid",
    patterns: [
      /graphic\s+organizer/i,
      /visual\s+aid/i,
      /anchor\s+chart/i,
      /reference\s+(?:sheet|card)/i,
      /vocabulary\s+support/i,
      /word\s+bank/i,
    ],
  },
  {
    category: "Breaks",
    patterns: [
      /\bbreaks?\b/i,
      /sensory\s+break/i,
      /movement\s+break/i,
      /brain\s+break/i,
      /scheduled\s+break/i,
    ],
  },
  {
    category: "Reduced Assignment",
    patterns: [
      /reduced\s+(?:assignment|homework|number\s+of|length|quantity)/i,
      /modified\s+(?:assignment|homework|workload)/i,
      /shortened\s+(?:assignment|test|quiz)/i,
      /fewer\s+(?:items|questions|problems)/i,
    ],
  },
  {
    category: "Testing Accommodations",
    patterns: [
      /test(?:ing)?\s+accommodation/i,
      /assessment\s+accommodation/i,
      /alternate\s+(?:format|form|test)/i,
      /large[\s-]print/i,
      /magnification/i,
    ],
  },
  {
    category: "Behavioral Support",
    patterns: [
      /behavior(?:al)?\s+(?:plan|support|intervention|strategy)/i,
      /positive\s+(?:reinforcement|behavior)/i,
      /check[\s-]in[\s-]check[\s-]out/i,
      /sensory\s+(?:diet|tool|strategy)/i,
      /fidget/i,
      /calming\s+(?:tool|strategy|area)/i,
    ],
  },
  {
    category: "Communication Support",
    patterns: [
      /AAC/i,
      /augmentative\s+communication/i,
      /communication\s+(?:device|board|support)/i,
      /sign\s+language/i,
      /visual\s+schedule/i,
    ],
  },
  {
    category: "Assistive Technology",
    patterns: [
      /assistive\s+technology/i,
      /AT\s+device/i,
      /screen\s+reader/i,
      /voice\s+output/i,
      /adaptive\s+equipment/i,
    ],
  },
  {
    category: "ESL / Language Support",
    patterns: [
      /ESL/i,
      /ELL/i,
      /English\s+language\s+learner/i,
      /bilingual\s+support/i,
      /native\s+language/i,
      /translation\s+support/i,
    ],
  },
];

/**
 * Bullet/list item patterns — lines that look like discrete accommodation entries.
 */
const BULLET_PATTERN = /^[\s]*[-•*▪►✓●○◆]\s+(.+)/;
const NUMBERED_PATTERN = /^[\s]*\d+[.)]\s+(.+)/;
const INDENT_PATTERN = /^[\s]{4,}(.+)/;

/**
 * Section headers that indicate we're entering an accommodations section.
 * Content after these headers is scanned more aggressively.
 */
const ACCOMMODATION_SECTION_HEADERS = [
  /accommodation/i,
  /modification/i,
  /support(?:s)?\s+and\s+service/i,
  /special\s+education\s+service/i,
  /supplementary\s+aid/i,
  /specially\s+designed\s+instruction/i,
  /SDI/i,
  /504\s+plan/i,
  /behavior\s+intervention/i,
];

/**
 * Determines which category best matches a given text fragment.
 * Returns the first matching category, or "General Accommodation" if none match.
 */
function classifyText(text: string): string {
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      return category;
    }
  }
  return "General Accommodation";
}

/**
 * Returns true if the line is a section header that announces accommodations.
 */
function isAccommodationHeader(line: string): boolean {
  return ACCOMMODATION_SECTION_HEADERS.some((p) => p.test(line));
}

/**
 * Returns true if the line contains at least one recognizable accommodation keyword.
 */
function containsAccommodationKeyword(line: string): boolean {
  return CATEGORY_PATTERNS.some(({ patterns }) => patterns.some((p) => p.test(line)));
}

/**
 * Cleans up extracted text: collapses whitespace, trims, removes control chars.
 */
function cleanText(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses a raw text body into a list of accommodation items.
 *
 * Strategy:
 * 1. Split into lines and track whether we're inside an accommodations section.
 * 2. Bullet/numbered/indented items within or near a section are extracted.
 * 3. Any line anywhere containing a known accommodation keyword is also extracted.
 * 4. Deduplication is applied on normalized description text.
 */
function extractAccommodations(rawText: string): ParsedAccommodation[] {
  const lines = rawText.split(/\r?\n/);
  const results: ParsedAccommodation[] = [];
  const seen = new Set<string>();

  let inAccommodationSection = false;
  let sectionDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = cleanText(line);

    if (!trimmed || trimmed.length < 8) continue;

    // Check if this line is a section header announcing accommodations
    if (isAccommodationHeader(trimmed)) {
      inAccommodationSection = true;
      sectionDepth = 0;
      continue;
    }

    // If a new major section header appears (all caps, short, no accommodation keywords), exit
    if (
      inAccommodationSection &&
      /^[A-Z\s]{6,}$/.test(trimmed) &&
      !containsAccommodationKeyword(trimmed) &&
      trimmed.length < 60
    ) {
      inAccommodationSection = false;
    }

    let itemText: string | null = null;

    // Try to extract bullet/list items
    const bulletMatch = BULLET_PATTERN.exec(line) ?? NUMBERED_PATTERN.exec(line);
    if (bulletMatch) {
      itemText = cleanText(bulletMatch[1]);
    } else if (inAccommodationSection && INDENT_PATTERN.test(line)) {
      const indentMatch = INDENT_PATTERN.exec(line);
      if (indentMatch) {
        itemText = cleanText(indentMatch[1]);
        sectionDepth++;
      }
    }

    // Also grab any line that directly mentions an accommodation keyword
    if (!itemText && containsAccommodationKeyword(trimmed)) {
      itemText = trimmed;
    }

    if (itemText && itemText.length >= 10) {
      const normalized = itemText.toLowerCase().replace(/\s+/g, " ");
      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push({
          category: classifyText(itemText),
          description: itemText.length > 200 ? itemText.slice(0, 200) + "…" : itemText,
          rawText: trimmed,
        });
      }
    }

    // Reset section tracking after many non-matching lines
    if (inAccommodationSection) {
      sectionDepth++;
      if (sectionDepth > 80) {
        inAccommodationSection = false;
        sectionDepth = 0;
      }
    }
  }

  return results;
}

/**
 * Main entry point. Parses a PDF buffer and returns structured accommodation data.
 *
 * @param buffer - Raw PDF file buffer
 * @returns ParseResult with raw text preview and extracted accommodations
 */
export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const data = await pdfParse(buffer);
  const rawText = data.text ?? "";
  const pageCount = data.numpages;
  const accommodations = extractAccommodations(rawText);

  return {
    rawText,
    pageCount,
    accommodations,
  };
}
