# CHANGE_REQUEST.md
# Streamlined Accommodation Review Workflow

## Objective

Reduce unnecessary clicks during accommodation review.

Current workflow:

Student Page
→ Review Source Document
→ Approve / Reject

This creates extra navigation even when the accommodation details are already visible.

The Student page should become the primary review location.

---

# New Review Workflow

For each Pending Accommodation card display:

- Accommodation Name
- Accommodation Type
- Description
- Location
- Start Date
- End Date

Actions:

- Approve
- Reject
- Review Source

All three actions should appear directly on the card.

---

# Approve Action

When Approve is clicked:

1. Mark accommodation as reviewed.
2. Mark accommodation as approved.
3. Remove from Pending Review section.
4. Add to Active Accommodations section.
5. Refresh counts immediately.

No document navigation required.

---

# Reject Action

When Reject is clicked:

1. Mark accommodation as reviewed.
2. Mark accommodation as rejected.
3. Remove from Pending Review section.
4. Keep record for audit/history.
5. Refresh counts immediately.

No document navigation required.

---

# Review Source Action

Review Source remains available.

Purpose:

- Verify parser output.
- Review original document context.
- Investigate unusual accommodations.

This action should be optional.

Users should never be required to open the source document before approving.

---

# Bulk Actions

Add bulk actions above the Pending Accommodation Review section.

Display:

Pending Accommodation Review (8)

[ Approve All ]   [ Reject All ]

---

# Approve All Behavior

When Approve All is clicked:

1. Show confirmation dialog.

Confirmation:

Approve all pending accommodations for this student?

2. If confirmed:
   - Mark all pending accommodations as reviewed.
   - Mark all pending accommodations as approved.
   - Move all accommodations to Active Accommodations.
   - Refresh counts immediately.

---

# Reject All Behavior

When Reject All is clicked:

1. Show confirmation dialog.

Confirmation:

Reject all pending accommodations for this student?

2. If confirmed:
   - Mark all pending accommodations as reviewed.
   - Mark all pending accommodations as rejected.
   - Refresh counts immediately.

---

# Future Enhancement (Do Not Build Yet)

Possible future feature:

Checkboxes beside accommodations:

☐ Alternative Testing Location
☐ Reduced Writing
☐ Breaks

[ Approve Selected ]
[ Reject Selected ]

Do not implement in this change.

---

# Definition of Done

1. Pending cards contain Approve, Reject, and Review Source actions.
2. Approve can be completed directly from the Student page.
3. Reject can be completed directly from the Student page.
4. Review Source remains available.
5. Users are not required to open the document before approving.
6. Approve All button exists.
7. Reject All button exists.
8. Counts refresh immediately after actions.
9. Active Accommodations update immediately after approval.
10. No parser logic changes.
11. No database schema changes.
12. No document workflow changes.
