# CGPA+ UniPort

**Your UniPort Academic Journey, Simplified.**

An independent academic companion **built for University of Port Harcourt students**, Rivers State, Nigeria. It is not an official university website.

## What This Folder Contains

A newly built frontend with 39 navigable product routes: seven public pages, three authentication pages, onboarding, fifteen student pages, and thirteen admin pages. The prior page/component implementation, in-memory academic records, fabricated catalogue and generated dashboard screenshots were removed.

The frontend includes local GPA/CGPA/target/projection calculators, live marketing previews, responsive workspace navigation, academic result forms, admin academic CRUD interfaces, support conversations, report layouts, notifications, profile/photo controls, light/dark/system appearance, accessible dialogs, shared asynchronous states, and service adapters.

## Runtime And Stack

- **UI:** HTML rendered by React, modular JavaScript/JSX, and plain CSS.
- **Entry point:** `src/App.tsx`, required by this workspace.
- **Build:** Vite. No application backend.
- **Domain logic:** framework-independent JavaScript in `src/utils/` and `src/services/`.
- **Styles:** plain CSS. The inherited Tailwind build dependency is not used by the application.
- **Charts:** lightweight accessible SVG/CSS, without Chart.js or an additional chart dependency.

**Framework exception:** the supplied environment requires React/Vite and `src/App.tsx`. This deliverable therefore is not a vanilla-JavaScript-only application. Services, data contracts and calculations do not depend on React; the view layer does.

## Run Locally

Requires a current Node.js version supported by Vite (Node 22 recommended). Node is only a build/development tool, not an application backend.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For an optimized static build:

```sh
npm run build
npm run preview
```

Deploy the **whole `dist/` directory**, including `images/` and `favicon.svg`. This environment's existing single-file plugin inlines JavaScript and CSS into `dist/index.html`; the hero image is a separate local asset. Source routes use lazy imports, though this inherited build configuration combines them for deployment.

Do not open the source `index.html` by double-clicking it. JSX/TypeScript source requires the Vite build. The built output can be hosted by any static HTTP server. Hash routes do not require individual server route rewrites. No Firebase configuration is needed to inspect the UI or use local calculators. When the public Firebase Web App configuration is provided, the real Firebase adapters activate automatically.

## Project Structure

```text
src/App.tsx                       Required runtime entry point
src/Application.jsx               Route map, lazy page modules, providers, error boundary
src/pages/public/                 Home, About, Features, process, contact, legal
src/pages/auth/                   Login, registration, password reset
src/pages/onboarding/             Locked UniPort onboarding
src/pages/student/                All student tools and account pages
src/pages/admin/                  All admin management pages
src/components/                   Navigation, forms, tables, dialogs, charts, reports, tickets
src/hooks/useResource.js          Loading/success/empty/error lifecycle, retry and race protection
src/state/                        Appearance, real adapter session, isolated calculator draft
src/services/                     Backend interface and injectable service adapters
src/data/                         Locked university, empty catalogue, models, grading contract
src/utils/                        Central math, validation, display, files, routing, preference storage
src/styles/                       Main, components, public, workspace, responsive, refinements
public/images/                    New campus campaign hero (171 KB)
docs/                             Backend contracts and QA checklist
tests/                            Pure calculation and disconnected-service tests
```

## Architecture

```text
Pages / user interface
        |
Reusable components and useResource / useAction
        |
Service modules
        |
configureServices({ auth, academic, admin, ... })
        |
Real Firebase SDK / authenticated server APIs (configured integration)
        |
Firestore / Firebase Storage / trusted payment and email providers (integration-dependent)
```

No page contains direct database calls. All backend-dependent actions use a named service method. Every unconfigured method **rejects with `BACKEND_NOT_CONNECTED`**. A save failure leaves the form open. Tables and records are not optimistically fabricated. Success messages only follow a resolved configured service action.

## Motion And Page Depth

The public pages are long-form marketing and explanation pages. The homepage runs through seventeen sections, and About, Features, How It Works and Support each carry several supporting sections plus a closing call to action.

Motion is handled by `src/hooks/useReveal.js` and `src/styles/motion.css`:

- `useRevealObserver()` runs once in `Application.jsx`. Elements opt in with `data-reveal`, `data-reveal-group` (staggered children), `data-reveal-line` (vertical rails) or `data-reveal-bar` (horizontal fills).
- The hidden starting state only applies after the observer marks the document `reveal-ready`, so content stays visible if scripting or IntersectionObserver is unavailable.
- `useCountUp()` animates the homepage metrics when they scroll into view and returns the final figure immediately when motion is reduced.
- `useScrollProgress()` drives the reading progress bar on public pages.
- Workspace pages animate on load instead of on scroll, since those views are short and data-driven.

Every effect is disabled under `prefers-reduced-motion: reduce`, including the marquee, count-ups, reveals and the progress bar.

## What Works Now

- All navigation, including desktop sidebars, mobile full navigation, bottom navigation and Ctrl/Cmd+K page search.
- Input validation, local weighted GPA, cumulative CGPA, required GPA, maximum achievable CGPA and custom projections.
- Add/remove/clear calculator draft rows. Drafts are isolated from academic records and only live in memory.
- Interactive, explicitly labelled homepage demo previews.
- Feature/category filters, FAQs, settings tabs, form drafts, modal flows and responsive table sorting/pagination for data supplied by adapters.
- Photo selection and object-URL preview (not upload), with size/type checks.
- Light, dark and system preferences. **Only appearance is stored in local storage.**

## What Intentionally Needs A Backend

Real sign-in, registration, Google authentication, email delivery, academic catalogue options, saved academic records, student-specific analytics, graduation requirements, cloud photo upload, support messages, notification changes, payments, actual PDF generation/downloads, admin records, account deletion and audit logs.

Student/admin shells are open for frontend review. That is **not** authentication or authorization. The backend must authenticate and authorize every data request, even if someone reaches an admin hash URL. Empty and error states are genuine, not filled with fictitious student data.

## Backend Handoff

Start with **[docs/BACKEND_INTEGRATION.md](docs/BACKEND_INTEGRATION.md)**. It documents every service method and response shape.

- Register real methods with `configureServices()` **before React mounts** in `src/main.tsx`.
- Firebase Authentication and Google provider integration belong in the `auth` adapter.
- Return a real `UserAccount` from login/register/Google; the UI automatically navigates to onboarding or the workspace.
- Firestore academic/profile/result methods belong in `academic`.
- Firebase Storage upload belongs in `auth.changePhoto` and returns the updated user.
- Firebase Admin SDK, ID-token verification, custom claims, authorization and audit logging belong on the server.
- Payments and report generation belong in server APIs; use signed file URLs or authenticated blobs for downloads.
- Legal pages are draft content and require professional review before production.

There are **no production backend credentials** in this frontend. Never add service account JSON, payment/email secrets, Admin SDK keys or private API keys. Public Firebase web configuration may be added by the integration developer when required.

## Calculation Engine

`src/utils/calculations.js` exports:

| Function | Purpose |
| --- | --- |
| `calculateQualityPoint(credits, points, maxPoint)` | Supplied credit units multiplied by supplied grade points. |
| `calculateGPA(courses, maxPoint)` | Returns GPA, total courses, units and quality points. |
| `calculateCGPA(totalQualityPoints, totalCreditUnits, maxPoint)` | Weighted cumulative average. |
| `calculateProjectedCGPA(current, completed, futureGpa, remaining, maxPoint)` | Projects the cumulative average after future units. |
| `calculateRequiredGPA(current, completed, remaining, target, maxPoint)` | Required future average; can be greater than the scale or Infinity. |
| `calculateMaximumAchievableCGPA(current, completed, remaining, maxPoint)` | Projects using the maximum future GPA. |
| `calculateProgress(completed, required)` | Bounded percentage; null for unknown/zero requirements. |
| `targetOutlook(required, maxPoint)` | Descriptive mathematical planning signal, not academic policy. |

Inputs are validated, impossible zero-credit operations are handled, and precision is retained until display formatting. These estimates are not official institutional results. The server must independently validate stored results and apply official repeat-course rules.

## Academic Data

```text
University of Port Harcourt (UNIPORT, locked)
  -> Faculty
  -> Department
  -> Programme
  -> Academic Version
  -> Level
  -> Semester
  -> Course
```

`src/data/uniport.js` has **no prefilled faculties, programmes, courses, levels or sessions**. Backend selectors are disabled with clear information until real catalogue options are available. `src/data/models.js` documents the relationships.

`src/data/grading.js` contains no official grading rules or classification bands. Local calculators accept numeric grade points and a planning maximum. Institutional classifications are displayed only when `academic.getGradingRules()` supplies matching configuration. The homepage uses a clearly labelled illustrative 5-point example, not official UniPort data.

## Routes

| Group | Route | Page |
| --- | --- | --- |
| Public | `/` or `#/` | Home |
| Public | `#/about` | About |
| Public | `#/features` | Feature explorer |
| Public | `#/how-it-works` | Eight-step process |
| Public | `#/support` | Contact and FAQ |
| Public | `#/terms` | Draft terms |
| Public | `#/privacy` | Draft privacy policy |
| Auth | `#/login` | Login |
| Auth | `#/register` | Registration |
| Auth | `#/forgot-password` | Password reset |
| Onboarding | `#/onboarding` | UniPort academic profile |
| Student | `#/app` | Dashboard |
| Student | `#/app/academic` | Academic record |
| Student | `#/app/calculator` | GPA calculator |
| Student | `#/app/cgpa` | CGPA calculator |
| Student | `#/app/target` | Target / required GPA |
| Student | `#/app/projection` | Scenarios and custom GPA |
| Student | `#/app/analytics` | Academic analytics |
| Student | `#/app/timeline` | Academic timeline |
| Student | `#/app/graduation` | Graduation planning |
| Student | `#/app/failed` | Failed/repeated/outstanding/attention courses |
| Student | `#/app/reports` | Academic report center |
| Student | `#/app/notifications` | Notifications |
| Student | `#/app/support` | Support requests and conversations |
| Student | `#/app/profile` | Personal and academic profile |
| Student | `#/app/settings` | Account preferences and controls |
| Admin | `#/admin` | Admin dashboard |
| Admin | `#/admin/students` | Student directory/details |
| Admin | `#/admin/academic` | All academic entity management |
| Admin | `#/admin/faculties` | Faculty CRUD |
| Admin | `#/admin/departments` | Department CRUD |
| Admin | `#/admin/programmes` | Programme CRUD |
| Admin | `#/admin/courses` | Course CRUD |
| Admin | `#/admin/notifications` | Compose, drafts, schedule and history |
| Admin | `#/admin/support` | Support desk, assignments, notes |
| Admin | `#/admin/payments` | Transactions and details |
| Admin | `#/admin/reports` | Report management |
| Admin | `#/admin/logs` | Searchable audit trail |
| Admin | `#/admin/settings` | Backend-controlled configuration |

Unknown routes display a recovery page, never an empty screen.

## Testing And Review

The production build is checked with `npm run build`. Framework-independent tests are included and can be run separately:

```sh
node --test tests/*.test.mjs
```

The tests are not automatically executed by the inherited Vite build. A browser/device regression pass and real backend success-path integration are still required; see **[docs/QA_CHECKLIST.md](docs/QA_CHECKLIST.md)**. Do not treat a successful frontend build as production authorization or security validation.

## Assets And Performance

The new hero is locally stored, optimized campaign imagery generated for this product. It is not a documentary photo of UniPort's campus. Supporting library photos are delivered from Pexels and loaded lazily. Web fonts use Google Fonts with `display=swap`, plus system fallbacks. External assets can be self-hosted for production.

Motion is restricted to a hero entrance, small transitions and chart reveals. Reduced-motion preferences are respected. No extra runtime packages were installed. The inherited single-file build is approximately 134 KB gzipped for JavaScript, CSS and HTML, excluding the separately loaded hero and fonts.

## Firebase Integration

The project now includes `src/integration/firebase-client.js`, `src/integration/firebase-adapters.js`, `firestore.rules`, `storage.rules`, `firebase.json` and a trusted `functions/` package. See [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) before enabling production data.

## Security: rate limiting

Sensitive callable backend operations use a Firestore-backed fixed-window rate limiter. The limiter keys authenticated requests by Firebase UID and unauthenticated requests by source IP, and rejects requests after the configured threshold with `resource-exhausted`. The admin bootstrap callable is limited to 5 attempts per 15-minute window. Additional callable/API endpoints should use the same `enforceRateLimit()` helper before they are exposed publicly.
