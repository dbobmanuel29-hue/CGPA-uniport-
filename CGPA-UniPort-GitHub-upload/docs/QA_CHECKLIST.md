# Frontend QA And Integration Review

## Verification Status

- The production Vite build was run successfully during implementation.
- Source inspection confirms routes exist for every requested public, auth, onboarding, student and admin page.
- The former fabricated catalogue and in-memory saved academic records were removed.
- Only appearance preferences use localStorage; calculation inputs stay in memory.
- Native calculation/service test files are included. They are separate from the build and must be run with `node --test tests/*.test.mjs`.
- A browser automation/device testing tool was not available in the implementation environment. The checks below are a handoff checklist, **not a claim of executed browser testing**.
- Backend success paths, permissions, payments and verified reports cannot be validated until real adapters are provided.

## Responsive Matrix

Review at 360, 375, 390, 412, 768, 1024, 1280 and 1440+ CSS pixels. Test Android Chrome and iOS Safari as well as desktop browsers. Resize while modals and tables are open.

Expected behavior: mobile public menu, full workspace navigation in a dialog, five-item bottom navigation, stacked calculator rows, horizontally scrollable data tables, readable inputs, responsive two/one-column forms and safe-area space below the mobile navigation. Confirm no page-level horizontal overflow.

## Local Calculation Flows

1. Open `#/app/calculator`. Enter three arbitrary test rows: 3 units/5 points, 2 units/4 points, 3 units/5 points. Expect 8 units, 38 quality points and GPA 4.75 on the selected 5-point scale.
2. Change the first row. The previously calculated result should clear instead of remaining stale. Recalculate.
3. Try duplicate course codes, blank required values, negative units, fractional units and points above the selected maximum. Expect validation messages.
4. Remove rows, add rows, cancel a clear confirmation, then confirm clear. Only local inputs should change; no academic table should acquire saved rows.
5. Navigate away and back. Draft rows remain in memory. Reload the browser. Draft rows reset.
6. Choose Save semester. Context selectors show real data or an honest disconnected state. No academic record appears without backend acceptance.
7. Open `#/app/cgpa`. Enter 30 units and 110 quality points. Expect 3.67 displayed, with unrounded precision in the calculation.
8. Open `#/app/target`. Enter current 3.50, completed 60, remaining 60, target 4.50. Expect required GPA 5.50, maximum achievable CGPA 4.25 and Impossible.
9. Test zero remaining units with targets above and below current CGPA. No division-by-zero or NaN display should occur.
10. Open `#/app/projection`. Use current 3.50, completed 60, remaining 60. Future GPA 4.50 should project to 4.00. Move the slider and enter a custom GPA.

## Public Pages

Check every navigation and footer link. Exercise homepage credit/point selectors, GPA/CGPA/grade chart tabs, projection scenarios, feature filters and FAQ details. All numeric marketing examples must show a Demo preview label and must not populate student records.

Contact form: required fields should validate. While disconnected, submitting shows an explanation and retains the draft. It must not show a received confirmation. Legal index links should scroll within the legal page without replacing the hash route.

## Authentication

Check empty/invalid email, missing password, registration mismatch, password visibility, remember-me checkbox and terms checkbox. Login/register/Google/reset calls must reject while unconfigured, not redirect to a fabricated signed-in state. The password field must not be stored locally.

After connecting real adapters, verify returned users have IDs, remember-me matches persistence, failed credentials remain in the form, reset behavior does not disclose account existence, and auth-state subscriptions clear revoked sessions. Reauthentication must be handled for password/email changes and account deletion.

## Onboarding And Profile

University must remain locked to UNIPORT with no other school options. Confirm faculty changes reset department/programme selections. Verify all lists are backend-supplied and partial/unrelated IDs are rejected server-side.

Photo UI: test a valid JPEG/PNG/WebP, unsupported file and a file larger than 3 MB. Local previews must be marked not uploaded and object URLs should be released when replaced/closed. A failed upload must not change the stored profile picture.

## Academic Records And Admin CRUD

With an authorized development backend, add, view, edit and delete a disposable record. Confirm the list refreshes only after success. Try cancel, rejected permissions, validation failure, network failure and repeated clicks. Forms must remain visible on failure. For large catalogues, test server pagination integration in the shared data layer.

Exercise search, sortable table headings, session/semester/level filters, reset filters and pagination. View semester summaries with and without matching records. Review all nine academic CRUD entity tabs. Validate parent relationships, numeric bounds, date ranges and source references.

## Support And Notifications

Test each ticket state and notification category. Create a support request, open its conversation, reply, assign an agent, add an internal note and change status through real adapters. Student endpoints must never return internal notes. Closed tickets should reject replies according to server policy.

Read/unread filters, mark one/all read and delete must refresh only after backend success. Compose preview is an unsaved draft. Sending/scheduling should require confirmation; scheduling must reject past dates.

## Reports And Payments

Preview layout must never be presented as an already generated verified report. Actual Generate/Print/Download flows must use report-service outputs. Test print output, signed URL expiration, rejected access, blob download and report selectors. Ensure document metadata matches the selected request.

Academic report title must remain CGPA+ Academic Report with a non-transcript disclaimer. Test provider initialization only against an approved sandbox backend. No successful transaction, entitlement or subscription should be fabricated locally. Validate amount conversion and currency at the adapter boundary.

## Motion And Long Pages

Scroll the full homepage and confirm each section reveals once and stays visible. Sections must never remain blank after scrolling past them. Scroll quickly to the footer and back up; revealed sections should not reset or re-animate.

Check the homepage metric counters animate once on entry and settle on 16, 1, 4 and 0. Confirm the capability marquee loops seamlessly and pauses on hover. Test the hero scroll cue: it must scroll to the metrics band without changing the hash route or triggering the not-found page.

Change the feature filter on the Features page and confirm the grid re-animates without layout jumps. Switch homepage showcase tabs, analytics tabs and projection scenarios; animated values should update smoothly and remain readable to screen readers through their live regions.

Enable reduced motion at the operating system level and reload. All reveals, counters, marquees, the reading progress bar and hover lifts must be disabled, with all content visible immediately. Also verify with JavaScript throttled on a slow connection that no section is stuck hidden.

## Accessibility

Tab through navigation, forms, dialogs, FAQs and controls. Test skip links without breaking routes. Check keyboard focus on route changes, Escape/backdrop dismiss, native dialog focus containment and focus return. Test screen-reader status text, errors, disabled selectors and field labels. Ensure status information is communicated in text as well as color.

Enable reduced motion. Test light/dark/system modes and a live system theme change. Check long names, course titles, messages, notification content and translated date/currency values for overflow. Test zoom to 200% and touch targets on actual phones.

## Security Handoff

Open `#/admin` while signed out; the shell is intentionally visible for frontend review. No private records must be returned. Verify all admin APIs enforce claims server-side. Test direct object-ID access, cross-student requests, role changes and signed-out token reuse. No frontend key, hidden control or local preference may grant privileges.

Before production, finalize legal copy, support contact information, data retention, security rules, payment policies and backend audit logging. Self-host external font/photo assets if the production privacy/performance policy requires it.