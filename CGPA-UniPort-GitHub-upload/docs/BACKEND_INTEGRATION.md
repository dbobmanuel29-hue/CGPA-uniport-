# Backend Integration Contract

## Scope And Safety

This is a frontend-only, UniPort-only application. No Firebase SDK, database, payment processor, email provider, server API or authorization system is implemented. The UI will render without those systems, but operations that depend on them reject honestly.

Do not change the locked university identifier: `UNIPORT`.

Use backend ID-token verification, custom claims and Firestore rules for authorization. Do not infer permission from a hash route, hidden button, browser preference, provided student ID or the visibility of an admin screen. Derive the acting user from a verified session. Student-facing APIs should not trust client-supplied ownership fields.

## Registering Adapters

`src/services/adapter.js` exports `configureServices(configuration)` and `BackendNotConnectedError`. Each service is a frozen set of async dispatchers. Register real implementations before `createRoot()` in `src/main.tsx`.

```js
import { configureServices } from './services/index.js';
import { realAuthAdapter, realAcademicAdapter } from './integration/your-real-adapters.js';

configureServices({
  auth: realAuthAdapter,
  academic: realAcademicAdapter,
});
```

The `integration/` files above are an example integration location, not an existing fake backend. Supply actual Firebase or server implementations. The namespace names are `auth`, `academic`, `notification`, `support`, `payment`, `report`, and `admin`.

An implementation must return actual data only after the operation succeeds, and must throw/reject on failure. Do not return a fake `success` object. Map provider errors to a safe `code` and preserve that code for `friendlyError()`. Empty arrays are appropriate only when a real successful read has no records. Do not replace a network error with an empty array.

Common handled error codes: `BACKEND_NOT_CONNECTED`, `auth/invalid-credential`, `auth/email-already-in-use`, `permission-denied`, `unauthorized`, and `network-request-failed`. Unrecognized errors become a generic user-facing message. Raw server stack traces are not shown.

## Conventions

- All dates in response objects must be ISO strings, not Firestore Timestamp instances. Convert Timestamp using the SDK at the adapter boundary.
- List methods return an array or `{ items: [] }`. Tables filter, sort and paginate the supplied list. For large production collections, add server cursor/page handling to the shared table and resource layer rather than duplicating it across pages.
- Entity IDs are stable backend-generated strings. Display labels use `name`, unless a documented object uses `title`, `label` or `fullName`.
- Unknown values should remain null/undefined. Do not supply fabricated zero metrics.
- Monetary amounts at this boundary are in major currency units; the adapter must convert provider minor units. Include `currency`, for example `NGN`.
- URL-bearing responses must contain trusted HTTPS URLs. The frontend file helper rejects non-HTTP(S) schemes and cross-origin plain HTTP.
- Mutations can resolve an updated object or a backend acknowledgement, depending on the method. The UI refreshes authoritative lists only after the mutation resolves.
- `src/data/models.js` documents reusable payload shapes with JSDoc.

## Authentication: `auth-service.js`

| Method | Input | Required real output / behavior |
| --- | --- | --- |
| `login` | `{ email, password, remember }` | `UserAccount`; implement persistence according to `remember`. |
| `loginWithGoogle` | `{ intent: 'login' or 'register' }` | `UserAccount` after actual Google/Firebase authentication. |
| `register` | `{ fullName, email, password, acceptedTerms }` | Newly created `UserAccount`; do not place passwords in Firestore. |
| `sendPasswordReset` | `{ email }` | Resolve only when the auth provider accepts the request. Do not disclose whether an account exists. |
| `logout` | none | Resolve after the provider signs the user out. |
| `getCurrentUser` | none | `UserAccount` or null after auth initialization. |
| `subscribeToAuthState` | callback accepting `UserAccount` or null | Return an unsubscribe function. This optional real listener handles expiry, revocation and external sign-out. The service dispatcher returns it via a promise. |
| `getIdToken` | none | Current user's real ID token. Use internally in authenticated API adapters. |
| `sendEmailVerification` | none | Resolve after the provider accepts a verification request. |
| `updatePassword` | `{ currentPassword, newPassword }` | Reauthenticate as needed, then update the password. |
| `updateAccount` | `{ fullName, email, phone }` | Updated `UserAccount`. Verify/re-authenticate email changes when required. |
| `changePhoto` | `{ file: File }` | Upload via authenticated Firebase Storage/server, return updated `UserAccount`. The browser preview is not an upload. |
| `deleteAccount` | none | Require reauthentication where necessary; perform the documented deletion workflow before resolving. |
| `getSignInMethods` | none | Array of `{ id, label, email }`. |
| `getSessions` | none | Array of `{ id, device, location, lastActiveAt }`. |
| `revokeSession` | session ID | Revoke that session using a privileged server operation. |
| `getPreferences` | none | Account preference object. |
| `updatePreferences` | preference object | Saved preferences from the real account store. |
| `requestDataExport` | none | Acknowledgement of a real export workflow. |

`UserAccount` must have at least `id`, `fullName`, `email`, `onboardingComplete`, `emailVerified` and `accountStatus`. Optional fields include `phone`, `photoUrl`, `role` and `createdAt`. Session state is not stored in localStorage. The UI only accepts a successful login when the adapter returns a user with an ID.

After real login/register/Google success, the UI navigates to `/app` if `onboardingComplete`, otherwise `/onboarding`. The auth listener should provide updated profile/onboarding state when appropriate. Admin routes are intentionally reviewable, but all their requests must be authorized separately.

Preference keys used by the UI are `academicNotifications`, `emailNotifications`, `supportNotifications`, `announcements`, `shareAnalytics` and `profileDiscoverable`. Appearance is a local-only browser setting and is not included in this account preference write.

## Academic: `academic-service.js`

| Method | Input | Output |
| --- | --- | --- |
| `getProfile` | none | `AcademicProfile`. |
| `updateProfile` | academic profile draft with `universityId: 'UNIPORT'` | Saved `AcademicProfile`. Validate all relationship IDs and session order. |
| `getFaculties` | none | `Faculty[]`. |
| `getDepartments` | `{ facultyId }` | Departments belonging to that faculty. |
| `getProgrammes` | `{ departmentId }` | Programmes belonging to that department. |
| `getAcademicVersions` | `{ programmeId }` | Published versions for the programme. |
| `getLevels` | optional `{ programmeId }` | Levels for the programme/current profile. |
| `getSemesters` | optional `{ programmeId }` | Semesters for the programme/current profile. |
| `getAcademicSessions` | none | Academic sessions with IDs and display names. |
| `getGradingRules` | none | Current profile's `{ maxPoint, source, classifications: [{ min, label }] }`, or null if no official policy exists. |
| `getCourses` | optional catalogue filters | `Course[]` for the applicable programme/version/level/semester. |
| `getResults` | `{ sessionId, semesterId, levelId }`, empty filters mean all | `AcademicResult[]` owned by the authenticated student. |
| `getResult` | result ID | One authorized `AcademicResult`. Reserved for deeper detail loading. |
| `saveResult` | `ResultInput` | Saved `AcademicResult`. Recompute and validate quality points server-side. |
| `updateResult` | result ID, `ResultInput` | Updated `AcademicResult`; ensure ownership and policy validation. |
| `deleteResult` | result ID | Acknowledgement only after authorized deletion. |
| `saveSemester` | `{ sessionId, semesterId, levelId, courses: [{ code, title, credits, points }], planningMaxPoint }` | Server-validated saved semester. Resolve grade/curriculum association server-side; do not trust `planningMaxPoint` as official policy. |
| `getDashboard` | none | `StudentDashboard`, described below. |
| `getSummary` | optional `{ sessionId, semesterId, levelId }` | Summary with `gpa`, `cgpa`, `totalCredits`, `qualityPoints`, `maxPoint` and optional `classification`. |
| `getAnalytics` | `{ sessionId }` | `AcademicAnalytics`, described below. |
| `getAcademicTimeline` | none | `{ levels: [{ id, name, status, semesters: [{ id, name, sessionName, status }] }] }`. |
| `getGraduationProgress` | none | Graduation planning data described below, not a frontend eligibility ruling. |
| `getFailedCourses` | none | Authorized failed course rows. |
| `getRepeatedCourses` | none | Authorized repeated course rows based on real academic rules. |
| `getOutstandingCourses` | none | Curriculum-derived outstanding rows. |
| `getAttentionCourses` | none | Backend-flagged rows with explanatory notes. |

Academic record rows use `id`, `code`, `title`, `credits`, `grade`, `points`, `qualityPoints`, `status`, `sessionId`, `sessionName`, `semesterId`, `semesterName`, `levelId` and `levelName`. Course attention lists also accept `note`.

Profile IDs: `facultyId`, `departmentId`, `programmeId`, optional `academicVersionId`, `admissionSessionId`, `currentLevelId`, `currentSessionId`, `currentSemesterId`. Return the corresponding `facultyName`, `departmentName`, `programmeName`, `admissionSessionName`, `currentLevelName`, `currentSessionName` and `currentSemesterName` for display. Optional personal fields are `matriculationNumber` and `phone`.

The frontend does not arbitrarily choose an academic version. The backend should determine the applicable published version from programme/admission context or supply a reviewed version-selection requirement.

### StudentDashboard

```text
summary: AcademicSummary
gpaTrend: [{ label, gpa }]
cgpaProgressPercent: number | null
academicProgress: { percent, completedCredits, remainingCredits }
currentSemester: { name, sessionName, levelName, courseCount, gpa }
recentResults: AcademicResult[]
notifications: Notification[]
```

### AcademicAnalytics

```text
maxPoint: number
stats: {
  cgpa, highestGpa, lowestGpa, averageGpa, totalCredits,
  failedCourses, repeatedCourses, bestSemester, weakestSemester
}
series: [{ label, gpa, cgpa, credits }]
grades: [{ label, value, color? }]
passed: number
failed: number
```

### Graduation Planning

```text
percent, completedCredits, remainingCredits, requiredCredits,
cgpa, currentLevel, outstandingCount, failedCount,
milestones: [{ id, title, completed }]
```

No graduation progress is calculated using invented 120-unit or programme-duration requirements. Timeline status values are `completed`, `current`, and `upcoming`, supplied by the backend.

## Notifications: `notification-service.js`

| Method | Input | Output / behavior |
| --- | --- | --- |
| `getNotifications` | `{ read?: boolean, type?: string }` | `Notification[]`. |
| `markAsRead` | notification ID | Persist the read state, then resolve. |
| `markAllAsRead` | none | Persist read states for the authenticated user's notifications. |
| `deleteNotification` | notification ID | Authorized deletion acknowledgement. |

Notification fields: `id`, `title`, `message` (or `body`), `type`, `read`, `createdAt`. Types: `academic`, `result`, `system`, `support`, `payment`, `announcement`.

## Support: `support-service.js`

| Method | Input | Output / behavior |
| --- | --- | --- |
| `createPublicRequest` | `{ fullName, email, category, subject, description }` | Acknowledgement of a real accepted public request. Rate-limit and sanitize on the server. |
| `getTickets` | `{ scope: 'student' or 'admin', status?, priority? }` | `SupportTicket[]`. Never authorize admin access based only on `scope`. |
| `getTicket` | `{ ticketId, scope }` | Full `SupportTicket` with permitted messages. |
| `createTicket` | `{ subject, category, description, priority }` | Created support ticket owned by the real user. |
| `replyToTicket` | `{ ticketId, message, scope }` | Updated ticket or accepted message. The server must enforce closed-ticket policy. |
| `updateTicketStatus` | `{ ticketId, status }` | Authorized status update. |
| `assignTicket` | `{ ticketId, assigneeId }` | Authorized assignment to an existing support agent. |
| `addInternalNote` | `{ ticketId, message }` | Privileged internal note. Never return internal notes through student endpoints. |

Ticket statuses: `open`, `in_progress`, `resolved`, `closed`. Priorities: `low`, `normal`, `high`. Each conversation message has `id`, `authorName`, `authorRole`, `message`, `createdAt`; internal notes are a separate `internalNotes` array. The frontend also filters the `internal` flag defensively, but the **backend must not disclose internal content in a student response**.

## Payments: `payment-service.js`

| Method | Input | Output / behavior |
| --- | --- | --- |
| `initializePayment` | `{ plan: 'premium' }` | `{ authorizationUrl }` generated by the payment server. Amounts/prices must be chosen by the server. |
| `getTransactions` | `{ status, type, from, to, scope: 'admin' }` | `Transaction[]`. |
| `getSubscription` | none | `{ plan, status, ... }` from the real subscription store. |

Only provider/webhook/server-verified transactions can have successful status. Supported UI statuses: `pending`, `successful`, `failed`, `refunded`. The frontend contains no payment-success screen, fake checkout or client-side crediting logic.

## Reports: `report-service.js`

| Method | Input | Output / behavior |
| --- | --- | --- |
| `getReports` | optional `{ scope, type, from, to }` | Report metadata list: `{ id, name, type, status, createdAt }[]`. |
| `getReportPreview` | report request or `{ reportId, scope? }` | Structured `AcademicReportPreview` or `PlatformReportPreview`. Never arbitrary HTML. |
| `generateReport` | report request | Acknowledged generated/queued report metadata `{ id, status, preview? }`. |
| `downloadReport` | report request plus optional `reportId` | Authenticated `Blob`, trusted HTTPS URL string, or `{ url }`. |
| `printReport` | report request plus optional `reportId` | Structured academic preview, or `{ preview }`. The UI displays this real result before invoking the browser's print dialog. |

Student request types: `summary`, `semester`, `full`, with optional `sessionId` and `semesterId`. Admin types: `academic`, `semester`, `platform`, `payment`, `support`, with `scope: 'admin'`, date filters and optional `studentId`.

An academic preview includes `id`, `studentName`, `sessionName`, `createdAt`, `summary`, `courses`. Platform report previews include `periodLabel`, `metrics: [{ label, value }]`, `columns: [{ key, label }]`, and `rows`.

All academic documents retain the title **CGPA+ Academic Report** and an explicit non-transcript disclaimer. Never present them as an official University of Port Harcourt transcript. The server is responsible for verification, authorization, signatures if applicable, expiry and generation. In production, report identity and request selectors should be validated server-side even if UI state appears consistent.

## Administration: `admin-service.js`

Every method in this namespace requires backend authorization. Use Firebase Admin SDK and custom claims only on a trusted server. Log privileged actions without recording secrets or sensitive raw request payloads.

### Dashboard, Students And Settings

| Method | Input | Output |
| --- | --- | --- |
| `getDashboard` | none | Admin dashboard data described below. |
| `getStudents` | `{ status, facultyId }` | Student rows with `id`, `fullName`, `email`, `facultyName`, `departmentName`, `programmeName`, `levelName`, `cgpa`, `accountStatus`. |
| `getStudent` | student ID | `UserAccount` plus `summary`, `results`, `gpaHistory: [{ label, gpa }]`, and `tickets`. |
| `getAcademicProfile` | student ID | Authorized student's `AcademicProfile`, with display names. |
| `getAuditLogs` | `{ status, resourceType }` | `AuditEvent[]`. |
| `getSettings` | `{ section }` | Saved settings for that section. |
| `updateSettings` | `{ section, settings }` | Server-accepted settings. Validate permissions per setting. |

Admin dashboard shape:

```text
stats: {
  totalStudents, activeStudents, newStudents,
  verifiedAccounts, premiumStudents, supportRequests
}
charts: {
  userGrowth: [{ label, value }],
  registrations: [{ label, value }],
  activeUsers: [{ label, value }],
  subscriptions: [{ label, value, color? }]
}
recentStudents: [{ id, fullName, email, createdAt }]
recentTickets: [{ id, subject, status, createdAt }]
activity: [{ id, action, status, createdAt }]
```

### Academic CRUD

All listed methods are implemented as dispatchers, not fake CRUD. `get*` takes an optional filter object (status and parent IDs) and returns entity rows. `create*` takes a payload. `update*` takes `(id, payload)`. `delete*` takes an ID. Mutations only resolve after real backend validation.

| Entity | Read | Create | Update | Delete |
| --- | --- | --- | --- | --- |
| Faculties | `getFaculties` | `createFaculty` | `updateFaculty` | `deleteFaculty` |
| Departments | `getDepartments` | `createDepartment` | `updateDepartment` | `deleteDepartment` |
| Programmes | `getProgrammes` | `createProgramme` | `updateProgramme` | `deleteProgramme` |
| Courses | `getCourses` | `createCourse` | `updateCourse` | `deleteCourse` |
| Academic versions | `getAcademicVersions` | `createAcademicVersion` | `updateAcademicVersion` | `deleteAcademicVersion` |
| Levels | `getLevels` | `createLevel` | `updateLevel` | `deleteLevel` |
| Semesters | `getSemesters` | `createSemester` | `updateSemester` | `deleteSemester` |
| Academic sessions | `getAcademicSessions` | `createAcademicSession` | `updateAcademicSession` | `deleteAcademicSession` |
| Grading rules | `getGradingRules` | `createGradingRule` | `updateGradingRule` | `deleteGradingRule` |

The canonical form schema is `ENTITIES` in `src/pages/admin/AcademicData.jsx`. Each entity contains `fields`, `columns`, relation dependencies and its service method mapping. CRUD payloads use those keys. Department, programme and version selectors reset downstream IDs when an upstream selection changes. All real entity relationships must be validated on the server; disabled UI fields do not enforce integrity.

Academic entity statuses: `active`, `inactive`. The UI asks for verified course credit units and grades; none are prefilled. Grading rule inputs include source/reference, academic version, grade label, score bounds, points and maximum scale. The server must validate policy overlap, institutional applicability and classification rules before publication. Protect historical results when a version or referenced entity is changed/deleted.

### Notification Administration

| Method | Input | Output / behavior |
| --- | --- | --- |
| `getNotifications` | none | Backend notification history/drafts with title, type, audience, status, scheduledAt and createdAt. |
| `saveNotificationDraft` | compose payload | Saved server-side draft. |
| `sendNotification` | compose payload | Accepted delivery request; backend chooses recipients and enforces authorization. |
| `scheduleNotification` | compose payload with UTC ISO `scheduledAt` | Acknowledgement of a real scheduled job. |

Compose payload: `{ title, message, type, audience, facultyId?, priority, scheduledAt? }`. Types: announcement, academic, system, payment, support. Audiences: all_students, faculty, premium, admins. The backend must recompute audience membership rather than trusting the client.

### Admin Setting Sections

Sections are `general`, `academic`, `notifications`, `payments`, `reports`, `support`, `security`. The `appearance` tab affects only the current browser.

The schema and keys are in `src/pages/admin/Settings.jsx`. All toggles shown while disconnected are **unsaved drafts**, not active policy. Security switches like `requireAdminMfa` must be enforced by server/authentication logic; changing a browser toggle alone does nothing.

## Suggested Firebase Integration Responsibilities

- Auth adapter: initialize Firebase web SDK, await auth readiness, use provider persistence, map current user/profile/claims to the UI contract, subscribe to auth changes and implement reauthentication.
- Academic adapter: query Firestore or authenticated APIs, normalize timestamps, restrict reads to the real user, resolve published academic versions, revalidate calculations on trusted infrastructure.
- Storage adapter: validate content server-side, use user-scoped upload permissions, generate safe download URLs and delete replaced images according to retention policy.
- Admin APIs: verify ID tokens/custom claims, validate every write, reject unsafe relationships, avoid placing Admin SDK credentials in browser code.
- Notifications and email: server-initiated delivery with actual preference checks, opt-out rules, retry policies and rate limits.
- Payments: server pricing, initialization, provider verification/webhooks, idempotency and refund authorization.
- Reports: server-generated reports from authorized data, correct labels, safe download/print access and expiry.
- Audit logs: server-side append-only events with restricted access and an explicit retention policy.

## Deployment Handoff

The current app can be hosted as static files immediately, with backend actions unavailable. For production GitHub/Vercel deployment, connect the repository, select Vite, use the existing build script and deploy `dist`. Configure public environment values only in the frontend build; private secrets belong in the server deployment. Do not enable live user/payment acceptance until rules, claims, legal documents, accessibility, browser QA and backend security are reviewed.