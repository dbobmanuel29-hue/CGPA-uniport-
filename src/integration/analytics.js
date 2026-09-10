let started = false;

function load() {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!id || started) return;
  started = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', id, { anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

export function initAnalytics() {
  try { if (localStorage.getItem('cgpa-plus-cookie-consent') === 'accepted') load(); } catch {}
  window.addEventListener('cgpa-consent', event => { if (event.detail === 'accepted') load(); });
}
