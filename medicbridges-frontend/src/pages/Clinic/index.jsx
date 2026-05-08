import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Phone, Clock, Globe, Languages, ArrowLeft, Check, ExternalLink } from 'lucide-react';

const Clinic = () => {
  const { id } = useParams();

  return (
    <div className="page-container" style={{ padding: '3rem 2rem', maxWidth: '900px', animation: 'fadeIn 0.6s ease-out' }}>
      
      <Link to="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
        <ArrowLeft size={18} /> Back to search results
      </Link>

      {/* Clinic Header */}
      <div className="mb-bento-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Clinic Name</h1>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)' }}>
              <MapPin size={16} /> 123 Main Street, Miami, FL 33101
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--mb-primary)', padding: '0.35rem 0.85rem', borderRadius: 'var(--mb-radius-pill)', fontSize: '0.85rem', fontWeight: 600 }}>Uninsured OK</span>
            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--mb-primary)', padding: '0.35rem 0.85rem', borderRadius: 'var(--mb-radius-pill)', fontSize: '0.85rem', fontWeight: 600 }}>Sliding Scale</span>
            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--mb-primary)', padding: '0.35rem 0.85rem', borderRadius: 'var(--mb-radius-pill)', fontSize: '0.85rem', fontWeight: 600 }}>Medicaid</span>
          </div>
        </div>

        {/* Image placeholder */}
        <div className="image-placeholder" style={{ minHeight: '250px', marginBottom: '2rem' }}>
          [Clinic Photo]
        </div>

        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, fontSize: '1.05rem' }}>
          This is a placeholder for the clinic's description. It would include a brief overview of the clinic, the community it serves, and what makes it unique.
        </p>
      </div>

      {/* Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="mb-bento-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
            <Clock size={20} color="var(--mb-primary)" /> Hours
          </h3>
          <p style={{ color: 'var(--mb-text-secondary)' }}>Mon – Fri: 8:00 AM – 5:00 PM</p>
          <p style={{ color: 'var(--mb-text-secondary)' }}>Sat: 9:00 AM – 1:00 PM</p>
          <p style={{ color: 'var(--mb-text-secondary)' }}>Sun: Closed</p>
        </div>

        <div className="mb-bento-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
            <Phone size={20} color="var(--mb-primary)" /> Contact
          </h3>
          <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '0.5rem' }}>(305) 555-0123</p>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
            <Globe size={16} /> Visit Website <ExternalLink size={14} />
          </a>
        </div>

        <div className="mb-bento-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
            <Languages size={20} color="var(--mb-primary)" /> Languages
          </h3>
          <p style={{ color: 'var(--mb-text-secondary)' }}>English, Spanish, Haitian Creole</p>
        </div>
      </div>

      {/* Services */}
      <div className="mb-bento-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Services Offered</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {['Primary Care', 'Dental', 'Mental Health / Therapy', 'Pharmacy / Medications', 'Women\'s Health', 'Pediatrics', 'Chronic Disease Mgmt', 'Vaccinations'].map((service) => (
            <div key={service} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)' }}>
              <Check size={16} color="var(--mb-primary)" /> {service}
            </div>
          ))}
        </div>
      </div>

      {/* Insurance & Cost */}
      <div className="mb-bento-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Insurance & Cost</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)' }}>
            <Check size={16} color="var(--mb-primary)" /> Accepts uninsured patients
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)' }}>
            <Check size={16} color="var(--mb-primary)" /> Medicaid accepted
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)' }}>
            <Check size={16} color="var(--mb-primary)" /> Sliding-scale fees available
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-text-secondary)' }}>
            <Check size={16} color="var(--mb-primary)" /> On-site medications (340B program)
          </div>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="mb-bento-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Location</h3>
        <div className="image-placeholder" style={{ minHeight: '300px' }}>
          [Embedded Map]
        </div>
      </div>

    </div>
  );
};

export default Clinic;
