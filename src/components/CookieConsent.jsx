import { useEffect, useState } from 'react';

const KEY = 'cgpa-plus-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { try { setVisible(localStorage.getItem(KEY) !== 'accepted'); } catch { setVisible(false); } }, []);
  const accept = () => { try { localStorage.setItem(KEY, 'accepted'); } catch {} setVisible(false); window.dispatchEvent(new CustomEvent('cgpa-consent', { detail: 'accepted' })); };
  const decline = () => { try { localStorage.setItem(KEY, 'declined'); } catch {} setVisible(false); window.dispatchEvent(new CustomEvent('cgpa-consent', { detail: 'declined' })); };
  if (!visible) return null;
  return <aside className="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title"><div><strong id="cookie-consent-title">Cookies & optional analytics</strong><p>We use essential browser storage for preferences and consent. Optional analytics only runs after you accept it. See our <a href="#/cookies">Cookie Policy</a> and <a href="#/privacy">Privacy Policy</a>.</p></div><div className="cookie-consent-actions"><button type="button" className="button button-outline" onClick={decline}>Decline analytics</button><button type="button" className="button button-primary" onClick={accept}>Accept analytics</button></div></aside>;
}
