// Shared EN/ES strings for service provenance (org vs site level, source).
export const SERVICE_TEXT = {
  en: {
    orgLevel: 'Offered by this organization. Call to confirm this location',
    source: 'Source',
    unverifiedWebsite: 'From the clinic’s website, not yet confirmed',
  },
  es: {
    orgLevel: 'Ofrecido por esta organización. Llama para confirmar en esta ubicación',
    source: 'Fuente',
    unverifiedWebsite: 'Del sitio web de la clínica, aún no confirmado',
  },
};

// Plain-language category labels, in display order (keys are API categories).
export const SERVICE_CATEGORIES = {
  'Primary Care': { en: 'Check-ups & everyday care', es: 'Chequeos y atención general' },
  Dental: { en: 'Dental care', es: 'Atención dental' },
  'Behavioral Health': { en: 'Mental health & recovery', es: 'Salud mental y recuperación' },
  Diagnostic: { en: 'Lab tests & imaging', es: 'Análisis y estudios de imagen' },
  Vision: { en: 'Eye care', es: 'Cuidado de la vista' },
  Pharmacy: { en: 'Pharmacy & medicines', es: 'Farmacia y medicinas' },
  'Enabling Services': { en: 'Help getting care', es: 'Ayuda para recibir atención' },
};

// Keyed by service.code (see supabase/migrations/*_seed_services.sql).
// `es` is the Spanish display name; `hint` is a plain-language description.
// A code without a hint renders no hint line.
const SERVICE_COPY = {
  PC: { es: 'Atención primaria', hint: { en: 'Regular doctor visits', es: 'Visitas regulares con el médico' } },
  PREV: { es: 'Salud preventiva', hint: { en: 'Check-ups, screenings and shots', es: 'Chequeos, pruebas de detección y vacunas' } },
  PED: { es: 'Pediatría', hint: { en: 'Care for kids and teens', es: 'Atención para niños y adolescentes' } },
  OBGYN: { es: 'Obstetricia y ginecología' },
  DENT: { es: 'Odontología general', hint: { en: 'Cleanings, fillings and exams', es: 'Limpiezas, empastes y exámenes' } },
  PDENT: { es: 'Odontología pediátrica', hint: { en: 'Dental care for kids', es: 'Atención dental para niños' } },
  MH: { es: 'Consejería de salud mental', hint: { en: 'Talk with a counselor', es: 'Habla con un consejero' } },
  PSY: { es: 'Psiquiatría', hint: { en: 'Medicine for mental health', es: 'Medicamentos para la salud mental' } },
  SUD: { es: 'Tratamiento para el trastorno por uso de sustancias', hint: { en: 'Help with alcohol or drug use', es: 'Ayuda con el uso de alcohol o drogas' } },
  LAB: { es: 'Análisis de laboratorio', hint: { en: 'Blood and urine tests', es: 'Análisis de sangre y orina' } },
  RAD: { es: 'Radiografías', hint: { en: 'Pictures of bones and chest', es: 'Imágenes de huesos y pecho' } },
  VIS: { es: 'Exámenes de la vista', hint: { en: 'Vision checks and glasses prescriptions', es: 'Revisión de la vista y receta para lentes' } },
  RX: { es: 'Farmacia / Dispensario 340B', hint: { en: 'Prescriptions filled on site', es: 'Surten recetas en el lugar' } },
  CM: { es: 'Manejo de casos', hint: { en: 'Help with paperwork and benefits', es: 'Ayuda con trámites y beneficios' } },
  TRANS: { es: 'Transporte para pacientes', hint: { en: 'Rides to appointments', es: 'Transporte a tus citas' } },
  LANG: { es: 'Servicios de interpretación', hint: { en: 'Help in your language', es: 'Ayuda en tu idioma' } },
};

/** Display name for a service; the API names are English-only. */
export function serviceName(service, lang) {
  return (lang === 'es' && SERVICE_COPY[service.code]?.es) || service.name;
}

/** Plain-language hint for a service, or null when we have none. */
export function serviceHint(service, lang) {
  return SERVICE_COPY[service.code]?.hint?.[lang] || null;
}

/** True when a service only comes from the clinic's website and nobody has confirmed it. */
export function isUnverifiedWebsite(service) {
  return !service.is_verified && service.source_kind === 'website';
}
