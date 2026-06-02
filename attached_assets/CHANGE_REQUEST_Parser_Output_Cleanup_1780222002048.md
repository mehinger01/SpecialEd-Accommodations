# CHANGE_REQUEST.md
# Parser Output Cleanup and UI Display Fixes

## Objective

Fix the current parser/output display issues shown after the latest upload test.

Do not rebuild the app.

Do not change the upload workflow.

Do not change student deletion behavior.

Do not change approval/rejection behavior.

This request is only for:

- Section 5 parser cleanup
- Section 6 date display cleanup
- Upload modal table layout
- Recent Activity filename spelling consistency

---

# Issue 1: Section 5 Is Still Creating One Bad Accommodation

## Current Problem

The parser found 8 accommodations, but one Section 5 accommodation is wrong.

Current bad accommodation name:

accommodation is required to participate in extracurricular and nonacademic activities. General and Special Education Behavior Intervention Plan

This is not an accommodation.

It is boilerplate/location text incorrectly merged with the real accommodation:

Behavior Intervention Plan

## Required Behavior

The Section 5 accommodation should be:

Behavior Intervention Plan

The description should be:

To be used daily in all school settings.

The location should be:

General and Special Education

Do not include boilerplate language in the accommodation name.

Do not include location in the accommodation name.

---

# Issue 2: Remove Boilerplate More Aggressively

## Current Problem

The following boilerplate text is still appearing in accommodation names and descriptions:

accommodation is required to participate in extracurricular and nonacademic activities

## Required Behavior

Remove this phrase and related fragments from both:

- accommodationName
- description

Remove any line or phrase containing:

- accommodation is required to participate
- required to participate in extracurricular
- extracurricular and nonacademic activities

This cleanup should happen after text extraction and before saving records.

---

# Issue 3: Section 6 Should Not Show “Dates Missing”

## Current Problem

Section 6 accommodations display:

Dates missing

That is misleading.

Section 6 assessment accommodations do not have start/end dates in this prototype.

## Required Behavior

For Section 6 records:

- Do not show “Dates missing”
- Do not mark missing dates as a warning
- Leave the date area blank or show:
  - Assessment accommodation

Only Section 5 accommodations should require start and end dates.

---

# Issue 4: Upload Modal Results Table Has Horizontal Overflow

## Current Problem

The upload results modal has a horizontal scrollbar and content is cut off.

## Required Behavior

Fix the modal result display so users can read the extracted accommodations without horizontal scrolling.

Recommended changes:

1. Make the modal wider on desktop.
2. Allow accommodation names and descriptions to wrap.
3. Remove fixed-width table behavior inside the modal.
4. Use stacked cards instead of a wide table if needed.
5. Keep the Close button visible without needing horizontal scrolling.

The upload results should be readable on a normal laptop screen.

---

# Issue 5: Recent Activity Filename Has Typo

## Current Problem

Recent Activity shows the uploaded file as:

accomdattion_example.pdf

The correct uploaded filename should be:

accommodation_example.pdf

## Required Behavior

Use the actual uploaded filename consistently.

If the typo exists only because the uploaded file itself was misspelled, do not rename historical records automatically.

But going forward:

- Display the real filename exactly as uploaded.
- Do not transform or misspell filenames.
- Ensure the filename in upload confirmation, document list, and recent activity match.

---

# Expected Result After Fix

After re-uploading the same PDF:

## Section 5 should show:

1. Universal Tools: Administration of the assessment in an alternate education setting (in school) with appropriate supervision - Special education setting (NE)
2. Alternative testing location
3. Reduced writing
4. Breaks
5. Behavior Intervention Plan

## Section 6 should show:

1. Breaks
2. Alternative testing location
3. Reduced writing

No Section 6 record should show “Dates missing.”

No accommodation name should contain:

- accommodation is required
- extracurricular and nonacademic activities
- General and Special Education

---

# Definition of Done

This change is complete only when:

1. Behavior Intervention Plan appears as its own clean accommodation.
2. No accommodation name contains boilerplate text.
3. No description contains boilerplate text.
4. Location is not included in accommodation names.
5. Section 6 records do not show “Dates missing.”
6. Upload modal results are readable without horizontal scrolling.
7. Close button remains visible in the modal.
8. Recent Activity filename display is consistent with the uploaded filename.
9. Parser still returns approximately 8 accommodations for the current sample.
10. No changes are made to unrelated workflows.
