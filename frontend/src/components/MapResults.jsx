import L from 'leaflet';
import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import { SearchResultCard } from './SearchResultCard.jsx';
import styles from './MapResults.module.css';

const DEFAULT_ZOOM = 14;

function createPopupContent(book) {
  // textContent evita che metadati inseriti dagli utenti vengano interpretati come HTML da Leaflet.
  const container = document.createElement('div');
  const title = document.createElement('strong');
  const area = document.createElement('p');
  title.textContent = book.title;
  area.textContent = `${book.publicArea} · ${book.distanceKm.toLocaleString('it-IT')} km`;
  container.append(title, area);
  return container;
}

export function MapResults({ books, detailSearch }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);

  useEffect(() => {
    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markerLayerRef.current = markerLayer;

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) {
      return;
    }

    markerLayer.clearLayers();
    const positions = books.map((book) => [
      book.approximateLocation.lat,
      book.approximateLocation.lon,
    ]);

    books.forEach((book) => {
      L.circleMarker([book.approximateLocation.lat, book.approximateLocation.lon], {
        radius: 9,
        color: '#5c1f35',
        fillColor: '#bd7d20',
        fillOpacity: 0.88,
        weight: 3,
      })
        .bindPopup(createPopupContent(book))
        .addTo(markerLayer);
    });

    if (positions.length === 1) {
      map.setView(positions[0], DEFAULT_ZOOM);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: DEFAULT_ZOOM });
    }
  }, [books]);

  return (
    <div className={styles.resultsLayout}>
      <section className={styles.list} aria-labelledby="map-result-list-title">
        <h2 id="map-result-list-title">Risultati in elenco</h2>
        <p className={styles.accessibilityNote}>
          L’elenco contiene gli stessi libri rappresentati dai marker sulla mappa.
        </p>
        <ul>
          {books.map((book) => (
            <li key={book.id}>
              <SearchResultCard book={book} detailSearch={detailSearch} />
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.mapPanel} aria-labelledby="map-title">
        <h2 id="map-title">Posizioni approssimate</h2>
        <p id="map-privacy-note" className={styles.privacyNote}>
          I marker usano una griglia approssimata e non indicano l’indirizzo preciso.
        </p>
        <div
          ref={containerRef}
          className={styles.map}
          role="region"
          aria-label="Mappa dei risultati con posizioni approssimate"
          aria-describedby="map-privacy-note"
        />
      </section>
    </div>
  );
}

MapResults.propTypes = {
  books: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      publicArea: PropTypes.string.isRequired,
      distanceKm: PropTypes.number.isRequired,
      approximateLocation: PropTypes.shape({
        lat: PropTypes.number.isRequired,
        lon: PropTypes.number.isRequired,
      }).isRequired,
    }),
  ).isRequired,
  detailSearch: PropTypes.string.isRequired,
};
