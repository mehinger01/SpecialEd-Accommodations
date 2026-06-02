# CHANGE_REQUEST.md
# Student Counts, Location Extraction, and Pending Review Cleanup

## Objective

Fix the remaining issues from the latest test import and student page review.

Do not rebuild the app.

Do not change:

- Upload workflow
- Student deletion behavior
- Document deletion behavior
- Accommodation deletion behavior
- Approval/rejection behavior
- Section 6 whitelist logic
- Page 1 parsing

This request is only for:

1. Correct student list counts
2. Correct student detail counts
3. Fix Section 5 location extraction
4. Fix Universal Tools title cleanup
5. Improve Pending Accommodation Review display

---

# Issue 1: Student List Counts Appear Preset

## Current Problem

On the Students page, the Accommodation and Document counts appear to be preset or hard-coded.

Current visible issue:

- Multiple students show the same number of accommodations.
- Multiple students show the same number of documents.
- The counts do not appear to reflect the actual student-specific records.

## Required Behavior

The Students page must calculate counts per student from actual database records.

For each student row:

- Accommodation count = number of accommodations linked to that student
- Document count = number of documents linked to that student

Do not use static values.

Do not use mock values.

Do not use seed/demo values once real uploaded records exist.

## Count Rules

For each student:

```text
Accommodations = count(accommodations where accommodation.studentId = student.id)
Documents = count(documents where document.studentId = student.id)
```

If a student has no linked records, show:

```text
0
```

---

# Issue 2: Student Detail Counts Need to Match Actual Records

## Current Problem

The student detail page now shows pending accommodations, which is good.

However, the top-level counts need to match the underlying student-specific records.

## Required Behavior

On the Student Detail page, show:

- Pending Review = count of accommodations for this student where isReviewed is false
- Approved = count of accommodations for this student where isApproved is true
- Active Accommodations = approved accommodations only

## Display Rule

If a student has 8 pending accommodations and 0 approved accommodations, display:

```text
Pending Review: 8
Approved: 0
Active Accommodations: 0
```

This is acceptable as long as the pending accommodations are visible directly on the page.

---

# Issue 3: Location Extraction Still Returns Null

## Current Problem

The latest JSON still shows:

```json
"location": null
```

for all Section 5 records, even though the raw text includes location values such as:

```text
General
and
Special
Education
```

and

```text
General and Special
Education
```

## Required Behavior

For Section 5 records, detect the following location patterns:

```text
General
and
Special
Education
```

```text
General and Special
Education
```

```text
General and Special Education
```

Normalize all of them to:

```text
General and Special Education
```

Store that value in:

```json
"location": "General and Special Education"
```

## Important

Do not remove the word `Special` from Universal Tools titles.

Location cleanup must only remove location phrases when the phrase is acting as a standalone location field.

Do not globally strip every instance of the word `Special`.

---

# Issue 4: Universal Tools Title Was Damaged

## Current Problem

The latest JSON changed the Universal Tools title to:

```text
Universal Tools: Administration of the assessment in an alternate education setting (in school) with appropriate supervision - (NE)
```

This is wrong.

It removed:

```text
Special education setting
```

from the accommodation name.

## Required Correct Title

The correct accommodation name is:

```text
Universal Tools: Administration of the assessment in an alternate education setting (in school) with appropriate supervision - Special education setting (NE)
```

## Required Behavior

Do not strip:

```text
Special education setting
```

from accommodation names.

Only strip location phrases when they appear as standalone location values, such as:

```text
General and Special Education
```

The phrase:

```text
Special education setting (NE)
```

is part of the accommodation name and must remain.

---

# Issue 5: Description Cleanup Still Leaves Location Fragments

## Current Problem

The Universal Tools description currently shows:

```text
Alternative setting for testing due to executive functioning deficits General etc.
```

This is not clean.

## Required Behavior

The Universal Tools description should be:

```text
Alternative setting for testing due to executive functioning deficits
```

Remove location fragments such as:

```text
General etc.
```

or

```text
General Special Education etc.
```

from descriptions.

---

# Issue 6: Pending Accommodation Review Page Needs Better User Clarity

## Current Problem

The Pending Accommodation Review section is now visible, which is good.

However, users still need a clear path for what to do next.

## Required Behavior

In the Pending Accommodation Review section, add a clear instruction line:

```text
Review these accommodations in the linked source document before they become active for staff.
```

Each pending accommodation card should show:

- Accommodation name
- Source section
- Category
- Description
- Start date, if present
- End date, if present
- Location, if present
- Link/button to review source document

The source document review link should be clearly labeled:

```text
Review in Source Document
```

Do not rely on users knowing that clicking the linked document is the next step.

---

# Expected Correct Parser Output for Current Sample

## Section 5

1. Universal Tools: Administration of the assessment in an alternate education setting (in school) with appropriate supervision - Special education setting (NE)

   Description:
   Alternative setting for testing due to executive functioning deficits

   Location:
   General and Special Education

2. Alternative testing location

   Description:
   Alternative setting for testing due to executive functioning deficits

   Location:
   General and Special Education

3. Reduced writing

   Description:
   Reduced by 1/3 due to executive functioning and attentional capabilities

   Location:
   General and Special Education

4. Breaks

   Description:
   Student will have one 5 minute break per class as determined necessary by the teacher/student. When the student is feeling frustrated, the student will take a 5 minute break in the designated break spot.

   Location:
   General and Special Education

5. Behavior Intervention Plan

   Description:
   To be used daily in all school settings.

   Location:
   General and Special Education

## Section 6

Keep current Section 6 whitelist behavior.

Section 6 accommodations may have:

```json
"location": null
```

That is acceptable for now.

---

# Definition of Done

This change is complete only when:

1. Student list accommodation counts are calculated from actual student-specific records.
2. Student list document counts are calculated from actual student-specific records.
3. Student detail Pending Review count matches actual pending accommodations for that student.
4. Student detail Approved count matches actual approved accommodations for that student.
5. Universal Tools title includes `Special education setting (NE)`.
6. No accommodation name contains `General and Special Education`.
7. Section 5 location is populated as `General and Special Education` when present.
8. Section 5 descriptions do not contain location fragments.
9. Universal Tools description is clean.
10. Pending Accommodation Review includes clear user instructions.
11. Pending cards include a clear `Review in Source Document` action.
12. Section 6 whitelist behavior is unchanged.
13. No unrelated workflows are changed.
