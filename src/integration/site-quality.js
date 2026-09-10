const descriptions = {
  '/': 'Calculate, understand and plan your University of Port Harcourt academic journey with CGPA+ UniPort.',
  '/about': 'Learn what CGPA+ UniPort is, what it is not, and why it is built as an independent student planning tool.',
  '/features': 'Explore CGPA+, GPA and CGPA calculators, academic records, analytics, planning and reporting tools.',
  '/how-it-works': 'See how to set up a UniPort profile, record results and use CGPA+ to plan ahead.',
  '/support': 'Get help with CGPA+, calculations, your student workspace and technical issues.',
  '/terms': 'Terms of service for the independent CGPA+ UniPort academic planning platform.',
  '/privacy': 'Privacy information for CGPA+ UniPort, including account, academic data and third-party resources.',
  '/cookies': 'Cookie and optional analytics policy for CGPA+ UniPort.',
  '/refunds': 'Refund policy for CGPA+ UniPort. This release does not accept paid subscriptions or payments.',
  '/login': 'Sign in to your CGPA+ UniPort student workspace.',
  '/register': 'Create a CGPA+ UniPort account and start organizing your academic journey.',
};

export function initSiteQuality() {
  const update = () => {
    const path = (window.location.hash || '#/').slice(1).split('?')[0] || '/';
    const title = document.title;
    const description = descriptions[path] || 'CGPA+ UniPort is an independent academic planning companion for University of Port Harcourt students.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = 'https://cgpa-lovat-theta.vercel.app/';
    const setMeta = (property, content) => { let node = document.querySelector(`meta[property="${property}"]`); if (!node) { node = document.createElement('meta'); node.setAttribute('property', property); document.head.appendChild(node); } node.content = content; };
    const setNameMeta = (name, content) => { let node = document.querySelector(`meta[name="${name}"]`); if (!node) { node = document.createElement('meta'); node.name = name; document.head.appendChild(node); } node.content = content; };
    setMeta('og:title', title); setMeta('og:description', description); setMeta('og:type', 'website'); setMeta('og:url', window.location.href); setMeta('og:image', 'https://cgpa-lovat-theta.vercel.app/social-preview.svg');
    setNameMeta('twitter:card', 'summary_large_image'); setNameMeta('twitter:title', title); setNameMeta('twitter:description', description); setNameMeta('twitter:image', 'https://cgpa-lovat-theta.vercel.app/social-preview.svg');
  };
  update();
  window.addEventListener('hashchange', update);
  return () => window.removeEventListener('hashchange', update);
}
