# SPED Accommodations Platform

## Purpose
A FERPA-conscious accommodations management platform designed to help districts manage IEP, 504, and BIP accommodations from document intake through compliance monitoring.

## MVP Goals
- Upload accommodation documents
- Parse accommodation data
- Review and approve extracted information
- Create or update student records
- Assign students to teachers
- Log accommodation delivery
- Monitor compliance through a director dashboard

## Current Status

### Working
- PDF upload
- Parser V1
- Accommodation extraction
- Student-name based filename generation

### In Progress
- Student record creation/update from parser results
- Assignment engine
- Teacher logging workflow
- Director dashboard

## Core Workflow
Upload → Parse → Review → Approve → Student Record → Assignment → Logging → Dashboard

## MVP Cut Line
- Parser intake
- Review and approval workflow
- Student records
- Accommodation records
- Explicit teacher-student assignments
- Teacher restricted visibility
- Teacher accommodation logging
- Director missing-log reporting
- Basic audit trail

## Development Principle
Build the core loop first. Documentation should now support implementation, bug fixing, and handoff rather than expand into additional planning unless a major decision changes.
