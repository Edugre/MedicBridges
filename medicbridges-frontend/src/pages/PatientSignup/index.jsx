import React from 'react';
import { ArrowRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';

const PatientSignup = () => {
  return (
    <div className="page-container" style={{ padding: '4rem 2rem', maxWidth: '800px', animation: 'fadeIn 0.6s ease-out' }}>
      
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--mb-primary)', borderRadius: 'var(--mb-radius-pill)', fontWeight: 600, marginBottom: '1rem' }}>
          Free — Always
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Create Your Patient Profile</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          Tell us a little about yourself and we'll match you with the right clinic, pharmacy, or therapist in Miami.
        </p>
      </div>

      <div className="mb-bento-card">
        <form onSubmit={(e) => e.preventDefault()}>
          
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Personal Information</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">First Name *</label>
              <input type="text" className="mb-input" required />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">Last Name *</label>
              <input type="text" className="mb-input" required />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">Email *</label>
              <input type="email" className="mb-input" required />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">Phone Number</label>
              <input type="tel" className="mb-input" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">ZIP Code *</label>
              <input type="text" className="mb-input" required />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">Date of Birth *</label>
              <input type="date" className="mb-input" required />
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Insurance Status</h2>
          <div className="mb-input-group">
            <label className="mb-label">What is your insurance situation? *</label>
            <select className="mb-select" required>
              <option value="">Select an option...</option>
              <option value="none">I have no insurance</option>
              <option value="medicaid">I have Medicaid</option>
              <option value="medicare">I have Medicare</option>
              <option value="aca">I have Marketplace / ACA insurance</option>
              <option value="cant_afford">I have insurance but can’t afford copays</option>
              <option value="unsure">I’m not sure</option>
            </select>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Care You Need</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '2rem' }}>
            <label className="mb-checkbox-label"><input type="checkbox" /> Primary Care</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Dental</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Mental Health / Therapy</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Medications / Pharmacy</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Women's Health</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Pediatrics / Children</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Vision</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Chronic Condition</label>
          </div>

          <div className="mb-input-group">
            <label className="mb-label">How urgent is your care need?</label>
            <select className="mb-select">
              <option value="today">I need care today</option>
              <option value="week">Within this week</option>
              <option value="month">Within a month</option>
              <option value="no_urgency">No specific urgency</option>
            </select>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>Language & Notifications</h2>
          <div className="mb-input-group">
            <label className="mb-label">Language Preference</label>
            <select className="mb-select">
              <option value="english">English</option>
              <option value="spanish">Spanish / Espanol</option>
              <option value="creole">Haitian Creole</option>
              <option value="portuguese">Portuguese</option>
              <option value="other">Other</option>
            </select>
          </div>

          <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>How would you like to receive notifications?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '3rem' }}>
            <label className="mb-checkbox-label"><input type="checkbox" defaultChecked /> Email</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> Text message (SMS)</label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <button type="submit" className="mb-btn mb-btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
              Create My Profile — Find Care Now <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </button>
            <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.85rem', maxWidth: '500px', marginBottom: '1.5rem' }}>
              Your information is private and never sold. MedicBridges is free for patients, always. By registering you agree to our <Link to="/privacy" style={{ textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>
            
            <Link to="/clinic-signup" style={{ fontSize: '0.95rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-primary)' }}>
              <User size={16} /> Are you a clinic? Register your clinic here
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
};

export default PatientSignup;
