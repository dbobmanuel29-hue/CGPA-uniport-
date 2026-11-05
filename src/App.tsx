import Application from './Application';

export default function App() {
  return (
    <>
      <Application />
      <div className="seasonal-corner seasonal-corner--tree" aria-hidden="true">
        <span className="seasonal-corner__art">🎄</span>
      </div>
      <div className="seasonal-corner seasonal-corner--santa" aria-hidden="true">
        <span className="seasonal-corner__art">🎅🏻</span>
      </div>
    </>
  );
}
