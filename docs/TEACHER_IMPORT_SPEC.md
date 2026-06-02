# Teacher Import Specification

## Purpose
Populate teacher records for assignment generation and teacher portal access.

## MVP Approach
Use a predefined CSV template.

## Teacher CSV Fields
- first_name
- last_name
- email
- school
- active
- grade_band_k_2
- grade_band_3_5
- grade_band_6_8
- grade_band_9_12

## Import Behavior
- Create new teacher if email does not exist.
- Update existing teacher if email already exists.
- Reject duplicate emails within same upload.
- Validate active values.
- Validate grade-band values.

## V1 Identity Model
Teacher email acts as the login identifier until OAuth is implemented.

## Import Workflow
1. Download template.
2. Complete roster.
3. Upload CSV.
4. Preview records.
5. Validate.
6. Import.
7. Generate assignment candidates.

## Assignment Generation
Assignments are generated from:
- student grade level
- teacher grade-band eligibility

Generated assignments require director review before activation.

## Audit Events
- Teacher imported
- Teacher updated
- Teacher deactivated
- Assignment generation run
- Assignment approval