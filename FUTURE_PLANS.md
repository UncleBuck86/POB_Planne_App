# Future Plans & Architectural Roadmap (Living Document)

This file captures the long‑term vision so current development stays forward‑compatible with the SaaS / multi‑tenant direction.

## 1. Product Vision
A multi‑tenant POB Planning & Logistics platform that companies can license. Each customer (Tenant) has multiple Locations. Users authenticate into a single tenant and only see authorized locations. Historical (annual) data is archived read‑only with cryptographic integrity for potential legal discovery.

## 2. Multi‑Tenant & Entity Model (Target)
- Tenants (Companies): `tenantId`, name, status.
- Locations: `locationId`, `tenantId`, name, active.
- Users: `userId`, `tenantId`, email, name, passwordHash (+ optional MFA secret).
- User Location Roles (many): `{ userId, locationId, role }`.
- Roles (coarse):
  - `SUPER`: Company scope (all locations, manage users, billing, archives).
  - `ADMIN`: Specific location(s) management (planner data, manifests, personnel at location).
  - `USER`: Operational edits (planner cells, manifests, personnel records) within assigned location(s).
  - `VIEWER`: Read‑only.
- Core Data (all row scoped by `tenantId` + optional `locationId`):
  - Planner entries (normalized vs current wide table representation—see Section 6).
  - Flight manifests (structured JSON + extracted indexed fields).
  - Personnel records.
  - Audit log (append‑only chain).
  - Archives (annual bundles with seals).

## 3. Authorization Strategy
Backend will enforce tenancy + role. Frontend only provides *hinted* UI gating. Every mutating API call includes auth token (JWT) containing `tenantId` and role claims. Optional per‑location claims array.

## 4. Audit / "Ghost" Log
- Append‑only table: `audit_log` (tenantId, locationId?, actorUserId, actorRole, entityType, entityId, action, before, after, ts, prevHash, hash).
- Hash chain: `hash = SHA256(prevHash + canonicalJSON(rowWithoutHash))`.
- Daily seal: compute `dayHash` of chronological hashes; store in `audit_day` for integrity verification.
- Yearly export: bundle (audit segment + daily seals + final year seal) -> signed (server private key) + distributed with the archive package.

## 5. Annual Archiving
- At year cutoff: snapshot planner, manifests, personnel, related audit segment.
- Store immutable archive bundle: `{ year, tenantId, createdAt, sha256, dataRef, readOnly:true }`.
- UI year selector; read‑only mode disables all edits.
- Export: JSON + .sha256 + optional signature.

## 6. Planner Data Normalization (Forward Compatible Schema)
Current wide object: `{ company:"Ops", "8/10/2025": 23, ... }`.
Target relational/events:
```
planner_company (id, tenantId, locationId, name, active)
planner_value (id, tenantId, locationId, companyId, date, value, updatedBy, updatedAt)
```
Benefits: smaller diffs, simpler auditing (each change a row), easier aggregation. Frontend can still materialize wide shape for rendering.

## 7. Manifest & Personnel Enhancements
- Manifests: versioning (lock after approval), derived totals, aircraft constraints validation.
- Personnel: status history (arrival/departure events) for duration analytics.

## 8. Storage & Cost Phasing
Phase 1 (Local): continue localStorage but isolate logic behind a small adapter (to swap to API later).
Phase 2 (Backend MVP): Postgres + minimal auth + audit.
Phase 3: Multi‑tenant hardening, archives, signed exports.
Phase 4: Advanced analytics, search indexing, role customization.

## 9. Coding Guidelines For Forward Compatibility
1. **Isolation of Persistence**: New data utilities should go through a thin service (e.g., `dataLayer.js`) instead of direct localStorage calls.
2. **Namespacing**: Prefix tenant keys when possible (for now use `pob:` style placeholder to simplify future migration scripts).
3. **Avoid Hard‑Coding Dates**: Always calculate relative to `new Date()`; facilitate archiving cutoffs.
4. **Immutable Patterns**: Prefer pure functions for transforms so server logic can share code.
5. **Config Centralization**: Put new adjustable settings in Admin page with clear grouping (already established pattern). Use descriptive localStorage keys anticipating migration (e.g., `planner:zoom` -> becomes DB setting later).
6. **No Cross‑Tenant Leakage**: Avoid global caches keyed only by company name; always include prospective `tenantId` placeholder in future code comments.
7. **Audit Hooks Ready**: Wrap mutation helpers (`pushUndo` or bulk import) so they can later emit audit events.
8. **Read‑Only Mode Flag**: Respect a single `readOnly` prop at component boundaries. Build this now for archives and viewer role.

## 10. Migration Plan (High Level)
| Step | Milestone | Notes |
|------|-----------|-------|
| 1 | Introduce persistence adapter | Abstract localStorage operations. |
| 2 | Add `readOnly` plumbing to planner/components | Make toggle easy for archives / viewer. |
| 3 | Implement archive utility (local prototype) | Year-suffixed keys + export. |
| 4 | Backend scaffold | Auth, tenants, locations, users. |
| 5 | Port planner to API | Keep local fallback. |
| 6 | Add audit log w/ hash chain | Validate chain verify script. |
| 7 | Introduce role-based UI gating | Hide edit controls. |
| 8 | Deploy archives + signature | Server-side signing. |

## 11. Open Design Questions
- Do we need per-field permission overrides beyond roles? (Defer)
- Event sourcing vs row snapshots? (Revisit after usage metrics)
- Multi-region disaster recovery? (Later enterprise tier)

## 12. Near-Term Actionable Items
- Add `readOnly` support path (prop drilling or context) in table & forms.
- Introduce a thin `storageAdapter` wrapper.
- Prototype archive key naming convention (e.g., `plannerData:2025:tenantDefault`).
- Add Admin placeholders for future tenant/user management sections.

## 13. Glossary
- **Tenant**: Customer company purchasing license.
- **Location**: Operational site under a tenant.
- **Archive**: Immutable annual snapshot.
- **Audit Chain**: Hash-linked sequence of change records.

---
_Last updated: 2025-08-10_
