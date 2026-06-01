---
name: Student auto-assign from Page 1 extraction
description: After PDF parse completes, extracted student name auto-creates or matches a student record and assigns the document + accommodations to it.
---

## Rule
If `result.extractedStudentName` is non-null AND `doc.studentId` is null (no pre-assigned student), run auto-match/create logic in the `setImmediate` parse callback in `documents.ts`.

## Normalization
`normalizeStudentName`: lowercase, strip `.` and `,`, collapse spaces.  
`studentNamesMatch`: exact normalized match OR token-set match (split on space, sort, rejoin) — handles "Jones, Jim" vs "Jim Jones" and "JONES, JIM".

**Why:** Token-set catches name format differences without requiring the upload UI to know which format the PDF uses.

## Outcome fields
- `studentMatchResult`: `"created"` | `"matched"` | `"failed"` | `null`  
- Stored in `documents.student_match_result` DB column.
- Returned by all three document endpoints (list, upload response, detail).

## Student creation defaults
`gradeLevel: "Unknown"`, `caseManager: "Unassigned"`, `planType: doc.documentType` (unless "OTHER" → "NONE").

## Pre-existing documents
Documents parsed before this feature have `studentMatchResult: null` and may still show Unassigned — expected behavior.

## Upload modal display
Shows "Extracted Student", "Student Record: Created/Matched", "Document Assignment: Assigned to [name]", "Generated Filename". Falls back to amber warning if extraction failed.
