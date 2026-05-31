/**
 * PDF Parser Module — Skyward IEP / 504 / BIP Accommodation Extractor
 *
 * Rule-based, no AI. Locates Section 5 and Section 6 by text header markers,
 * then extracts structured accommodation records anchored on Start Date / End Date
 * pairs. Descriptive text is attached to the record and never promoted to an
 * accommodation name. Section-label headers (Location, Time/Frequency, etc.)
 * are never treated as accommodation names.
 */

// Must import from lib path to avoid pdf-parse@1's startup test-file read
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (
  buffer: Buffer
) => Promise<{ text: string; numpages: number }>;

// ─── Output types ─────────────────────────────────────────────────────────────

export interface ParsedAccommodation {
  accommodationName: string;
  category: string;
  description: string;
  rawText: string;
  sourceSection: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
}

export interface ParseResult {
  rawText: string;
  accommodations: ParsedAccommodation[];
  pageCount: number;
  warnings: string[];
}

// ─── Section boundary patterns ────────────────────────────────────────────────

const SEC5_START = /section\s*5\b|supplementary\s+aids\s+and\s+services/i;
const SEC5_END   = /section\s*6\b|assessment\s+participation\s+and\s+provisions/i;
const SEC6_START = /section\s*6\b|assessment\s+participation\s+and\s+provisions/i;
const SEC6_END   = /section\s*7\b|specially\s+designed\s+instruction/i;

// ─── Line-level patterns ──────────────────────────────────────────────────────

/**
 * Section labels in Skyward IEPs that are category dividers or form boilerplate,
 * NOT accommodation names. These are filtered from names AND from descriptions.
 */
const IGNORE_HEADERS: RegExp[] = [
  // Form-structure labels
  /^ongoing instruction/i,
  /^scheduling[,\s]/i,
  /^presentation[,\s]/i,
  /^curriculum supports/i,
  /^directions[,\s]/i,
  /^grading[,\s]/i,
  /^supports and modifications/i,
  /^classroom environment/i,
  /^health[- ]related needs/i,
  /^physical needs/i,
  /^transitioning times/i,
  /^assistive technology[,\s]*$/i,
  /^behavioral[,\s]/i,
  /^training needs/i,
  /^social interaction supports/i,
  /^time\s*[/\\]\s*frequency/i,
  /^location\s*$/i,
  /^general and special education/i,
  /^supplementary aids/i,
  /^assessment participation/i,
  /^specially designed instruction/i,
  /^section\s*\d/i,
  /^iep\s*team/i,
  /^service type/i,
  /^provider/i,
  /^frequency/i,
  /^duration/i,
  /^setting\s*$/i,
  // Boilerplate sentences found after each accommodation in Skyward IEPs
  /^the iep team must consider/i,
  /^extracurricular and nonacademic/i,
  /^needs,\s*social interaction/i,
  /^performance criteria/i,
  /^evaluation procedure/i,
  /^evaluation schedule/i,
  /^schedule for reporting/i,
  /^parents will be informed/i,
  // Section 6 form structure (assessment grids)
  /^based on grade level/i,
  /^is a state assessment/i,
  /^state determined assessment/i,
  /^state alternate assessment/i,
  /^assessment area/i,
  /^for students not taking/i,
  /^indicate why it is not appropriate/i,
  /^why the alternate assessment/i,
  /^is a district[- ]wide assessment/i,
  /^district[- ]wide assessment/i,
  /^district wide assessments?/i,
  /^college entrance/i,
  /^rationale\s*$/i,
  /^participation\s*$/i,
  /^participating\s*$/i,
  /^appropriate\.\s*$/i,
  /^grades?\s+\d/i,
  /^state\s*$/i,
  /^determined\s*$/i,
  /^assessment\s*$/i,
];

const START_DATE_RE = /start\s*date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
const END_DATE_RE   = /end\s*date\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
const ANY_DATE_RE   = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/;
const LOCATION_RE   = /^location\s*:\s*(.+)/i;

// Fix 4: PDF header/footer lines that contaminate accommodation blocks.
// These are filtered from the full text before section detection.
const FOOTER_LINE_RE = /\b(?:DOB|UIC)\s*:|IEP\s+Date\s*:|Operating\s+District\s*:|\bPage\s+\d+|\bPage\s*$/i;

// Fix 3: Recognise known location values that appear without a "Location:" label.
// When one of these lines is found in the description range, it becomes location
// and is removed from the description.
const LOCATION_VALUE_RE = /^(general\s+and\s+special\s+education|special\s+education(?:\s+only|\s+setting)?|general\s+education(?:\s+only|\s+setting)?|co[- ]?taught(?:\s+classroom)?|resource\s+room|self[- ]contained)\s*$/i;

// Fix 2: IEP boilerplate sentences that appear after every accommodation in
// Skyward IEPs. These fragments must be stripped from descriptions before storing.
const BOILERPLATE_STRIPS: RegExp[] = [
  /the iep team must consider if this accommodation is required to participate in extracurricular and nonacademic activities\.?/gi,
  /accommodation is required to participate in extracurricular and nonacademic activities\.?/gi,
  /required to participate in extracurricular and nonacademic activities\.?/gi,
  /participate in extracurricular and nonacademic activities\.?/gi,
  /extracurricular and nonacademic activities\.?/gi,
  /in extracurricular and nonacademic activities\.?/gi,
];

// ─── Category classifier ──────────────────────────────────────────────────────

const CATEGORY_PATTERNS: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: "Extended Time",
    patterns: [/extended\s+time/i, /time\s+and\s+a\s+half/i, /double\s+time/i, /extra\s+time/i, /additional\s+time/i],
  },
  {
    category: "Preferential Seating",
    patterns: [/preferential\s+seat/i, /front\s+of\s+(?:the\s+)?(?:class|room)/i, /distraction[- ]free\s+seat/i],
  },
  {
    category: "Reduced Distraction",
    patterns: [/reduced?\s+distraction/i, /quiet\s+(?:setting|environment|room)/i, /distraction[- ]free/i, /separate\s+(?:setting|room)/i],
  },
  {
    category: "Read Aloud",
    patterns: [/read\s+aloud/i, /oral\s+(?:reading|presentation|administration)/i, /text[\s-]to[\s-]speech/i, /audio\s+(?:version|format)/i],
  },
  {
    category: "Scribe / Written Response",
    patterns: [/scribe/i, /scribing/i, /oral\s+response/i, /dictation/i, /speech[\s-]to[\s-]text/i],
  },
  {
    category: "Calculator",
    patterns: [/calculator/i, /computation\s+aid/i, /multiplication\s+table/i, /number\s+line/i],
  },
  {
    category: "Breaks",
    patterns: [/\bbreaks?\b/i, /sensory\s+break/i, /movement\s+break/i, /scheduled\s+break/i, /brain\s+break/i],
  },
  {
    category: "Testing Accommodations",
    patterns: [
      /test(?:ing)?\s+accommodation/i,
      /assessment\s+accommodation/i,
      /alternate\s+.*(?:setting|location)/i,
      /alternative\s+.*(?:setting|location)/i,
      /universal\s+tool/i,
    ],
  },
  {
    category: "Reduced Writing",
    patterns: [/reduced\s+writing/i, /reduced\s+(?:assignment|homework|number\s+of|length)/i, /modified\s+(?:assignment|homework|workload)/i],
  },
  {
    category: "Behavioral Support",
    patterns: [/behavior(?:al)?\s+(?:plan|support|intervention)/i, /\bBIP\b/, /behavior\s+intervention/i],
  },
  {
    category: "Assistive Technology",
    patterns: [/assistive\s+technology/i, /screen\s+reader/i, /adaptive\s+equipment/i],
  },
  {
    category: "Communication Support",
    patterns: [/AAC/i, /augmentative\s+communication/i, /communication\s+(?:device|board|support)/i, /sign\s+language/i],
  },
  {
    category: "Spell Check / Word Prediction",
    patterns: [/spell[\s-]?check/i, /word\s+prediction/i, /spellcheck/i],
  },
  {
    category: "Graphic Organizer",
    patterns: [/graphic\s+organizer/i, /visual\s+(?:aid|support|organizer)/i, /anchor\s+chart/i],
  },
  {
    category: "Prompting / Cueing",
    patterns: [/prompting/i, /cueing/i, /verbal\s+prompt/i, /gestural\s+prompt/i, /check[\s-]in/i],
  },
  {
    category: "Enlarged Print",
    patterns: [/enlarged?\s+print/i, /large\s+print/i, /font\s+size/i, /magnif/i],
  },
];

function classifyText(text: string): string {
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return category;
  }
  return "General Accommodation";
}

/**
 * Strict whitelist for Section 6 fallback extraction.
 * Only lines that closely match one of these patterns are ever promoted to an
 * accommodation record. Everything else — table headers, grade labels, section
 * titles, rationale text, participation-status cells, single words — is ignored.
 */
const SEC6_ITEM_WHITELIST: RegExp[] = [
  // Testing-location / alternate-setting accommodations
  /alternative\s+test(?:ing)?\s+location/i,
  /alternate\s+test(?:ing)?\s+location/i,
  /administration\s+of\s+the\s+assessment\s+in\s+an\s+alternate/i,
  /assessment\s+in\s+an\s+alternate\s+(?:education\s+)?setting/i,
  /alternate\s+education\s+setting/i,
  // Breaks
  /\bbreaks?\b/i,
  // Writing reductions
  /reduced\s+writing/i,
  /modified\s+(?:writing|assignment)/i,
  // Extended time
  /extended\s+time/i,
  /time\s+and\s+a\s+half/i,
  /double\s+time/i,
  // Read aloud / audio
  /read\s+aloud/i,
  /oral\s+(?:reading|presentation|administration)/i,
  /text[\s-]to[\s-]speech/i,
  // Scribe / response
  /\bscribe\b/i,
  /oral\s+response/i,
  /dictation\b/i,
  /speech[\s-]to[\s-]text/i,
  // Calculator / math aids
  /\bcalculator\b/i,
  /multiplication\s+table/i,
  // Seating / environment
  /preferential\s+seat/i,
  /distraction[- ]free/i,
  /separate\s+(?:room|setting|location)/i,
  /quiet\s+(?:room|setting|location|environment)/i,
  // Spell check / word tools
  /spell[\s-]?check/i,
  /word\s+prediction/i,
  // Graphic organizer / visual aids
  /graphic\s+organizer/i,
  /visual\s+(?:aid|support|schedule)/i,
  // Assistive technology
  /assistive\s+technology/i,
  // Communication supports
  /augmentative\s+communication/i,
  /\bAAC\b/,
  // Prompting
  /\bprompting\b/i,
  /verbal\s+cue/i,
];

function matchesSec6Whitelist(text: string): boolean {
  return SEC6_ITEM_WHITELIST.some((p) => p.test(text));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanLine(raw: string): string {
  return raw
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isIgnoreHeader(line: string): boolean {
  return IGNORE_HEADERS.some((p) => p.test(line));
}

function isDateLine(line: string): boolean {
  return START_DATE_RE.test(line) || END_DATE_RE.test(line);
}

function normKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/^[-•*▪►✓●○◆\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Fix 2: strip recurring IEP boilerplate from a description string.
function stripBoilerplate(text: string): string {
  let result = text;
  for (const p of BOILERPLATE_STRIPS) {
    result = result.replace(p, "");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

// ─── Section slicer ───────────────────────────────────────────────────────────

function findSection(
  lines: string[],
  startRe: RegExp,
  endRe: RegExp
): { lines: string[]; found: boolean } {
  let start = -1;
  let end = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const t = cleanLine(lines[i]);
    if (start === -1 && startRe.test(t)) {
      start = i + 1;
      continue;
    }
    if (start !== -1 && endRe.test(t)) {
      end = i;
      break;
    }
  }

  if (start === -1) return { lines: [], found: false };
  return { lines: lines.slice(start, end), found: true };
}

// ─── Date-anchored block parser ───────────────────────────────────────────────
//
// Algorithm:
//   1. Locate every "Start Date: MM/DD/YYYY" line in the section.
//   2. For each, look BACK (up to 15 lines) collecting ALL title lines —
//      stop at a blank line, a category header, any date, or a location label.
//      Join collected lines (forward order) into one normalized title string.
//      "Universal Tools: Administration of the…" wraps across multiple lines
//      and must be assembled this way.
//   3. Pre-compute ALL title ranges up front (start index = earliest title line).
//      Use titleRanges[d+1].start as the description upper bound, which stops
//      description collection before the next block's title begins.
//   4. Find End Date within next 6 lines.
//   5. Collect description text from after End Date to next title start.
//      - Explicit "Location: X" labels → location field.
//      - Known bare location values (e.g. "General and Special Education") → location.
//      - IEP boilerplate → stripped via stripBoilerplate().
//   6. Deduplicate by normalized accommodation name.

interface TitleRange {
  start: number;  // earliest line index (furthest from Start Date)
  end: number;    // latest line index (closest to Start Date)
  name: string;   // full joined accommodation title
}

function computeTitleRange(cleaned: string[], sdIdx: number): TitleRange | null {
  const lines: string[] = [];
  let start = -1;
  let end = -1;

  for (let i = sdIdx - 1; i >= Math.max(0, sdIdx - 15); i--) {
    const line = cleaned[i];
    // Blank line → hard boundary; stop immediately.
    if (!line || line.length < 2) break;
    // Category / section header → boundary; stop (don't include this line).
    if (isIgnoreHeader(line)) break;
    // Date from a previous block → boundary.
    if (isDateLine(line) || ANY_DATE_RE.test(line)) break;
    // Bare "Location:" label → skip but don't stop.
    if (LOCATION_RE.test(line)) continue;
    // Known bare location value → skip but don't stop.
    if (LOCATION_VALUE_RE.test(line)) continue;

    // Valid title line.
    lines.unshift(line); // prepend → forward order
    start = i;           // keeps updating to the earliest valid line
    if (end === -1) end = i; // set once: first found going backward = closest to Start Date
  }

  if (lines.length === 0) return null;
  return { start, end, name: lines.join(" ").replace(/\s+/g, " ").trim() };
}

function parseDateAnchoredBlocks(
  rawLines: string[],
  sourceSection: string
): ParsedAccommodation[] {
  const cleaned = rawLines.map(cleanLine);
  const results: ParsedAccommodation[] = [];
  const seen = new Set<string>();

  // Step 1: collect all Start Date line indices.
  const startDateIdxs: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (START_DATE_RE.test(cleaned[i])) startDateIdxs.push(i);
  }
  if (startDateIdxs.length === 0) return [];

  // Step 2: pre-compute full title range for every Start Date block.
  // titleRanges[d].start is the earliest line of block d's title — used as
  // the upper bound when collecting descriptions for block d-1.
  const titleRanges: Array<TitleRange | null> = startDateIdxs.map((sdIdx) =>
    computeTitleRange(cleaned, sdIdx)
  );

  for (let d = 0; d < startDateIdxs.length; d++) {
    const sdIdx = startDateIdxs[d];
    const range = titleRanges[d];
    if (!range) continue;

    const accommodationName = range.name;

    // Description upper bound: stop at the EARLIEST line of the next block's title.
    const nextTitleStart =
      d + 1 < titleRanges.length && titleRanges[d + 1] !== null
        ? (titleRanges[d + 1] as TitleRange).start
        : cleaned.length;

    // ── Dates ────────────────────────────────────────────────────────────────
    let startDate: string | null = null;
    let endDate: string | null = null;
    let edIdx = sdIdx;

    const sdLine = cleaned[sdIdx];
    const sdMatch = START_DATE_RE.exec(sdLine);
    if (sdMatch) startDate = sdMatch[1];

    const sameLineEnd = END_DATE_RE.exec(sdLine);
    if (sameLineEnd) {
      endDate = sameLineEnd[1];
    } else {
      for (let i = sdIdx + 1; i < Math.min(sdIdx + 7, cleaned.length); i++) {
        const em = END_DATE_RE.exec(cleaned[i]);
        if (em) { endDate = em[1]; edIdx = i; break; }
      }
    }

    // ── Description + location ────────────────────────────────────────────────
    // Collect from after End Date up to (not including) next block's title start.
    // Fix 3: check location patterns BEFORE the ignore-header filter so that
    //        "General and Special Education" is captured as location, not silently dropped.
    // Fix 2: stripBoilerplate() removes IEP compliance boilerplate from the joined text.
    const descParts: string[] = [];
    let location: string | null = null;

    for (let i = edIdx + 1; i < nextTitleStart; i++) {
      const line = cleaned[i];
      if (!line || line.length < 4) continue;
      if (isDateLine(line) || ANY_DATE_RE.test(line)) continue;

      // Explicit "Location: X" label → capture value.
      const locLabelMatch = LOCATION_RE.exec(line);
      if (locLabelMatch) {
        if (!location) location = cleanLine(locLabelMatch[1]);
        continue;
      }

      // Bare location value (Fix 3) → capture before the ignore-header check.
      if (LOCATION_VALUE_RE.test(line)) {
        if (!location) location = line;
        continue;
      }

      if (isIgnoreHeader(line)) continue;

      descParts.push(line);
    }

    // Fix 2: strip boilerplate from joined description.
    const description = stripBoilerplate(descParts.join(" ").trim());

    const key = normKey(accommodationName);
    if (seen.has(key)) continue;
    seen.add(key);

    const rawSnippet = rawLines
      .slice(range.start, Math.min(range.start + 20, nextTitleStart))
      .join("\n")
      .slice(0, 600);

    results.push({
      accommodationName,
      category: classifyText(accommodationName + " " + description),
      description,
      rawText: rawSnippet,
      sourceSection,
      startDate,
      endDate,
      location,
    });
  }

  return results;
}

// ─── Section 6 fallback: known-accommodation keyword extraction ───────────────
//
// When Section 6 has no date-anchored blocks (e.g. checkbox-style assessments),
// we scan for lines that match a known accommodation category. This is
// intentionally strict — we only promote a line to an accommodation if it
// matches a named category pattern, so form labels, table headers, single words,
// grade labels, and boilerplate sentences are all excluded.

function extractSection6LineItems(rawLines: string[]): ParsedAccommodation[] {
  const cleaned = rawLines.map(cleanLine);
  const results: ParsedAccommodation[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < cleaned.length; i++) {
    const line = cleaned[i];
    if (!line || line.length < 4 || line.length > 120) continue;
    if (isIgnoreHeader(line)) continue;
    if (isDateLine(line) || ANY_DATE_RE.test(line)) continue;
    if (LOCATION_RE.test(line)) continue;

    // Whitelist gate: only extract lines that exactly match a known assessment
    // accommodation phrase. Everything else — table headers ("Universal Tools:"),
    // grade labels ("Grades 9-12"), section titles ("Assessment AreaAssessment"),
    // rationale text, single words ("State", "Determined", "Participating") —
    // does not match the whitelist and is silently skipped.
    if (!matchesSec6Whitelist(line)) continue;

    const key = normKey(line);
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      accommodationName: line,
      category: classifyText(line),
      description: "",
      rawText: line,
      sourceSection: "Section 6",
      startDate: null,
      endDate: null,
      location: null,
    });
  }

  return results;
}

// ─── Main extraction function ─────────────────────────────────────────────────

function extractAccommodations(rawText: string): {
  accommodations: ParsedAccommodation[];
  warnings: string[];
} {
  // Fix 4: strip PDF header/footer lines (DOB:, UIC:, IEP Date:, Operating District:, Page N)
  // before section detection so they never contaminate accommodation blocks.
  const lines = rawText
    .split(/\r?\n/)
    .filter((l) => !FOOTER_LINE_RE.test(cleanLine(l)));
  const warnings: string[] = [];

  // Section 5
  const sec5 = findSection(lines, SEC5_START, SEC5_END);
  if (!sec5.found) warnings.push("Section 5 (Supplementary Aids and Services) was not found in this document.");

  // Section 6
  const sec6 = findSection(lines, SEC6_START, SEC6_END);
  if (!sec6.found) warnings.push("Section 6 (Assessment Participation and Provisions) was not found in this document.");

  const sec5Accs = sec5.found ? parseDateAnchoredBlocks(sec5.lines, "Section 5") : [];
  let sec6Accs: ParsedAccommodation[] = [];

  if (sec6.found) {
    sec6Accs = parseDateAnchoredBlocks(sec6.lines, "Section 6");
    if (sec6Accs.length === 0) {
      // Fallback: scan for known accommodation keywords (checkbox-style Section 6)
      sec6Accs = extractSection6LineItems(sec6.lines);
    }
  }

  const accommodations = [...sec5Accs, ...sec6Accs];

  // Warn only on records that are missing dates — suppress for Section 6 fallback
  // items (no dates expected in checkbox-style sections) to avoid noise.
  for (const a of accommodations) {
    const isDateAnchored = a.startDate !== null || a.endDate !== null;
    // If the record has neither date, it came from the fallback — skip date warnings.
    // Only warn when one date is present but the other is missing.
    if (isDateAnchored) {
      if (!a.startDate) warnings.push(`Start Date missing for "${a.accommodationName}" (${a.sourceSection})`);
      if (!a.endDate)   warnings.push(`End Date missing for "${a.accommodationName}" (${a.sourceSection})`);
    }
  }

  if (accommodations.length === 0) {
    warnings.push("No accommodations were extracted. The PDF may use an unsupported format or the text may not be machine-readable.");
  }

  return { accommodations, warnings };
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  const data = await pdfParse(buffer);
  const rawText: string = data.text ?? "";
  const pageCount: number = data.numpages;

  const { accommodations, warnings } = extractAccommodations(rawText);

  return { rawText, pageCount, accommodations, warnings };
}
