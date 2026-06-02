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