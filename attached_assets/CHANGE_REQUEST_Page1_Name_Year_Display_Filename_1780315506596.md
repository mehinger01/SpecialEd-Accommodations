# CHANGE_REQUEST.md
# Page 1 Student Name, Plan Year, and Display Filename

## Objective

Add a focused Page 1 extraction step so uploaded IEP documents can use a clean, user-friendly display filename.

This change should extract only:

- Student Name
- Plan Year
- Document Type

Then generate a display filename.

Do not change:

- Section 5 accommodation parsing
- Section 6 accommodation parsing
- Approval workflow
- Review workflow
- Student count logic
- Bulk approve/reject logic
- Visual accommodation type labels
- Database behavior beyond storing/displaying the new filename fields if needed

---

# Current Problem

Uploaded documents currently display the original uploaded filename.

Example:

accomdattion_example.pdf

This is not user-friendly, especially when files are uploaded with typos or inconsistent names.

---

# Required Behavior

When a full IEP PDF is uploaded:

1. Extract the student name from Page 1.
2. Extract the plan year.
3. Generate a display filename using the student name, year, and document type.
4. Show the display filename throughout the UI instead of the raw uploaded filename.

---

# Filename Format

Use this format:

Last Name, First Name - YYYY IEP.pdf

Example:

Smith, John - 2026 IEP.pdf

If the name cannot be confidently split into first and last name, use:

Full Student Name - YYYY IEP.pdf

Example:

John Smith - 2026 IEP.pdf

---

# Student Name Extraction

Extract the student name from Page 1 of the Skyward IEP.

Look for student-identifying labels such as:

- Student
- Student Name
- Name

Use Page 1 as the primary source.

Do not use later page footers as the primary source if Page 1 extraction succeeds.

Footer-based extraction may be used only as a fallback.

---

# Plan Year Extraction

Use the plan end date year as the preferred year.

Priority order:

1. Plan End Date year
2. Implementation End Date year
3. IEP End Date year
4. IEP Date year
5. Footer IEP Date year only if no Page 1 date is available

Example:

Start Date: 12/09/2025
End Date: 12/08/2026

Use:

2026

Generated filename:

Smith, John - 2026 IEP.pdf

---

# Document Type

Use the selected document type from upload.

Supported values:

- IEP
- 504
- BIP

Example output filenames:

Smith, John - 2026 IEP.pdf
Smith, John - 2026 504.pdf
Smith, John - 2026 BIP.pdf

---

# Preserve Original Filename

Do not discard the original uploaded filename.

Store both:

- originalFilename
- displayFilename

Use displayFilename as the primary name in the UI.

Original filename may be shown only in a detail/debug area if needed.

---

# UI Requirements

After upload, show:

Extracted Student:

Student Name

Generated Filename:

Last Name, First Name - YYYY IEP.pdf

Use the generated display filename in:

- Document list
- Recent activity
- Student detail linked documents
- Document detail page
- Upload result summary

---

# Safety Rules

Do not display:

- DOB
- UIC
- Parent/guardian information
- Address
- Phone number
- Email
- Disability details from Page 1

Only extract and display:

- Student Name
- Plan Year
- Document Type

---

# Fallback Behavior

If student name cannot be extracted:

Use the original filename and show a warning:

Student name could not be extracted from Page 1.

If plan year cannot be extracted:

Use the original filename and show a warning:

Plan year could not be extracted.

Do not block the upload if extraction fails.

---

# Definition of Done

This change is complete only when:

1. Student name is extracted from Page 1 when available.
2. Plan year is extracted using the priority order above.
3. Display filename is generated in the required format.
4. Original filename is preserved separately.
5. Document lists show the display filename.
6. Recent activity shows the display filename.
7. Student detail linked documents show the display filename.
8. Document detail page shows the display filename.
9. Upload result summary shows the extracted student and generated filename.
10. DOB is not displayed.
11. UIC is not displayed.
12. Parent/guardian information is not displayed.
13. Existing Section 5 parsing still works.
14. Existing Section 6 parsing still works.
15. Existing approval/rejection workflow still works.
