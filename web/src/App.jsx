import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import axios from 'axios';
import { Shield, AlertTriangle, Moon, Sun, Info, MapPin, Activity, Search, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Component to handle map movements (flying to locations)
function MapHandler({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, {
        duration: 1.5
      });
    }
  }, [position, map]);
  return null;
}

function LocationMarker({ position, setPosition, onLocationSelected }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelected(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Target Block: {position.lat.toFixed(3)}, {position.lng.toFixed(3)}</Popup>
    </Marker>
  );
}

function App() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Map Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);

  const fetchSafetyReport = async (latlng) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/safety-score`, {
        params: { lat: latlng.lat, lon: latlng.lng }
      });
      setReport(response.data);
    } catch (err) {
      setError("Unable to reach safety database. Ensure API is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 5,
          viewbox: '-87.9,42.0,-87.5,41.6',
          bounded: 1
        }
      });
      setSearchResults(response.data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (result) => {
    const latlng = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setPosition(latlng);
    fetchSafetyReport(latlng);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]); 
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const darkMapUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const lightMapUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <div className="app-container">
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield className="text-primary" size={28} />
          <h1>SafeBlock AI</h1>
        </div>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Real-time hyper-local safety analysis.
        </p>

        {/* Map Theme Toggle */}
        <div className="theme-toggle-container">
          <div className="theme-toggle-label">
            {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            {isDarkMode ? 'Dark Map' : 'Bright Map'}
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={!isDarkMode} 
              onChange={() => setIsDarkMode(!isDarkMode)} 
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Search Component */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              className="search-input"
              placeholder="Search place, street, landmark..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searchQuery && (
              <X 
                size={16} 
                style={{ position: 'absolute', right: '1rem', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => {setSearchQuery(''); setSearchResults([]);}}
              />
            )}
          </div>
          
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((res) => (
                <div 
                  key={res.place_id} 
                  className="search-result-item"
                  onClick={() => selectResult(res)}
                >
                  <strong>{res.display_name.split(',')[0]}</strong>
                  <span className="search-result-sub">{res.display_name.split(',').slice(1, 3).join(',')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />

        {loading && <div className="placeholder-msg"><Activity className="animate-spin" /> Analyzing spatial data...</div>}
        
        {!loading && !report && !error && (
          <div className="placeholder-msg">
            <MapPin size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <br /> Search or click the map to start
          </div>
        )}

        {error && <div style={{ color: 'var(--danger)', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>{error}</div>}

        {report && !loading && (
          <div className="score-card">
            <div className="stat-label">Safety Score</div>
            <div className="score-value" style={{ color: getScoreColor(report.score) }}>
              {report.score}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Block Grid ID: {report.block_id}
            </div>

            <div className="stat-grid">
              <div className="stat-item">
                <div className="stat-label">Total Crimes</div>
                <div className="stat-value">{report.total_crimes}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Night Ratio</div>
                <div className="stat-value">{Math.round(report.night_crime_ratio * 100)}%</div>
              </div>
              <div className="stat-item" style={{ gridColumn: 'span 2' }}>
                <div className="stat-label">Main Incident Type</div>
                <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} color="var(--warning)" />
                  {report.most_common_crime}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.85rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <Info size={24} color="var(--primary)" />
                <p style={{ margin: 0 }}>hyper-local assessment for the 111x111m grid cell at this location.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="map-container">
        <MapContainer 
          center={[41.8781, -87.6298]} 
          zoom={13} 
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            key={isDarkMode ? 'dark' : 'light'}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={isDarkMode ? darkMapUrl : lightMapUrl}
          />
          <MapHandler position={position} />
          <LocationMarker position={position} setPosition={setPosition} onLocationSelected={fetchSafetyReport} />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
