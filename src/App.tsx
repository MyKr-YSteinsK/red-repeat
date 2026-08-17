import './App.css'

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand-lockup" href="/" aria-label="RED:REPEAT home">
          <span className="brand-signal" aria-hidden="true" />
          <span className="brand-wordmark">
            <span>RED</span>
            <span className="brand-divider" aria-hidden="true">
              :
            </span>
            <span>REPEAT</span>
          </span>
        </a>
        <p className="imprint">A MYKR EDITION</p>
      </header>

      <main className="library" aria-labelledby="library-title">
        <div className="library-heading">
          <p className="eyebrow">LIBRARY / INDEX</p>
          <h1 id="library-title">Your library is empty.</h1>
          <p className="library-lede">
            Song Editions will appear here when you add them.
          </p>
        </div>

        <section className="empty-state" aria-labelledby="empty-state-title">
          <p className="empty-index" aria-hidden="true">
            00
          </p>
          <div className="empty-copy">
            <p className="empty-kicker">ARCHIVE STATUS</p>
            <h2 id="empty-state-title">
              Begin with one song worth returning to.
            </h2>
            <p>Your first Song Edition will have a place here.</p>
          </div>
          <p className="empty-signal" aria-label="Library status: empty">
            00 / 00
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <p>
          A focused archive for <span className="footer-signal">returning</span>{' '}
          to songs.
        </p>
        <p>LIBRARY / 00</p>
      </footer>
    </div>
  )
}

export default App
