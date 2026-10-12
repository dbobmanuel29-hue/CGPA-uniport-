import { useEffect, useState } from 'react';

// Bump this key when the consent experience or policy materially changes.
// This makes visitors review their choice once after this update.
const KEY = 'cgpa-plus-cookie-consent-v3';
const SAVED_CHOICES = new Set(['accepted', 'declined']);

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const savedChoice = window.localStorage.getItem(KEY);
      setVisible(!SAVED_CHOICES.has(savedChoice));
    } catch {
      // If storage is unavailable, do not silently hide the consent controls.
      setVisible(true);
    }
  }, []);

  const saveChoice = (choice) => {
    try {
      window.localStorage.setItem(KEY, choice);
    } catch {
      // Keep the choice for this page session even if persistent storage is blocked.
    }
    setVisible(false);
    window.dispatchEvent(new CustomEvent('cgpa-consent', { detail: choice }));
  };

  if (!visible) return null;

  return (
    <aside className="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title">
      <div>
        <strong id="cookie-consent-title">Cookies & optional analytics</strong>
        <p>
          We use essential browser storage for preferences and consent. Optional analytics only runs after you accept it.
          See our <a href="#/cookies">Cookie Policy</a> and <a href="#/privacy">Privacy Policy</a>.
        </p>
      </div>
      <div className="cookie-consent-actions">
        <button type="button" className="cookie-consent-decline" onClick={() => saveChoice('declined')}>
          Decline analytics
        </button>
        <button type="button" className="cookie-consent-accept" onClick={() => saveChoice('accepted')}>
          Accept analytics
        </button>
      </div>
    </aside>
  );
}
