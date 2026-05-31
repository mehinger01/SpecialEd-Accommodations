# CHANGE_REQUEST.md
# Student List Accommodation Counts Clarification

## Objective

The Students page is currently creating confusion because the Accommodation count does not match the counts shown on the Student Detail page.

The underlying data appears correct.

The issue is presentation and terminology.

This change is UI-only.

Do not change:

- Parser logic
- Database schema
- Approval workflow
- Review workflow
- Student workflow
- Document workflow

---

# Current Problem

The Students page currently shows:

Accommodation Count = 8

while the Student Detail page shows:

Pending Review = 3
Approved = 5

A user naturally assumes:

8 ≠ 5

and concludes the system is incorrect.

In reality:

Total accommodations = 8
Pending accommodations = 3
Approved accommodations = 5

The Students page is displaying Total while the Student Detail page is displaying Approved and Pending separately.

---

# Required Change

Replace the single Accommodation column with three columns.

Current:

Accommodations

New:

Pending
Approved
Total

---

# Column Definitions

## Pending

Display:

Count of accommodations where:

- reviewed = false

Example:

3

---

## Approved

Display:

Count of accommodations where:

- reviewed = true
- approved = true

Example:

5

---

## Total

Display:

Pending + Approved

Example:

8

---

# Example

Current:

Student 12

Accommodations: 8

New:

Student 12

Pending: 3
Approved: 5
Total: 8

---

# Visual Goal

A user should be able to compare:

Students Page

Pending: 3
Approved: 5
Total: 8

with

Student Detail Page

Pending Review: 3
Approved: 5

and immediately understand that the numbers match.

---

# Future Compatibility

These counts should continue to work if:

- Bulk approval is used
- Bulk rejection is used
- Additional accommodation statuses are added later

Counts should always be calculated from the actual accommodation records.

Do not use cached or hard-coded values.

---

# Definition of Done

1. The Students page no longer has a single Accommodation column.
2. The Students page displays Pending, Approved, and Total columns.
3. Pending count matches Student Detail Pending Review.
4. Approved count matches Student Detail Approved.
5. Total equals Pending + Approved.
6. Counts are calculated from actual records.
7. No parser changes.
8. No schema changes.
9. No workflow changes.
10. Users can immediately reconcile list-page counts with detail-page counts.
