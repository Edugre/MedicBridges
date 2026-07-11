import React from 'react';
import { ArrowRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';

const CONTENT = {
  en: {
    badge: 'Free — Always',
    title: 'Create Your Patient Profile',
    subtitle: "Tell us a little about yourself and we'll match you with the right clinic, pharmacy, or therapist in Miami.",
    personalInfo: 'Personal Information',
    firstName: 'First Name *',
    lastName: 'Last Name *',
    email: 'Email *',
    phone: 'Phone Number',
    zip: 'ZIP Code *',
    dob: 'Date of Birth *',
    insuranceStatus: 'Insurance Status',
    insuranceQuestion: 'What is your insurance situation? *',
    selectOption: 'Select an option...',
    insuranceOptions: {
      none: 'I have no insurance',
      medicaid: 'I have Medicaid',
      medicare: 'I have Medicare',
      aca: 'I have Marketplace / ACA insurance',
      cant_afford: "I have insurance but can't afford copays",
      unsure: "I'm not sure",
    },
    careNeeded: 'Care You Need',
    care: ['Primary Care', 'Dental', 'Mental Health / Therapy', 'Medications / Pharmacy', "Women's Health", 'Pediatrics / Children', 'Vision', 'Chronic Condition'],
    urgencyLabel: 'How urgent is your care need?',
    urgencyOptions: { today: 'I need care today', week: 'Within this week', month: 'Within a month', no_urgency: 'No specific urgency' },
    langNotif: 'Language & Notifications',
    langPref: 'Language Preference',
    langOptions: { english: 'English', spanish: 'Spanish / Español', creole: 'Haitian Creole', portuguese: 'Portuguese', other: 'Other' },
    notifQuestion: 'How would you like to receive notifications?',
    notifEmail: 'Email',
    notifSms: 'Text message (SMS)',
    submit: 'Create My Profile — Find Care Now',
    privacyPre: 'Your information is private and never sold. By registering you agree to our ',
    privacyLink: 'Privacy Policy',
    clinicPrompt: 'Are you a clinic? Register your clinic here',
  },
  es: {
    badge: 'Gratis — Siempre',
    title: 'Crea tu Perfil de Paciente',
    subtitle: 'Cuéntanos un poco sobre ti y te conectaremos con la clínica, farmacia o terapeuta adecuado en Miami.',
    personalInfo: 'Información Personal',
    firstName: 'Nombre *',
    lastName: 'Apellido *',
    email: 'Correo electrónico *',
    phone: 'Número de teléfono',
    zip: 'Código postal *',
    dob: 'Fecha de nacimiento *',
    insuranceStatus: 'Estado del Seguro',
    insuranceQuestion: '¿Cuál es tu situación de seguro? *',
    selectOption: 'Selecciona una opción...',
    insuranceOptions: {
      none: 'No tengo seguro',
      medicaid: 'Tengo Medicaid',
      medicare: 'Tengo Medicare',
      aca: 'Tengo seguro del Marketplace / ACA',
      cant_afford: 'Tengo seguro pero no puedo pagar los copagos',
      unsure: 'No estoy seguro',
    },
    careNeeded: 'Atención que Necesitas',
    care: ['Atención Primaria', 'Dental', 'Salud Mental / Terapia', 'Medicamentos / Farmacia', 'Salud de la Mujer', 'Pediatría / Niños', 'Visión', 'Condición Crónica'],
    urgencyLabel: '¿Qué tan urgente es tu necesidad de atención?',
    urgencyOptions: { today: 'Necesito atención hoy', week: 'Dentro de esta semana', month: 'Dentro de un mes', no_urgency: 'Sin urgencia específica' },
    langNotif: 'Idioma y Notificaciones',
    langPref: 'Idioma Preferido',
    langOptions: { english: 'Inglés', spanish: 'Español', creole: 'Creole Haitiano', portuguese: 'Portugués', other: 'Otro' },
    notifQuestion: '¿Cómo te gustaría recibir notificaciones?',
    notifEmail: 'Correo electrónico',
    notifSms: 'Mensaje de texto (SMS)',
    submit: 'Crear Mi Perfil — Buscar Atención Ahora',
    privacyPre: 'Tu información es privada y nunca se vende. Al registrarte aceptas nuestra ',
    privacyLink: 'Política de Privacidad',
    clinicPrompt: '¿Eres una clínica? Registra tu clínica aquí',
  },
};

const CARE_KEYS = ['primary', 'dental', 'mental', 'meds', 'women', 'peds', 'vision', 'chronic'];

const PatientSignup = () => {
  const { lang } = useLang();
  const t = CONTENT[lang];
  return (
    <div className="page-container" style={{ padding: '4rem 2rem', maxWidth: '1200px', animation: 'fadeIn 0.6s ease-out' }}>

      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-lime-soft)', color: 'var(--mb-accent)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1rem' }}>
          {t.badge}
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{t.title}</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)', maxWidth: '800px', margin: '0 auto' }}>
          {t.subtitle}
        </p>
      </div>

      <div className="mb-bento-card">
        <form onSubmit={(e) => e.preventDefault()}>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.personalInfo}</h2>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">{t.firstName}</label>
              <input type="text" className="mb-input" required />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">{t.lastName}</label>
              <input type="text" className="mb-input" required />
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">{t.email}</label>
              <input type="email" className="mb-input" required />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">{t.phone}</label>
              <input type="tel" className="mb-input" />
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">{t.zip}</label>
              <input type="text" className="mb-input" required />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">{t.dob}</label>
              <input type="date" className="mb-input" required />
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.insuranceStatus}</h2>
          <div className="mb-input-group">
            <label className="mb-label">{t.insuranceQuestion}</label>
            <select className="mb-select" required>
              <option value="">{t.selectOption}</option>
              <option value="none">{t.insuranceOptions.none}</option>
              <option value="medicaid">{t.insuranceOptions.medicaid}</option>
              <option value="medicare">{t.insuranceOptions.medicare}</option>
              <option value="aca">{t.insuranceOptions.aca}</option>
              <option value="cant_afford">{t.insuranceOptions.cant_afford}</option>
              <option value="unsure">{t.insuranceOptions.unsure}</option>
            </select>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.careNeeded}</h2>
          <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '2rem' }}>
            {t.care.map((c, i) => (
              <label key={CARE_KEYS[i]} className="mb-checkbox-label"><input type="checkbox" /> {c}</label>
            ))}
          </div>

          <div className="mb-input-group">
            <label className="mb-label">{t.urgencyLabel}</label>
            <select className="mb-select">
              <option value="today">{t.urgencyOptions.today}</option>
              <option value="week">{t.urgencyOptions.week}</option>
              <option value="month">{t.urgencyOptions.month}</option>
              <option value="no_urgency">{t.urgencyOptions.no_urgency}</option>
            </select>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.langNotif}</h2>
          <div className="mb-input-group">
            <label className="mb-label">{t.langPref}</label>
            <select className="mb-select">
              <option value="english">{t.langOptions.english}</option>
              <option value="spanish">{t.langOptions.spanish}</option>
              <option value="creole">{t.langOptions.creole}</option>
              <option value="portuguese">{t.langOptions.portuguese}</option>
              <option value="other">{t.langOptions.other}</option>
            </select>
          </div>

          <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>{t.notifQuestion}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '3rem' }}>
            <label className="mb-checkbox-label"><input type="checkbox" defaultChecked /> {t.notifEmail}</label>
            <label className="mb-checkbox-label"><input type="checkbox" /> {t.notifSms}</label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <button type="submit" className="mb-btn mb-btn-secondary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
              {t.submit} <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />
            </button>
            <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.85rem', maxWidth: '500px', marginBottom: '1.5rem' }}>
              {t.privacyPre}<Link to="/privacy" style={{ textDecoration: 'underline' }}>{t.privacyLink}</Link>.
            </p>

            <Link to="/clinic-signup" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mb-accent)' }}>
              <User size={16} /> {t.clinicPrompt}
            </Link>
          </div>

        </form>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .form-row { grid-template-columns: 1fr !important; }
          .checkbox-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default PatientSignup;
