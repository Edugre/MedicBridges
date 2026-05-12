import React from 'react';
import { Search as SearchIcon, MapPin, SlidersHorizontal, ChevronDown } from 'lucide-react';

const Search = () => {
  return (
    <div className="page-container" style={{ padding: '0', animation: 'fadeIn 0.6s ease-out' }}>
      
      {/* Header Area */}
      <div className="search-header" style={{ padding: '3rem 2rem', backgroundColor: 'var(--mb-bg-primary)', borderBottom: '1px solid var(--mb-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Find Care in Miami</h1>
          <p style={{ color: 'var(--mb-text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Free clinics, pharmacies, mental health, specialists — filtered for you.
          </p>

          <div className="search-bar" style={{ display: 'flex', gap: '1rem', maxWidth: '800px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <SearchIcon size={20} color="var(--mb-text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="mb-input" 
                placeholder="Search by clinic name, specialty, or service..." 
                style={{ paddingLeft: '3rem', height: '100%', fontSize: '1rem' }}
              />
            </div>
            <button className="mb-btn mb-btn-secondary" style={{ padding: '0.75rem 2rem' }}>
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="search-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}>
        
        {/* Filters Sidebar */}
        <aside className="search-sidebar">
          <div className="mb-bento-card" style={{ padding: '1.5rem', position: 'sticky', top: '5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <SlidersHorizontal size={20} /> Filters
              </h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--mb-text-muted)', cursor: 'pointer', fontSize: '0.9rem', fontFamily: "'DM Serif Text', Georgia, serif" }}>Reset All</button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="mb-label">Clinic Type</label>
              <select className="mb-select">
                <option>All types</option>
                <option>Primary Care / FQHC</option>
                <option>Mental Health</option>
                <option>Pharmacy</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="mb-label">ZIP Code</label>
              <input type="text" className="mb-input" placeholder="e.g. 33101" />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="mb-label">Insurance</label>
              <select className="mb-select">
                <option>Any</option>
                <option>No insurance / Uninsured</option>
                <option>Medicaid</option>
                <option>Medicare</option>
                <option>Sliding-scale</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="mb-label">Language</label>
              <select className="mb-select">
                <option>Any</option>
                <option>English</option>
                <option>Spanish</option>
                <option>Haitian Creole</option>
                <option>Portuguese</option>
              </select>
            </div>

            <button className="mb-btn mb-btn-secondary" style={{ width: '100%' }}>Apply Filters</button>
          </div>
        </aside>

        {/* Results Area */}
        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ color: 'var(--mb-text-secondary)' }}>Showing 0 clinics</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--mb-text-secondary)' }}>
              Sort by: 
              <span style={{ color: 'var(--mb-text-heading)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                Best match <ChevronDown size={16} />
              </span>
            </div>
          </div>

          <div className="mb-bento-card" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
            <MapPin size={48} color="var(--mb-border)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--mb-text-muted)' }}>No clinics to show yet</h3>
            <p style={{ color: 'var(--mb-text-muted)' }}>Try entering a ZIP code or adjusting your filters to find care near you.</p>
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .search-layout { grid-template-columns: 260px 1fr !important; }
        }
        @media (max-width: 768px) {
          .search-layout { 
            grid-template-columns: 1fr !important; 
          }
          .search-sidebar {
            order: 2;
          }
          .search-sidebar .mb-bento-card {
            position: static !important;
          }
          .search-bar {
            flex-direction: column !important;
          }
          .search-bar .mb-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          .search-header { padding: 2rem 1rem !important; }
        }
      `}</style>

    </div>
  );
};

export default Search;
