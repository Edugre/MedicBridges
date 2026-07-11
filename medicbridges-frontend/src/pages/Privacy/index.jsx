import React from 'react';
import { useLang } from '../../context/LangContext';

const CONTENT = {
  en: {
    badge: 'Florida International University — Student Research Project',
    title: 'Privacy Policy & Terms of Use',
    subtitle: 'MedicBridges | Last updated: March 2026',
    tagline: 'Non-commercial. Non-profit. Educational purposes only.',
    sections: [
      { h: 'Summary', body: 'We are FIU students building this platform to help people find medical care. We collect only what is necessary, never sell your data, and you are here because you choose to be — not because anyone required you. This platform is a non-commercial academic prototype and is not a substitute for professional medical advice.' },
      { h: 'Who We Are', body: 'Built by students at FIU for academic research. MedicBridges is not a healthcare provider, clinic, hospital, nor an insurance agency.' },
      { h: 'Purpose of the Platform', body: 'This platform aggregates publicly available and voluntarily submitted data regarding community clinics, free clinics, and sliding-scale services to help uninsured and underinsured patients find care.' },
      { h: 'Voluntary Use', body: 'Use of this platform is strictly voluntary. No patient or clinic is required to register or use this platform.' },
      { h: 'Data We Collect', body: 'We collect basic information for matching only (e.g., ZIP code, general insurance status, age range). We never ask for social security numbers, full medical records, payment information, or official IDs.' },
      { h: 'How We Use Your Data', body: 'Data is only used for matching patients to clinics, anonymized research for our FIU capstone, and platform improvements. Your data is never sold or used for targeted advertising.' },
      { h: 'Data Storage & Security', body: 'Your data is stored securely and is not shared with third parties outside of the specific clinic you choose to connect with.' },
      { h: 'Your Rights', body: 'You can request full data deletion at any time by contacting us.' },
      { h: 'Medical Disclaimer', body: 'This platform does not provide medical advice, diagnosis, or treatment. Always seek the advice of a physician or qualified health provider with any questions you may have regarding a medical condition. In an emergency, call 911 immediately.' },
    ],
    contactH: 'Contact',
    contactPre: 'For questions, data deletion requests, or concerns, please contact our student team at: ',
    consent: 'By using this platform, you confirm you have read and understood this policy, your use is voluntary, and you understand this is a student research project with no commercial intent.',
  },
  es: {
    badge: 'Florida International University — Proyecto de Investigación Estudiantil',
    title: 'Política de Privacidad y Términos de Uso',
    subtitle: 'MedicBridges | Última actualización: marzo de 2026',
    tagline: 'No comercial. Sin fines de lucro. Solo con fines educativos.',
    sections: [
      { h: 'Resumen', body: 'Somos estudiantes de FIU que construimos esta plataforma para ayudar a las personas a encontrar atención médica. Recopilamos solo lo necesario, nunca vendemos tus datos, y estás aquí porque tú lo decidiste — no porque alguien te lo exigiera. Esta plataforma es un prototipo académico no comercial y no sustituye el consejo médico profesional.' },
      { h: 'Quiénes Somos', body: 'Creada por estudiantes de FIU para investigación académica. MedicBridges no es un proveedor de atención médica, clínica, hospital ni una agencia de seguros.' },
      { h: 'Propósito de la Plataforma', body: 'Esta plataforma reúne datos disponibles públicamente y enviados voluntariamente sobre clínicas comunitarias, clínicas gratuitas y servicios de escala móvil para ayudar a pacientes sin seguro o con seguro insuficiente a encontrar atención.' },
      { h: 'Uso Voluntario', body: 'El uso de esta plataforma es estrictamente voluntario. Ningún paciente o clínica está obligado a registrarse ni a usar esta plataforma.' },
      { h: 'Datos que Recopilamos', body: 'Recopilamos información básica únicamente para hacer coincidencias (p. ej., código postal, estado general del seguro, rango de edad). Nunca pedimos números de seguro social, expedientes médicos completos, información de pago ni identificaciones oficiales.' },
      { h: 'Cómo Usamos tus Datos', body: 'Los datos solo se usan para conectar a los pacientes con las clínicas, para investigación anonimizada de nuestro proyecto final de FIU y para mejorar la plataforma. Tus datos nunca se venden ni se usan para publicidad dirigida.' },
      { h: 'Almacenamiento y Seguridad de Datos', body: 'Tus datos se almacenan de forma segura y no se comparten con terceros fuera de la clínica específica con la que elijas conectarte.' },
      { h: 'Tus Derechos', body: 'Puedes solicitar la eliminación total de tus datos en cualquier momento contactándonos.' },
      { h: 'Aviso Médico', body: 'Esta plataforma no ofrece consejo médico, diagnóstico ni tratamiento. Busca siempre el consejo de un médico o proveedor de salud calificado ante cualquier pregunta sobre una condición médica. En una emergencia, llama al 911 de inmediato.' },
    ],
    contactH: 'Contacto',
    contactPre: 'Para preguntas, solicitudes de eliminación de datos o inquietudes, contacta a nuestro equipo estudiantil en: ',
    consent: 'Al usar esta plataforma, confirmas que has leído y entendido esta política, que tu uso es voluntario y que entiendes que es un proyecto de investigación estudiantil sin fines comerciales.',
  },
};

const Privacy = () => {
  const { lang } = useLang();
  const t = CONTENT[lang];
  return (
    <div className="page-container" style={{ padding: '4rem 2rem', maxWidth: '1200px', animation: 'fadeIn 0.6s ease-out' }}>

      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'inline-block', padding: '0.25rem 1rem', backgroundColor: 'var(--mb-bg-surface-hover)', color: 'var(--mb-text-secondary)', borderRadius: 'var(--mb-radius-pill)', marginBottom: '1rem', border: '1px solid var(--mb-border)' }}>
          {t.badge}
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{t.title}</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--mb-text-secondary)' }}>{t.subtitle}</p>
        <p style={{ marginTop: '0.5rem', color: 'var(--mb-accent)' }}><em>{t.tagline}</em></p>
      </div>

      <div className="mb-bento-card privacy-card" style={{ padding: '3rem' }}>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{t.sections[0].h}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
          {t.sections[0].body}
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid var(--mb-border)', margin: '2rem 0' }} />

        {t.sections.slice(1).map((s) => (
          <React.Fragment key={s.h}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{s.h}</h2>
            <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {s.body}
            </p>
          </React.Fragment>
        ))}

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{t.contactH}</h2>
        <p style={{ color: 'var(--mb-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          {t.contactPre}<a href="mailto:medibridge@fiu.edu" style={{ fontWeight: 600 }}>medibridge@fiu.edu</a>
        </p>

        <div style={{ padding: '1rem', backgroundColor: 'var(--mb-bg-primary)', borderRadius: 'var(--mb-radius-sm)', marginTop: '3rem' }}>
          <p style={{ color: 'var(--mb-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {t.consent}
          </p>
        </div>

      </div>

      <style>{`
        @media (max-width: 640px) {
          .privacy-card { padding: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
};

export default Privacy;
