# CHANGE_REQUEST.md
# Auto-Create Student From Extracted Page 1 Name

## Objective

The upload now successfully extracts the student name and uses it to generate a clean display filename.

However, the extracted student is not being added to the Students database.

This change should connect Page 1 student name extraction to student record creation/matching.

Do not change:

- Section 5 accommodation parsing
- Section 6 accommodation parsing
- Display filename generation
- Approval workflow
- Review workflow
- Visual labels/borders
- Student count display logic
- Document list UI except where student assignment display updates naturally

---

# Current Behavior

When a full IEP is uploaded:

1. The PDF uploads successfully.
2. The accommodations parse successfully.
3. The student name is extracted from Page 1.
4. The display filename is generated correctly.

Example:

Jones, Jim - 2026 IEP.pdf

But the document remains:

Unassigned

and the extracted student does not appear in the Students database.

---

# Required Behavior

When a document is uploaded and a student name is successfully extracted from Page 1:

1. Search for an existing student with the same normalized name.
2. If a matching student exists, assign the document and accommodations to that student.
3. If no matching student exists, create a new student record.
4. Assign the uploaded document to that student.
5. Assign all extracted accommodations to that student.
6. Show the student name in the Documents list instead of Unassigned.
7. Show the student in the Students page.

---

# Student Matching Rule

Normalize names before matching.

Normalization should:

- Trim whitespace
- Collapse multiple spaces
- Ignore capitalization
- Ignore periods
- Ignore commas when comparing

Examples that should match:

Jones, Jim
Jim Jones
JONES, JIM
Jim  Jones

If the system cannot confidently determine first and last name, use exact normalized full-name matching.

---

# Student Creation Rule

If no existing student match is found, create a new student record using the extracted name.

Minimum student fields:

- displayName
- firstName, if confidently parsed
- lastName, if confidently parsed
- grade: Unknown, unless already extracted
- caseManager: Unassigned
- planType: selected document type, such as IEP

Do not require:

- DOB
- UIC
- parent/guardian information
- address
- phone
- email

---

# Document Assignment Rule

After creating or matching the student:

1. Set document.studentId to the matched or created student ID.
2. Set each extracted accommodation.studentId to the same student ID.
3. Keep document display filename unchanged.
4. Preserve original filename separately.

---

# Upload Result UI

After upload, show:

Extracted Student:

Jones, Jim

Student Record:

Created new student

or

Student Record:

Matched existing student

Document Assignment:

Assigned to Jones, Jim

---

# Documents Page UI

Documents page should show the assigned student name.

Example:

Filename:

Jones, Jim - 2026 IEP.pdf

Student:

Jones, Jim

Do not show Unassigned if a student was successfully extracted and assigned.

---

# Students Page UI

The newly created or matched student should appear in the Students page.

The student row should show:

- Name
- Plan Type
- Pending count
- Approved count
- Total count
- Document count

Counts should reflect the newly uploaded document and extracted accommodations.

---

# Fallback Behavior

If student name extraction fails:

1. Upload should still complete.
2. Document may remain Unassigned.
3. Show a visible warning:

Student name could not be extracted. Document remains unassigned.

If student creation fails:

1. Upload should not silently appear successful.
2. Show a visible error or warning.
3. Do not leave accommodations assigned to a missing student.

---

# Safety Rules

Do not display:

- DOB
- UIC
- parent/guardian information
- address
- phone number
- email

Only use:

- extracted student name
- selected document type
- generated display filename
- plan year

---

# Definition of Done

This change is complete only when:

1. Student name extracted from Page 1 is used to create or match a student record.
2. A newly extracted student appears on the Students page.
3. Uploaded document is assigned to the created or matched student.
4. Extracted accommodations are assigned to the created or matched student.
5. Documents page no longer shows Unassigned when student extraction succeeds.
6. Upload result clearly states whether a student was created or matched.
7. Student counts update correctly after upload.
8. Document counts update correctly after upload.
9. Fallback warning appears if student extraction fails.
10. No DOB is displayed.
11. No UIC is displayed.
12. No parent/guardian information is displayed.
13. Existing accommodation parser behavior is unchanged.
14. Existing display filename behavior is unchanged.
