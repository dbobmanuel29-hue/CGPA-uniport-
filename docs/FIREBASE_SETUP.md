# CGPA+ UniPort Firebase setup

The Arena frontend is preserved. This project now has a real Firebase integration seam that activates only when the public Firebase web configuration is present.

## 1. Firebase products

Enable:

- Authentication: Email/Password and Google
- Cloud Firestore
- Cloud Storage
- Cloud Functions (for trusted operations such as admin claims, audit triggers and notification fan-out)

## 2. Frontend configuration

Copy `.env.example` to `.env.local` and add the Firebase Web App values:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

These are public web-app configuration values. Never put service-account credentials in the frontend.

## 3. Deploy rules

```bash
firebase deploy --only firestore:rules,storage
```

The rules intentionally deny arbitrary admin access. Admin access requires an authenticated Firebase custom claim.

## 4. Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Set a temporary bootstrap secret in the trusted Functions environment before using `grantAdminRole`. Do not put this secret in the Vite frontend.

## 5. First admin

Create the first user normally. Then use the trusted `grantAdminRole` function with the bootstrap secret and that user's email. The function sets both `admin: true` and `role: admin` custom claims and mirrors the role into the user document.

The user must refresh their ID token/sign out and back in before the admin claim is reflected in the browser.

## 6. Academic data

No official UniPort catalogue is seeded by this project. Populate the following collections only from verified/authorized academic sources:

- `faculties`
- `departments`
- `programmes`
- `academicVersions`
- `levels`
- `semesters`
- `academicSessions`
- `courses`
- `gradingRules`

The hierarchy remains University of Port Harcourt → Faculty → Department → Programme → Academic Version → Level → Semester → Course.

## 7. Payments

The UI does not choose prices or mark transactions successful. Configure `VITE_PAYMENT_API_URL` to a trusted payment service that authenticates the Firebase ID token, chooses server-side pricing, creates the provider checkout session and verifies webhooks before writing successful transactions/subscriptions.

## 8. Reports and email

Academic report previews are backed by Firestore data. Production PDF generation, signed downloads and email delivery should run through trusted Functions/server infrastructure rather than exposing provider secrets to the browser.
