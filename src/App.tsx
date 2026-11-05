import Application from './Application';

export default function App() {
  const christmasActive = new Date() <= new Date('2027-01-05T23:59:59');

  return (
    <>
      {christmasActive && (
        <div className="seasonal-banner" role="status" aria-label="CGPA Plus Christmas and New Year wishes">
          <span className="seasonal-banner__decoration seasonal-banner__tree" aria-hidden="true">🎄</span>
          <div className="seasonal-banner__message">
            <span className="seasonal-banner__eyebrow">SEASON'S GREETINGS FROM CGPA+</span>
            <strong className="seasonal-banner__headline">Merry Christmas &amp; Happy New Year!</strong>
            <span className="seasonal-banner__expiry">Celebrating with you until <b>January 5, 2027</b></span>
          </div>
          <span className="seasonal-banner__decoration seasonal-banner__santa" aria-hidden="true">🎅🏻</span>
        </div>
      )}
      <Application />
      {christmasActive && (
        <div className="seasonal-snow" aria-hidden="true">
          <span>❄</span><span>✻</span><span>❅</span><span>❄</span>
          <span>✼</span><span>❅</span><span>❄</span><span>✻</span>
        </div>
      )}
    </>
  );
}
