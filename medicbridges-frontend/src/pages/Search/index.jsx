import React from 'react';
import { Search as SearchIcon, MapPin, SlidersHorizontal, ChevronDown } from 'lucide-react';

const Search = () => {
  return (
    <div className="page-container" style={{ padding: '0', animation: 'fadeIn 0.6s ease-out' }}>
      
      {/* Header Area */}
      <div style={{ padding: '3rem 2rem', backgroundColor: 'var(--mb-bg-primary)', borderBottom: '1px solid var(--mb-border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Find Care in Miami</h1>
          <p style={{ color: 'var(--mb-text-secondary)', fontSize: '1.1rem', marginBottom: '2rem' }}>
            Free clinics, pharmacies, mental health, specialists — filtered for you.
          </p>

          <div style={{ display: 'flex', gap: '1rem', maxWidth: '800px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <SearchIcon size={20} color="var(--mb-text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                className="mb-input" 
                placeholder="Search by clinic name, specialty, or service..." 
                style={{ paddingLeft: '3rem', height: '100%', fontSize: '1.1rem' }}
              />
            </div>
            <button className="mb-btn mb-btn-primary" style={{ padding: '1rem 2rem' }}>
              Search
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}>
        
        {/* Filters Sidebar */}
        <aside>
          <div className="mb-bento-card" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <SlidersHorizontal size={20} /> Filters
              </h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--mb-text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>Reset All</button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ color: 'var(--mb-text-secondary)', fontWeight: 500 }}>Showing 0 clinics</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--mb-text-secondary)' }}>
              Sort by: 
              <span style={{ fontWeight: 600, color: 'var(--mb-text-heading)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                Best match <ChevronDown size={16} />
              </span>
            </div>
          </div>

          <div className="mb-bento-card" style={{ textAlign: 'center', padding: '4rem 2rem', borderStyle: 'dashed' }}>
            <MapPin size={48} color="var(--mb-border)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--mb-text-muted)' }}>No clinics to show yet</h3>
            <p style={{ color: 'var(--mb-text-muted)' }}>Try entering a ZIP code or adjusting your filters to find care near you.</p>
          </div>

          {/* Example of a result card (hidden for now to match empty state requested)
          <div className="mb-bento-card" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                 <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Miami Community Health Center</h3>
                 <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>123 Main St, Miami, FL 33101</p>
               </div>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--mb-primary)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>Uninsured OK</span>
                 <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--mb-accent)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>Sliding scale</span>
               </div>
             </div>
             <div style={{ color: 'var(--mb-text-secondary)', fontSize: '0.9rem' }}>
               Languages: English, Spanish, Haitian Creole
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--mb-border)' }}>
               <div style={{ fontSize: '0.9rem', color: 'var(--mb-text-secondary)' }}>Cost & insurance details available</div>
               <button className="mb-btn mb-btn-outline" style={{ padding: '0.5rem 1rem' }}>View Details</button>
             </div>
          </div>
          */}

        </main>
      </div>

    </div>
  );
};

export default Search;
