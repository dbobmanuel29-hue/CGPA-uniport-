import { useEffect, useState } from 'react';

export default function SiteLoader() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Give the branded loader a full 2-second presentation.
    const exitTimer = window.setTimeout(() => setLeaving(true), 1700);
    const hideTimer = window.setTimeout(() => setVisible(false), 2000);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`site-loader${leaving ? ' site-loader--leaving' : ''}`} role="status" aria-label="Loading CGPA+ UniPort">
      <div className="site-loader__wordmark" aria-hidden="true">
        <span className="site-loader__word">CGPA</span><span className="site-loader__plus">+</span>
      </div>
      <div className="site-loader__rule" aria-hidden="true">
        <span />
      </div>
      <p className="site-loader__status">Loading your workspace</p>
    </div>
  );
}
