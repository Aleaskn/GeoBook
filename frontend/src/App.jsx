import './styles/global.css';

export default function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Salta al contenuto principale
      </a>
      <header className="site-header">
        <nav aria-label="Navigazione principale">
          <span className="brand">GeoBook</span>
        </nav>
      </header>
      <main id="main-content" className="page-content">
        <section className="intro-section" aria-labelledby="home-title">
          <p className="section-label">Biblioteche private locali</p>
          <h1 id="home-title">GeoBook</h1>
          <p>
            Pubblica, cerca e richiedi libri disponibili nella tua area con attenzione a privacy e
            accessibilità.
          </p>
        </section>
      </main>
    </div>
  );
}
