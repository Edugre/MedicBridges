import { useState } from 'react';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useLang } from '../../context/LangContext';
import { submitClinicRegistration } from '../../api';
import Turnstile from '../../components/Turnstile';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

const CONTENT = {
  en: {
    badge: 'For Healthcare Providers',
    title: 'Register Your Clinic',
    subtitle: 'Start reaching pre-screened Medicaid and uninsured patients in Miami. Get listed free — upgrade when you see results.',
    clinicInfo: 'Clinic Information',
    nameLabel: 'Clinic / Organization Name *',
    namePlaceholder: 'e.g. Community Health Center of Miami',
    typeLabel: 'Type of Clinic *',
    typeSelect: 'Select type...',
    typeOptions: {
      fqhc: 'FQHC / Community Health Center',
      free: 'Free Clinic',
      mental: 'Mental Health Center',
      pharmacy: 'Community Pharmacy',
      hospital: 'Hospital / Health System',
      planned_parenthood: 'Planned Parenthood / Reproductive Health',
      dental: 'Dental Clinic',
      other: 'Other',
    },
    zipLabel: 'ZIP Code *',
    phoneLabel: 'Phone Number *',
    addressLabel: 'Full Address *',
    addressPlaceholder: '123 Main St, Miami, FL',
    websiteLabel: 'Website (optional)',
    hoursLabel: 'Operating Hours *',
    hoursPlaceholder: 'e.g. Mon-Fri: 8am - 5pm',
    descLabel: 'Brief Description',
    descPlaceholder: 'Tell patients a little about your clinic...',
    contactPerson: 'Contact Person',
    fullName: 'Full Name *',
    roleLabel: 'Role / Title *',
    rolePlaceholder: 'e.g. Clinic Director',
    emailLabel: 'Email *',
    directPhone: 'Direct Phone',
    services: 'Services Offered',
    servicesPrompt: 'Select all services your clinic provides:',
    serviceList: ['Primary Care', 'Dental', 'Mental Health / Therapy', 'Pharmacy / Medications', "Women's Health", 'Pediatrics', 'Vision', 'HIV/AIDS', 'Substance Abuse', 'Chronic Disease Mgmt', 'Prenatal / OB-GYN', 'Vaccinations'],
    insurancePricing: 'Insurance & Pricing',
    whichPatients: 'Which patients do you serve?',
    patientList: ['Uninsured patients', 'Medicaid', 'Medicare', 'Sliding-scale fees', 'Marketplace / ACA'],
    dispenseQuestion: 'Do you dispense medications on-site?',
    dispenseOptions: ['Yes — free or low-cost meds available', 'Yes — 340B drug pricing program', 'No'],
    languagesSpoken: 'Languages Spoken',
    languageList: ['English', 'Spanish / Español', 'Haitian Creole', 'Portuguese', 'Other'],
    choosePlan: 'Choose Your Plan',
    plans: [
      { name: 'Basic (Free)', desc: 'Listed in directory, Patients can find and call you.' },
      { name: 'Featured ($99 /mo)', desc: 'Top placement, AI matching, and basic analytics.' },
      { name: 'Partner ($299 /mo)', desc: 'For networks & hospitals with advanced needs.' },
    ],
    submit: "Submit — We'll Reach Out in 24h",
    submitting: 'Submitting…',
    submitFailed: 'Something went wrong submitting your registration. Please try again.',
    captchaFailed: 'Captcha verification failed. Please complete the check and try again.',
    successTitle: 'Thanks — your registration is in',
    successBody: "Our team will review your clinic's details and reach out within 24 hours.",
    referenceLabel: 'Reference',
    disclaimer: 'Your information is private and never sold. MedicBridges is a non-commercial academic prototype.',
  },
  es: {
    badge: 'Para Proveedores de Salud',
    title: 'Registra tu Clínica',
    subtitle: 'Comienza a llegar a pacientes de Medicaid y sin seguro pre-evaluados en Miami. Publícate gratis — mejora tu plan cuando veas resultados.',
    clinicInfo: 'Información de la Clínica',
    nameLabel: 'Nombre de la Clínica / Organización *',
    namePlaceholder: 'p. ej. Centro de Salud Comunitario de Miami',
    typeLabel: 'Tipo de Clínica *',
    typeSelect: 'Selecciona un tipo...',
    typeOptions: {
      fqhc: 'FQHC / Centro de Salud Comunitario',
      free: 'Clínica Gratuita',
      mental: 'Centro de Salud Mental',
      pharmacy: 'Farmacia Comunitaria',
      hospital: 'Hospital / Sistema de Salud',
      planned_parenthood: 'Planned Parenthood / Salud Reproductiva',
      dental: 'Clínica Dental',
      other: 'Otro',
    },
    zipLabel: 'Código Postal *',
    phoneLabel: 'Número de Teléfono *',
    addressLabel: 'Dirección Completa *',
    addressPlaceholder: '123 Main St, Miami, FL',
    websiteLabel: 'Sitio web (opcional)',
    hoursLabel: 'Horario de Atención *',
    hoursPlaceholder: 'p. ej. Lun-Vie: 8am - 5pm',
    descLabel: 'Breve Descripción',
    descPlaceholder: 'Cuéntales a los pacientes un poco sobre tu clínica...',
    contactPerson: 'Persona de Contacto',
    fullName: 'Nombre Completo *',
    roleLabel: 'Cargo / Título *',
    rolePlaceholder: 'p. ej. Director de la Clínica',
    emailLabel: 'Correo electrónico *',
    directPhone: 'Teléfono Directo',
    services: 'Servicios Ofrecidos',
    servicesPrompt: 'Selecciona todos los servicios que ofrece tu clínica:',
    serviceList: ['Atención Primaria', 'Dental', 'Salud Mental / Terapia', 'Farmacia / Medicamentos', 'Salud de la Mujer', 'Pediatría', 'Visión', 'VIH/SIDA', 'Abuso de Sustancias', 'Manejo de Enfermedades Crónicas', 'Prenatal / Ginecología', 'Vacunas'],
    insurancePricing: 'Seguro y Precios',
    whichPatients: '¿A qué pacientes atiendes?',
    patientList: ['Pacientes sin seguro', 'Medicaid', 'Medicare', 'Tarifas de escala móvil', 'Marketplace / ACA'],
    dispenseQuestion: '¿Entregan medicamentos en el lugar?',
    dispenseOptions: ['Sí — medicamentos gratuitos o de bajo costo disponibles', 'Sí — programa de precios de medicamentos 340B', 'No'],
    languagesSpoken: 'Idiomas que se Hablan',
    languageList: ['Inglés', 'Español', 'Creole Haitiano', 'Portugués', 'Otro'],
    choosePlan: 'Elige tu Plan',
    plans: [
      { name: 'Básico (Gratis)', desc: 'Aparece en el directorio; los pacientes pueden encontrarte y llamarte.' },
      { name: 'Destacado ($99 /mes)', desc: 'Ubicación superior, coincidencia con IA y análisis básicos.' },
      { name: 'Socio ($299 /mes)', desc: 'Para redes y hospitales con necesidades avanzadas.' },
    ],
    submit: 'Enviar — Te Contactaremos en 24h',
    submitting: 'Enviando…',
    submitFailed: 'Algo salió mal al enviar tu registro. Inténtalo de nuevo.',
    captchaFailed: 'La verificación de captcha falló. Completa la verificación e inténtalo de nuevo.',
    successTitle: 'Gracias — recibimos tu registro',
    successBody: 'Nuestro equipo revisará los datos de tu clínica y te contactará en las próximas 24 horas.',
    referenceLabel: 'Referencia',
    disclaimer: 'Tu información es privada y nunca se vende. MedicBridges es un prototipo académico no comercial.',
  },
};

const TYPE_KEYS = ['fqhc', 'free', 'mental', 'pharmacy', 'hospital', 'planned_parenthood', 'dental', 'other'];
// Stable API keys, index-aligned with the localized lists in CONTENT.
const SERVICE_KEYS = ['primary_care', 'dental', 'mental_health', 'pharmacy', 'womens_health', 'pediatrics', 'vision', 'hiv_aids', 'substance_abuse', 'chronic_disease', 'prenatal_obgyn', 'vaccinations'];
const PATIENT_KEYS = ['uninsured', 'medicaid', 'medicare', 'sliding_scale', 'marketplace'];
const DISPENSE_KEYS = ['low_cost', '340b', 'no'];
const LANGUAGE_KEYS = ['en', 'es', 'ht', 'pt', 'other'];
const PLAN_KEYS = ['basic', 'featured', 'partner'];
// Paid plans (Featured / Partner) are hidden until billing exists.
const PAID_PLANS_ENABLED = false;

const initialForm = {
  clinic_name: '', clinic_type: '', zip: '', phone: '', address: '', website: '',
  hours: '', description: '', contact_name: '', contact_role: '', contact_email: '',
  contact_phone: '', services: [], patients_served: [], dispenses_meds: null,
  languages: ['en'], plan: 'basic',
};

const toggle = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

const ClinicSignup = () => {
  const { lang } = useLang();
  const t = CONTENT[lang];
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [reference, setReference] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaNonce, setCaptchaNonce] = useState(0); // remount Turnstile after a failed submit

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const field = (name) => ({ value: form[name], onChange: (e) => set({ [name]: e.target.value }) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = { ...form, lang };
      if (TURNSTILE_SITE_KEY && captchaToken) payload.captcha_token = captchaToken;
      const res = await submitClinicRegistration(payload);
      setReference(res.reference);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // A Turnstile token is single-use; discard it and remount the widget.
      setSubmitError(err?.code === 'captcha_failed' ? t.captchaFailed : t.submitFailed);
      setCaptchaToken(null);
      setCaptchaNonce((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <div className="page-container" style={{ padding: '4rem 2rem', maxWidth: '720px', animation: 'fadeIn 0.6s ease-out' }}>
        <div className="mb-bento-card" role="status" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <CheckCircle size={48} style={{ color: 'var(--mb-accent)', marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{t.successTitle}</h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)', marginBottom: '1.5rem' }}>{t.successBody}</p>
          <p style={{ color: 'var(--mb-text-secondary)' }}>{t.referenceLabel}: <strong>{reference}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '4rem 2rem', maxWidth: '1200px', animation: 'fadeIn 0.6s ease-out' }}>

      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-lime-soft)', color: 'var(--mb-accent)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1rem' }}>
          {t.badge}
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{t.title}</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)' }}>
          {t.subtitle}
        </p>
      </div>

      <div className="mb-bento-card">
        <form onSubmit={handleSubmit}>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.clinicInfo}</h2>

          <div className="mb-input-group">
            <label className="mb-label">{t.nameLabel}</label>
            <input type="text" className="mb-input" placeholder={t.namePlaceholder} required maxLength={300} {...field('clinic_name')} />
          </div>

          <div className="mb-input-group">
            <label className="mb-label">{t.typeLabel}</label>
            <select className="mb-select" required {...field('clinic_type')}>
              <option value="">{t.typeSelect}</option>
              {TYPE_KEYS.map((k) => (
                <option key={k} value={k}>{t.typeOptions[k]}</option>
              ))}
            </select>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">{t.zipLabel}</label>
              <input type="text" className="mb-input" placeholder="e.g. 33101" required inputMode="numeric" pattern="\d{5}(-\d{4})?" {...field('zip')} />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">{t.phoneLabel}</label>
              <input type="tel" className="mb-input" placeholder="(305) 555-0123" required maxLength={50} {...field('phone')} />
            </div>
          </div>

          <div className="mb-input-group">
            <label className="mb-label">{t.addressLabel}</label>
            <input type="text" className="mb-input" placeholder={t.addressPlaceholder} required maxLength={500} {...field('address')} />
          </div>

          <div className="mb-input-group">
            <label className="mb-label">{t.websiteLabel}</label>
            <input type="url" className="mb-input" placeholder="https://..." maxLength={500} {...field('website')} />
          </div>

          <div className="mb-input-group">
            <label className="mb-label">{t.hoursLabel}</label>
            <input type="text" className="mb-input" placeholder={t.hoursPlaceholder} required maxLength={300} {...field('hours')} />
          </div>

          <div className="mb-input-group">
            <label className="mb-label">{t.descLabel}</label>
            <textarea className="mb-textarea" rows="4" placeholder={t.descPlaceholder} maxLength={2000} {...field('description')}></textarea>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.contactPerson}</h2>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">{t.fullName}</label>
              <input type="text" className="mb-input" required maxLength={200} {...field('contact_name')} />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">{t.roleLabel}</label>
              <input type="text" className="mb-input" placeholder={t.rolePlaceholder} required maxLength={200} {...field('contact_role')} />
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="mb-input-group">
              <label className="mb-label">{t.emailLabel}</label>
              <input type="email" className="mb-input" required maxLength={320} {...field('contact_email')} />
            </div>
            <div className="mb-input-group">
              <label className="mb-label">{t.directPhone}</label>
              <input type="tel" className="mb-input" maxLength={50} {...field('contact_phone')} />
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.services}</h2>
          <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>{t.servicesPrompt}</p>

          <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {t.serviceList.map((label, i) => (
              <label key={SERVICE_KEYS[i]} className="mb-checkbox-label">
                <input type="checkbox" checked={form.services.includes(SERVICE_KEYS[i])} onChange={() => set({ services: toggle(form.services, SERVICE_KEYS[i]) })} /> {label}
              </label>
            ))}
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.insurancePricing}</h2>
          <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>{t.whichPatients}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            {t.patientList.map((label, i) => (
              <label key={PATIENT_KEYS[i]} className="mb-checkbox-label">
                <input type="checkbox" checked={form.patients_served.includes(PATIENT_KEYS[i])} onChange={() => set({ patients_served: toggle(form.patients_served, PATIENT_KEYS[i]) })} /> {label}
              </label>
            ))}
          </div>

          <p style={{ color: 'var(--mb-text-secondary)', marginBottom: '1rem', fontSize: '0.95rem' }}>{t.dispenseQuestion}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            {t.dispenseOptions.map((label, i) => (
              <label key={DISPENSE_KEYS[i]} className="mb-checkbox-label">
                <input type="radio" name="medications" checked={form.dispenses_meds === DISPENSE_KEYS[i]} onChange={() => set({ dispenses_meds: DISPENSE_KEYS[i] })} /> {label}
              </label>
            ))}
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.languagesSpoken}</h2>
          <div className="checkbox-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '3rem' }}>
            {t.languageList.map((label, i) => (
              <label key={LANGUAGE_KEYS[i]} className="mb-checkbox-label">
                <input type="checkbox" checked={form.languages.includes(LANGUAGE_KEYS[i])} onChange={() => set({ languages: toggle(form.languages, LANGUAGE_KEYS[i]) })} /> {label}
              </label>
            ))}
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', marginTop: '3rem', borderBottom: '1px solid var(--mb-border)', paddingBottom: '0.5rem' }}>{t.choosePlan}</h2>
          <div className="plan-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
            {t.plans.map((p, i) => (PAID_PLANS_ENABLED || PLAN_KEYS[i] === 'basic') && (
              <label key={PLAN_KEYS[i]} className="mb-bento-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer', ...(form.plan === PLAN_KEYS[i] ? { border: '1px solid var(--mb-accent)' } : {}) }}>
                <input type="radio" name="plan" checked={form.plan === PLAN_KEYS[i]} onChange={() => set({ plan: PLAN_KEYS[i] })} style={{ marginTop: '0.25rem' }} />
                <div>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{p.name}</div>
                  <div style={{ color: 'var(--mb-text-secondary)', fontSize: '0.95rem' }}>{p.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {TURNSTILE_SITE_KEY && (
              <div style={{ marginBottom: '1rem' }}>
                <Turnstile
                  key={captchaNonce}
                  siteKey={TURNSTILE_SITE_KEY}
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}
            {submitError && (
              <div role="alert" style={{ width: '100%', padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: '8px', background: '#F7E9E7', color: '#B04A3A', fontWeight: 600 }}>
                {submitError}
              </div>
            )}
            <button type="submit" className="mb-btn mb-btn-secondary" disabled={submitting || (TURNSTILE_SITE_KEY && !captchaToken)} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginBottom: '1rem' }}>
              {submitting ? t.submitting : t.submit}
              {!submitting && <ArrowRight size={20} style={{ marginLeft: '0.5rem' }} />}
            </button>
            <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.85rem', maxWidth: '500px' }}>
              {t.disclaimer}
            </p>
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

export default ClinicSignup;
