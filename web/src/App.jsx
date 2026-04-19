import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import axios from 'axios';
import { Shield, AlertTriangle, Moon, Info, MapPin, Activity } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function LocationMarker({ onLocationSelected }) {
  const [position, setPosition] = useState(null);
  
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

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Success
    if (score >= 50) return '#f59e0b'; // Warning
    return '#ef4444'; // Danger
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Shield className="text-primary" size={28} />
          <h1>SafeBlock AI</h1>
        </div>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Real-time hyper-local safety analysis. Click any city block on the map to generate a safety report.
        </p>

        <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />

        {loading && <div className="placeholder-msg"><Activity className="animate-spin" /> Analyzing spatial data...</div>}
        
        {!loading && !report && !error && (
          <div className="placeholder-msg">
            <MapPin size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <br /> Select a location to start
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
                <p style={{ margin: 0 }}>This score evaluates the 111x111m grid cell based on crime severity and time-of-day weights. Higher scores indicate lower criminal density.</p>
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
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <LocationMarker onLocationSelected={fetchSafetyReport} />
        </MapContainer>
      </div>
    </div>
  );
}

export default App;
