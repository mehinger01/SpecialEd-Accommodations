# Data Model

## Students
- id
- firstName
- lastName
- gradeLevel
- planType
- status

## Teachers
- id
- firstName
- lastName
- email
- gradeBands
- status

## Student Accommodations
- id
- studentId
- accommodationText
- category
- startDate
- endDate

## Teacher Student Assignments
- id
- teacherId
- studentId
- source
- status

## Accommodation Logs
- id
- teacherId
- studentId
- studentAccommodationId
- serviceDate
- deliveryStatus
- notes

## Parser Results
- id
- uploadedDocumentId
- extractedStudent
- extractedAccommodations
- reviewStatus