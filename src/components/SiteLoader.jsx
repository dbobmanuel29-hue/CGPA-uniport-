import { useEffect, useState } from 'react';

export default function SiteLoader() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setLeaving(true), 720);
    const hideTimer = window.setTimeout(() => setVisible(false), 1080);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`site-loader${leaving ? ' site-loader--leaving' : ''}`} role="status" aria-label="Loading CGPA+ UniPort">
      <div className="site-loader__ambient site-loader__ambient--one" aria-hidden="true" />
      <div className="site-loader__ambient site-loader__ambient--two" aria-hidden="true" />
      <div className="site-loader__content">
        <div className="site-loader__mark" aria-hidden="true">
          <span>+</span>
        </div>
        <div className="site-loader__brand">
          <span className="site-loader__name">CGPA</span><span className="site-loader__plus">+</span>
        </div>
        <p className="site-loader__tagline">Your academic journey, simplified.</p>
        <div className="site-loader__progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
