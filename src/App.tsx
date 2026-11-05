import Application from './Application';

export default function App() {
  const christmasActive = new Date() <= new Date('2027-01-05T23:59:59');

  return (
    <>
      {christmasActive && (
        <div className="seasonal-banner" role="status">
          <span className="seasonal-banner__sparkle" aria-hidden="true">✦</span>
          <span><strong>CGPA+ wishes you a Merry Christmas</strong> and a Happy New Year!</span>
          <span className="seasonal-banner__sparkle" aria-hidden="true">✦</span>
        </div>
      )}
      <Application />
      {christmasActive && (
        <>
          <div className="seasonal-corner seasonal-corner--tree" aria-hidden="true">
            <span className="seasonal-corner__art">🎄</span>
          </div>
          <div className="seasonal-corner seasonal-corner--santa" aria-hidden="true">
            <span className="seasonal-corner__art">🎅🏻</span>
          </div>
          <div className="seasonal-snow" aria-hidden="true">
            <span>❄</span><span>✻</span><span>❅</span><span>❄</span>
            <span>✼</span><span>❅</span><span>❄</span><span>✻</span>
          </div>
        </>
      )}
    </>
  );
}
