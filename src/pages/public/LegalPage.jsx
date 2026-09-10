import { Icon } from '../../components/Icon';
import { PublicCta, PublicHeading } from './Pages';

const legalSections = {
  terms: [
    ['Who these terms are for', 'These Terms of Service govern your use of CGPA+ UniPort, an independent student-focused academic planning platform for University of Port Harcourt students. By using the website, calculators or an account, you agree to use the service lawfully and responsibly.'],
    ['What CGPA+ UniPort provides', 'CGPA+ UniPort provides academic planning tools including GPA and CGPA calculations, result organization, projections, target planning, analytics, timelines, support and related account features. The platform is independent and is not owned, operated, endorsed or administered by the University of Port Harcourt.'],
    ['Academic information and calculations', 'You are responsible for the accuracy of information you enter. Calculations are planning tools based on the data and grading assumptions available to the service; they are not official transcripts, result statements, clearance decisions or guarantees of graduation or degree classification. Where an official university record conflicts with CGPA+, the official university record controls.'],
    ['Your account', 'If you create an account, you must provide information that is accurate and keep your authentication credentials secure. Do not share access to another person, impersonate another student, access records you are not authorized to access, or use the platform to falsify or misrepresent academic information.'],
    ['Student records and uploaded content', 'Information you submit to your account is used to provide the features you request. You remain responsible for ensuring that you have the right to submit any academic information, profile image or other content you provide. You must not upload unlawful, malicious or infringing material.'],
    ['Reports and personal planning documents', 'CGPA+ Academic Reports are generated for personal reference and planning. They are not official University of Port Harcourt transcripts or certificates and must not be presented as official university documents.'],
    ['Acceptable use and security', 'You must not attempt to bypass authentication or authorization, interfere with the service, probe or attack its infrastructure, submit malicious code, abuse support channels, scrape private student information, or use another person’s account. We may restrict access where reasonably necessary to protect users, records or the service.'],
    ['Availability and changes', 'We may improve, modify, suspend or discontinue features as the product develops. We do not promise uninterrupted availability or that every academic rule, programme requirement or institutional process will always be represented. Material changes to these terms will be reflected on this page with an updated effective date.'],
    ['Account deletion and inactive accounts', 'You may request deletion of your account through the available account controls or support channel. Where the service applies an inactive-account cleanup process, an account may be removed after 12 consecutive months without qualifying activity, subject to applicable legal or security retention requirements. Deletion may be permanent.'],
    ['No paid service in this release', 'CGPA+ UniPort is currently offered without user payment or subscription checkout. No payment, refund or cancellation promise applies unless a paid feature is introduced and its terms are published before payment is accepted.'],
    ['Contact and governing requirements', 'Questions, complaints and account concerns should be submitted through the CGPA+ UniPort support channel. The service operates from Nigeria and will comply with applicable Nigerian law, including applicable data-protection requirements. These terms do not remove rights that cannot lawfully be excluded.'],
  ],
  privacy: [
    ['Who controls your information', 'CGPA+ UniPort is an independent student-focused platform for University of Port Harcourt students. It is not a University of Port Harcourt system. This notice explains how CGPA+ handles personal information when you use the website and connected account features.'],
    ['Information we collect', 'Depending on the features you use, CGPA+ may receive your name, email address, authentication identifiers, account status, academic profile information, courses and results you choose to save, support messages, notification preferences, profile image information, report records and technical information needed to operate and secure the service. Public calculator use does not require an account.'],
    ['Why we use information', 'We use account information to authenticate you and maintain your account; academic information to calculate, organize and display the academic tools you request; support information to respond to you; profile information to personalize your account; notification data to deliver service messages; and technical information to maintain security, reliability and performance. We do not sell your personal information.'],
    ['Legal basis and Nigerian data protection', 'Where the Nigeria Data Protection Act 2023 applies, processing is carried out on an applicable lawful basis such as performance of a requested service, consent, compliance with a legal obligation, or another lawful basis recognized by the applicable data-protection framework. We aim to follow the principles of lawful, fair and transparent processing, purpose limitation, data minimization, accuracy, storage limitation, security and accountability.'],
    ['Academic information is sensitive to us', 'Your academic record can be personally identifying and important to you even where it is not legally classified as sensitive personal data. We therefore limit access to authenticated users for their own records and authorized administrators for legitimate service operations. You should not enter another student’s information unless you are authorized to do so.'],
    ['Service providers', 'CGPA+ uses third-party infrastructure to operate requested features, including Firebase for authentication and database services, Cloudinary for profile-image uploads where configured, Vercel for website hosting, and optional analytics when enabled. These providers process information only as necessary for the services they provide and according to their own applicable terms and privacy practices.'],
    ['Cookies, local storage and analytics', 'The website uses browser storage for functional preferences such as appearance and cookie-consent status. Optional Google Analytics is consent-gated and is loaded only when an analytics measurement ID is configured and you accept analytics. We do not intentionally install advertising trackers. You can decline optional analytics through the consent control.'],
    ['Retention and deletion', 'We keep information only for as long as it is needed for the purposes described here, account operation, security, dispute handling or applicable legal obligations. You can request account deletion through the available account controls or support channel. Some records may need to be retained for a limited period where required for security, fraud prevention or legal compliance.'],
    ['Your privacy rights', 'Subject to applicable law, you may have rights to request access to your personal information, correction of inaccurate information, deletion, restriction or objection to certain processing, portability where applicable, and withdrawal of consent where consent is the lawful basis. Requests can be made through CGPA+ support. We may need to verify your identity before completing a request.'],
    ['Security', 'We use access controls, authenticated service boundaries and security rules intended to prevent unauthorized access. No internet service can guarantee absolute security, so you should protect your password and report suspected unauthorized access promptly.'],
    ['Children and student users', 'CGPA+ is designed for university students and is not intended to knowingly collect personal information from children who are not permitted to use the service under applicable law. If you believe information was submitted by a child without appropriate authorization, contact support so it can be reviewed.'],
    ['Updates and complaints', 'This notice may be updated when the service, providers or legal requirements change. The effective date shown on this page will be updated when material changes are made. If you believe your privacy rights have been violated, contact CGPA+ first so the issue can be investigated; you may also have the right to complain to the Nigeria Data Protection Commission or another competent authority under applicable law.'],
  ],
};

export default function LegalPage({ type }) {
  const terms = type === 'terms';
  const sections = legalSections[type] || legalSections.terms;
  return (
    <>
      <PublicHeading eyebrow="TRANSPARENCY MATTERS" title={terms ? 'Terms of service' : 'Your privacy matters.'} description={terms ? 'The rules for using CGPA+ UniPort fairly and responsibly.' : 'How CGPA+ UniPort collects, uses, protects and handles information when you use the service.'} meta={[['file', `${sections.length} sections`], ['shield', 'Effective 10 September 2026']]}/>
      <div className="container public-content">
        <div className="legal-layout">
          <nav className="legal-index" aria-label="On this page">
            {sections.map(([title], i) => <a href={`#legal-${type}-${i}`} key={title} onClick={e => { e.preventDefault(); document.getElementById(`legal-${type}-${i}`)?.scrollIntoView({ behavior: 'smooth' }); }}>{String(i + 1).padStart(2, '0')}. {title}</a>)}
          </nav>
          <div className="legal-prose">
            {sections.map(([title, body], i) => <section id={`legal-${type}-${i}`} key={title} data-reveal="fade"><h2>{i + 1}. {title}</h2><p>{body}</p></section>)}
          </div>
        </div>
      </div>
      <PublicCta eyebrow="QUESTIONS ABOUT THIS PAGE?" title="Need something clarified?" copy="Use the CGPA+ support channel for questions about your account, records, privacy or how the service works." primary={['Contact support', '/support']} />
    </>
  );
}
