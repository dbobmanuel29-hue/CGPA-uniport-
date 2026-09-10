import { Icon } from '../../components/Icon';
import { Notice } from '../../components/ui';
import { PublicCta, PublicHeading } from './Pages';

const legalSections = {
  terms: [
    ['About these terms', 'This is draft legal copy for the CGPA+ UniPort frontend. It requires review by a qualified legal professional before a production service is launched. Use of a future connected service will be governed by the finalized terms displayed at that time.'],
    ['Independent platform', 'CGPA+ UniPort is an independent student-focused planning product. It is not an official University of Port Harcourt website, transcript provider or clearance authority. Nothing on this website represents an official university decision.'],
    ['Calculations and academic data', 'You are responsible for entering accurate units, grade points and academic context. Local outputs are estimates under your stated assumptions. Classifications, repeat policies and programme requirements must come from authorized academic data. Always confirm important decisions with your department.'],
    ['Accounts and acceptable use', 'When authentication is enabled, keep your sign-in credentials private and use only information you are authorized to access. Do not impersonate students, attempt unauthorized access or use the platform to misrepresent academic results.'],
    ['Account inactivity and cleanup', 'To help keep the service secure and avoid retaining accounts that are no longer being used, CGPA+ UniPort may automatically clean up accounts that have been inactive for 12 consecutive months. An inactive account is one that has not had a qualifying sign-in or other recorded account activity during that period. Where the cleanup process applies, the account and associated service data may be permanently deleted. You are responsible for signing in periodically if you want to keep your account active. This policy does not override any legal retention obligation that may require information to be kept for a longer period.'],
    ['Reports and subscriptions', 'CGPA+ Academic Reports are personal planning documents, not official UniPort transcripts. No paid subscription or successful transaction is simulated in this release. Production fees, cancellation terms and refund arrangements must be disclosed before any payment is accepted.'],
    ['Availability and limitations', 'This frontend is provided for product use and integration review. Backend-dependent features are unavailable until real services are configured. No guarantee is made about institutional outcomes, graduation eligibility or the accuracy of user-entered records.'],
    ['Changes and contact', 'Material changes to final terms should be dated and communicated in the connected service. Questions can be submitted through the support form once its backend is connected.'],
  ],
  privacy: [
    ['About this policy', 'This is a draft privacy notice for a frontend application. Actual production data handling depends on the backend implementation and must be documented and legally reviewed before launch. It is not a claim that a particular backend security system is already active.'],
    ['What this frontend stores', 'Only your light, dark or system appearance preference and cookie-consent choice are stored in local browser storage. Calculator inputs and temporary image previews stay in memory while the page is open. No academic record, account or payment is silently created.'],
    ['Future account and academic data', 'A connected service may process your name, email, optional contact details and academic records to provide the features you request. The production service must define the lawful basis, retention periods, access controls and relevant student consent processes.'],
    ['External resources and analytics', 'This frontend loads web fonts from Google Fonts and some example photography from Pexels. These providers may receive normal network information when a browser requests their resources. Optional Google Analytics is consent-gated and only loads when a measurement ID is configured and the visitor accepts analytics. No advertising tracker is intentionally installed.'],
    ['Security and service providers', 'Authentication, database access and photo uploads must use properly secured providers. Secrets belong on the server or managed secret store. Frontend display restrictions cannot substitute for server authorization or Firestore security rules.'],
    ['Your controls', 'You can change appearance locally and decline optional analytics. Account deletion, data export and privacy preference controls are service integration hooks and will not claim completion while disconnected. Production request handling and contact details must be provided before launch.'],
    ['Retention and updates', 'A production policy must explain how long information is retained, how deletion is handled and which jurisdictional obligations apply. Updates should carry a publication date and notice of material changes.'],
  ],
};

export default function LegalPage({ type }) {
  const terms = type === 'terms';
  const sections = legalSections[type] || legalSections.terms;
  return (
    <>
      <PublicHeading eyebrow="TRANSPARENCY MATTERS" title={terms ? 'Terms of service' : 'Your privacy matters.'} description={terms ? 'Clear expectations for an independent academic planning tool.' : 'A clear view of this frontend and the responsibilities of a future connected service.'} meta={[['file', `${sections.length} sections`], ['alert', 'Draft content'], ['shield', 'Pending legal review']]} />
      <div className="container public-content">
        <Notice tone="warning">Draft legal content. Review and finalize this document before accepting production users.</Notice>
        <div className="legal-layout">
          <nav className="legal-index" aria-label="On this page">
            {sections.map(([title], i) => <a href={`#legal-${type}-${i}`} key={title} onClick={e => { e.preventDefault(); document.getElementById(`legal-${type}-${i}`)?.scrollIntoView({ behavior: 'smooth' }); }}>{String(i + 1).padStart(2, '0')}. {title}</a>)}
          </nav>
          <div className="legal-prose">
            {sections.map(([title, body], i) => <section id={`legal-${type}-${i}`} key={title} data-reveal="fade"><h2>{i + 1}. {title}</h2><p>{body}</p></section>)}
          </div>
        </div>
      </div>
      <PublicCta eyebrow="QUESTIONS ABOUT THIS PAGE?" title="We're happy to explain." copy="Reach out through the help center and we will clarify anything that is unclear." primary={['Contact support', '/support']} />
    </>
  );
}
