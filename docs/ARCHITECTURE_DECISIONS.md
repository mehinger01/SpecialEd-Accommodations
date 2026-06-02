# Architecture Decisions

## ADR-001: Platform Stack
Decision:
- Firebase will serve as the primary backend platform.

Rationale:
- Faster development
- Scalable beyond a single district
- Supports authentication, database, storage, and hosting
- Better long-term path than Apps Script for a commercial product

---

## ADR-002: Parser Approval Requirement
Decision:
- Parsed data is not automatically treated as official student data.

Rationale:
- Parsing errors are possible
- Accommodation data is compliance-sensitive
- Human review improves trust and accuracy

Rule:
Upload → Parse → Review → Approve → Official Record

---

## ADR-003: Assignment Records Are Source of Truth
Decision:
- Explicit teacher-student assignment records determine access.

Rationale:
- Stronger security model
- Easier auditing
- Supports exceptions and overrides

Rule:
Teachers only see students with active assignment records.

---

## ADR-004: Grade Bands Generate Assignments
Decision:
- Grade bands assist with assignment generation.

Rationale:
- Reduces setup effort
- Matches existing district workflow

Rule:
Grade bands suggest assignments but do not grant access.
Only assignment records grant access.

---

## ADR-005: FERPA First Access Model
Decision:
- Student information follows least-privilege access principles.

Rationale:
- Protect student privacy
- Reduce exposure of sensitive information
- Align with FERPA need-to-know expectations

Rule:
Users see only the information necessary to perform their role.

---

## ADR-006: Audit Trail Requirements
Decision:
- Sensitive actions must generate audit events.

Examples:
- Student record changes
- Accommodation changes
- Assignment changes
- Parser approvals
- Report exports
- Teacher roster imports
- Teacher login events

Rationale:
- Compliance
- Accountability
- Troubleshooting

---

## ADR-007: MVP Focus
Decision:
- Prioritize the core compliance workflow before integrations.

Core Loop:
Parse → Review → Assign → Log → Monitor

Deferred:
- SIS integrations
- Schedule imports
- Advanced analytics
- Enterprise automation

Rationale:
- Faster delivery
- Faster pilot validation
- Lower implementation risk

---

## ADR-008: Teacher CSV as V1 Roster and Identity Source
Decision:
- Teacher records will be populated through a predefined CSV import template for V1.
- Teacher email will serve as the temporary identity key for the teacher portal until OAuth is implemented.

Rationale:
- Faster than building a full teacher management UI first
- Gives districts a familiar setup workflow
- Allows teacher portal access before Google/Microsoft OAuth is ready
- Connects teacher identity, grade-band eligibility, assignments, and audit events around one stable field: email

Rules:
- Teacher email must be unique.
- Teacher email is the V1 login identifier.
- Only active teachers may access the teacher portal.
- Uploaded grade bands may generate assignment candidates but do not directly grant access.
- Active teacher-student assignment records still control visibility.

Deferred:
- Google OAuth
- Microsoft OAuth
- SIS staff roster sync
- Automated nightly staff import