import React from 'react';
import { BookOpen } from 'lucide-react';

// The Historias page simply aggregates stories in the final application.
const Historias = () => {
  return (
    <div className="page-container" style={{ padding: '4rem 2rem', animation: 'fadeIn 0.6s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--mb-primary)', borderRadius: 'var(--mb-radius-pill)', fontWeight: 600, marginBottom: '1rem' }}>
          Patient Experiences
        </div>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Historias</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--mb-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          Read success stories and real experiences from patients who found the care they needed in Miami.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Placeholder for <Stories /> component content */}
        <div className="mb-bento-card">
          <BookOpen size={32} color="var(--mb-primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Maria's Story</h3>
          <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            "I didn't know I could see a doctor without insurance until my neighbor told me. Now I have a primary care physician who speaks my language."
          </p>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--mb-text-muted)' }}>Read full story →</div>
        </div>

        <div className="mb-bento-card">
          <BookOpen size={32} color="var(--mb-primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>David's Journey</h3>
          <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            "My doctor here gives me my blood pressure medication every time I come. I didn't know that was even possible for someone with my income."
          </p>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--mb-text-muted)' }}>Read full story →</div>
        </div>

        <div className="mb-bento-card">
          <BookOpen size={32} color="var(--mb-primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Finding Mental Health</h3>
          <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            "When I found out there was a free therapist who speaks Creole — someone who would understand me — I called the same day."
          </p>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--mb-text-muted)' }}>Read full story →</div>
        </div>

      </div>
    </div>
  );
};

export default Historias;
