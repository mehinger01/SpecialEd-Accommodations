# Teacher Import Specification

## Purpose
Populate teacher records for assignment generation and teacher portal access.

## MVP Approach
Use a predefined CSV template with one column per grade level. This supports teachers who serve multiple non-consecutive grades.

## Teacher CSV Fields
Required fields:
- first_name
- last_name
- email
- school
- role
- active
- grade_k
- grade_1
- grade_2
- grade_3
- grade_4
- grade_5
- grade_6
- grade_7
- grade_8
- grade_9
- grade_10
- grade_11
- grade_12

## Role Values
Recommended starting values:
- General Education
- Special Education
- Speech
- OT
- PT
- School Psychologist
- Social Worker
- Behavior Specialist
- Other

## Grade Column Rules
- Each grade column accepts TRUE/FALSE values.
- A teacher may have any combination of grade columns marked TRUE.
- Grade selections do not need to be consecutive.
- At least one grade column should be TRUE for teachers who will receive student assignments.

## Import Behavior
- Create new teacher if email does not exist.
- Update existing teacher if email already exists.
- Reject duplicate emails within the same upload.
- Validate active values.
- Validate grade values.
- Normalize email to lowercase.
- Store active grade levels as an array or equivalent structured format.

## V1 Identity Model
Teacher email acts as the login identifier until OAuth is implemented.

Rules:
- Teacher email must be unique.
- Only active teachers may access the teacher portal.
- Teacher portal access is based on email lookup plus active teacher status.
- Student visibility is still controlled by active teacher-student assignment records.

## Import Workflow
1. Download template.
2. Complete teacher roster.
3. Upload CSV.
4. Preview records.
5. Validate records.
6. Show errors before import.
7. Create or update teacher records.
8. Generate assignment candidates.
9. Director reviews and activates assignments.

## Assignment Generation
Assignments are generated from:
- student grade level
- teacher grade-level eligibility

Example:
- Student grade = 7
- Teacher grade_7 = TRUE
- System creates assignment candidate

Generated assignments require director review before activation.

## Audit Events
- Teacher imported
- Teacher updated
- Teacher deactivated
- Teacher login event
- Assignment generation run
- Assignment approval

## Deferred
- Google OAuth
- Microsoft OAuth
- SIS staff roster sync
- Full teacher management UI
- Automated nightly import