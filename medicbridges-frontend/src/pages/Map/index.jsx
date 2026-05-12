import React from 'react';
import { MapPin, Navigation, SlidersHorizontal } from 'lucide-react';

const MapPage = () => {
  return (
    <div className="map-wrapper" style={{ display: 'flex', height: 'calc(100vh - 80px)', width: '100%' }}>
      
      {/* Filters Sidebar */}
      <aside className="map-sidebar" style={{ width: '350px', backgroundColor: 'var(--mb-bg-surface)', borderRight: '1px solid var(--mb-border)', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--mb-border)' }}>
          <h2 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={24} /> Filters</h2>
        </div>
        
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Quick Search</h3>
          
          <div className="mb-input-group">
            <label className="mb-label">Specialty / Type</label>
            <select className="mb-select">
              <option>Hospital</option>
              <option>Clinic / Health Center</option>
              <option>Doctor's Office</option>
              <option>Dentist</option>
              <option>Pharmacy</option>
            </select>
          </div>

          <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--mb-border)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--mb-text-muted)' }}>OR</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--mb-border)' }} />
          </div>

          <button className="mb-btn mb-btn-outline" style={{ width: '100%', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={18} /> Use My Current Location
          </button>
          
          <div style={{ textAlign: 'center', color: 'var(--mb-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>enter manually</div>

          <div className="mb-input-group">
            <label className="mb-label">City or Address</label>
            <input type="text" className="mb-input" placeholder="e.g. Miami, FL" />
          </div>

          <div className="mb-input-group">
            <label className="mb-label">Search Radius</label>
            <select className="mb-select">
              <option>1 km — Walking distance</option>
              <option>2 km</option>
              <option>5 km</option>
              <option>10 km</option>
              <option>20 km</option>
            </select>
          </div>
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--mb-border)', backgroundColor: 'var(--mb-bg-primary)' }}>
          <button className="mb-btn mb-btn-secondary" style={{ width: '100%' }}>Apply filters</button>
        </div>
      </aside>

      {/* Map Area */}
      <main style={{ flex: 1, position: 'relative', backgroundColor: '#d4cfc5', overflow: 'hidden' }}>
        
        {/* Mobile Filters Toggle */}
        <button className="map-mobile-filters mb-btn mb-btn-secondary" style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, display: 'none' }}>
          <SlidersHorizontal size={20} style={{ marginRight: '0.5rem' }} /> Filters
        </button>

        <div className="image-placeholder" style={{ width: '100%', height: '100%', border: 'none', borderRadius: 0, backgroundColor: '#d4cfc5' }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <MapPin size={48} color="var(--mb-text-muted)" style={{ marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.5rem', color: 'var(--mb-text-heading)', marginBottom: '0.5rem' }}>Interactive Map</h2>
            <p style={{ color: 'var(--mb-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
              All clinics are shown on the map. Use your location to pan and filter by distance.
            </p>
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .map-wrapper { flex-direction: column !important; height: auto !important; min-height: calc(100vh - 70px); }
          .map-sidebar { width: 100% !important; height: auto !important; border-right: none !important; border-bottom: 1px solid var(--mb-border); }
          .map-mobile-filters { display: flex !important; }
        }
      `}</style>

    </div>
  );
};

export default MapPage;
