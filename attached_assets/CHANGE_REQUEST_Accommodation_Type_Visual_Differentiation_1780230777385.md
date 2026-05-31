# CHANGE_REQUEST.md
# Accommodation Type Visual Differentiation

## Objective

Users are interpreting Section 5 and Section 6 accommodations as duplicate records.

The parser is behaving correctly.

The issue is visual differentiation.

This change is UI-only.

Do not change:

- Parser logic
- Database schema
- Accommodation records
- Approval workflow
- Student workflow
- Review workflow

---

# Current Problem

Users see:

- Alternative testing location
- Alternative testing location

and naturally assume the system created duplicates.

In reality:

- Section 5 = Classroom accommodation
- Section 6 = Assessment accommodation

The current UI does not make this distinction obvious.

---

# Change 1: Replace Section Labels

## Current

Section 5

Section 6

## New Labels

Replace:

Section 5

with:

📘 Classroom Accommodation

Replace:

Section 6

with:

📝 Assessment Accommodation

Apply this change everywhere accommodations are displayed:

- Pending Review cards
- Active Accommodation cards
- Document Review page
- Accommodation detail pages

---

# Change 2: Color-Coded Border Treatment

Do NOT add large banners.

Do NOT add additional rows.

Do NOT add visual clutter.

Instead, use border colors to reinforce the accommodation type.

---

## Classroom Accommodation Cards

For Section 5 accommodations:

- Keep current card layout
- Keep current content
- Use a blue left border
- Border should be clearly visible

Meaning:

Classroom / Daily Instruction

---

## Assessment Accommodation Cards

For Section 6 accommodations:

- Keep current card layout
- Keep current content
- Use a purple left border
- Border should be clearly visible

Meaning:

State and District Testing

---

# Visual Goal

At a glance:

Blue Border = Classroom Accommodation

Purple Border = Assessment Accommodation

Combined with the new labels:

📘 Classroom Accommodation

📝 Assessment Accommodation

users should immediately understand why similar accommodation names appear more than once.

---

# Accessibility

Do not rely solely on color.

The accommodation type labels must remain visible:

📘 Classroom Accommodation

📝 Assessment Accommodation

The border color should reinforce the distinction.

---

# Definition of Done

This change is complete only when:

1. Section 5 labels are replaced with "📘 Classroom Accommodation".
2. Section 6 labels are replaced with "📝 Assessment Accommodation".
3. Section 5 cards display a blue left border.
4. Section 6 cards display a purple left border.
5. Existing card layout remains intact.
6. No large banners are added.
7. No parser behavior changes.
8. No database changes.
9. No workflow changes.
10. Users can immediately distinguish classroom accommodations from assessment accommodations.
