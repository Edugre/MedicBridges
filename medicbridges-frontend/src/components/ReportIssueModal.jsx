import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Flag, MapPin, Clock, XCircle, Copy, MessageCircle,
  Check, ArrowRight, ArrowLeft, X, Lock, Ticket,
} from 'lucide-react';
import { useLang } from '../context/LangContext';
import { submitReport } from '../api';
import Turnstile from './Turnstile';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

// ---------------------------------------------------------------------------
// Localized copy. Mirrors the app-wide en/es pattern (see Clinic/index.jsx).
// ---------------------------------------------------------------------------
const CONTENT = {
  en: {
    eyebrow: 'Report an issue',
    closeModal: 'Close',
    steps: ['Issue', 'Details', 'Done'],
    // Step 1
    step1Title: 'What needs fixing?',
    step1Sub: 'Pick the option that best describes the problem. No account needed.',
    issueTypes: {
      wrong_info: { name: 'Wrong info', desc: 'Hours, phone, address or website' },
      closed_moved: { name: 'Closed or moved', desc: 'Permanently closed or relocated' },
      duplicate: { name: 'Duplicate listing', desc: 'This clinic appears more than once' },
      feedback: { name: 'General feedback', desc: 'Something else about this clinic' },
    },
    continue: 'Continue',
    back: 'Back',
    submit: 'Submit report',
    submitting: 'Submitting…',
    submitFailed: "Something went wrong submitting your report. Please try again.",
    captchaFailed: "Captcha verification failed. Please complete the check and try again.",
    verifyHuman: 'Confirm you are human',
    // Step 2A — wrong info
    typeLabels: {
      wrong_info: 'Wrong info',
      closed_moved: 'Closed or moved',
      duplicate: 'Duplicate',
      feedback: 'Feedback',
    },
    wrongTitle: 'What should it say?',
    whichWrong: 'Which details are wrong? (select all that apply)',
    details: { hours: 'Hours', phone: 'Phone', address: 'Address', website: 'Website' },
    currentlyListed: 'Currently listed',
    shouldBe: 'Should be',
    notListed: 'Not listed',
    // Step 2B — closed / moved
    closedTitle: 'Is it closed or did it move?',
    closedOptions: {
      closed: { name: 'Permanently closed', desc: 'This clinic has shut down for good' },
      moved: { name: 'Moved to a new location', desc: 'Same clinic, different address' },
    },
    newAddress: 'New address',
    required: '(required)',
    newAddressPlaceholder: 'Street, city, state ZIP',
    // Step 2C — feedback
    feedbackTitle: "Tell us what's going on",
    feedbackCategories: {
      accessibility: 'Accessibility',
      staff_service: 'Staff & service',
      wait_times: 'Wait times',
      something_else: 'Something else',
    },
    yourFeedback: 'Your feedback',
    feedbackPlaceholder: "Share what you'd like the MedicBridges team to know about this clinic…",
    // Duplicate
    duplicateTitle: 'Confirm this is a duplicate',
    duplicateSub: 'Tell us where you saw the other listing so we can merge them.',
    // Shared blocks
    addNote: 'Add a note (optional)',
    notePlaceholder: 'How do you know? e.g. I visited on Saturday, or a staff member told me…',
    yourName: 'Your name',
    yourOrg: 'Your organization',
    namePlaceholder: 'First & last name',
    orgPlaceholder: 'Clinic, nonprofit, etc.',
    emailLabel: 'Email for follow-up',
    emailPlaceholder: 'you@example.com',
    emailInvalid: 'Enter a valid email address.',
    optional: '(optional)',
    anonTitle: "You're reporting anonymously.",
    anonBody: "No account needed. We only use your email to ask a follow-up question if we can't verify the change.",
    // Step 3
    successTitle: "Thanks — that's a big help",
    successBody: "Our team will review your report and update the listing once we can verify it. If you left an email, we'll reach out with any questions. Accurate info helps everyone find care.",
    reportNumber: (n) => `Report #${n}`,
    backToClinic: 'Back to clinic',
  },
  es: {
    eyebrow: 'Reportar un problema',
    closeModal: 'Cerrar',
    steps: ['Problema', 'Detalles', 'Listo'],
    step1Title: '¿Qué hay que corregir?',
    step1Sub: 'Elige la opción que mejor describa el problema. No se necesita cuenta.',
    issueTypes: {
      wrong_info: { name: 'Información incorrecta', desc: 'Horarios, teléfono, dirección o sitio web' },
      closed_moved: { name: 'Cerrada o reubicada', desc: 'Cerrada permanentemente o reubicada' },
      duplicate: { name: 'Listado duplicado', desc: 'Esta clínica aparece más de una vez' },
      feedback: { name: 'Comentario general', desc: 'Algo más sobre esta clínica' },
    },
    continue: 'Continuar',
    back: 'Atrás',
    submit: 'Enviar reporte',
    submitting: 'Enviando…',
    submitFailed: 'Algo salió mal al enviar tu reporte. Inténtalo de nuevo.',
    captchaFailed: 'La verificación de captcha falló. Completa la verificación e inténtalo de nuevo.',
    verifyHuman: 'Confirma que eres humano',
    typeLabels: {
      wrong_info: 'Info incorrecta',
      closed_moved: 'Cerrada o reubicada',
      duplicate: 'Duplicado',
      feedback: 'Comentario',
    },
    wrongTitle: '¿Qué debería decir?',
    whichWrong: '¿Qué datos están incorrectos? (selecciona todos los que apliquen)',
    details: { hours: 'Horarios', phone: 'Teléfono', address: 'Dirección', website: 'Sitio web' },
    currentlyListed: 'Actualmente listado',
    shouldBe: 'Debería ser',
    notListed: 'No listado',
    closedTitle: '¿Está cerrada o se mudó?',
    closedOptions: {
      closed: { name: 'Cerrada permanentemente', desc: 'Esta clínica cerró definitivamente' },
      moved: { name: 'Se mudó a otra ubicación', desc: 'Misma clínica, otra dirección' },
    },
    newAddress: 'Nueva dirección',
    required: '(obligatorio)',
    newAddressPlaceholder: 'Calle, ciudad, estado y código postal',
    feedbackTitle: 'Cuéntanos qué está pasando',
    feedbackCategories: {
      accessibility: 'Accesibilidad',
      staff_service: 'Personal y servicio',
      wait_times: 'Tiempos de espera',
      something_else: 'Algo más',
    },
    yourFeedback: 'Tu comentario',
    feedbackPlaceholder: 'Comparte lo que quieras que el equipo de MedicBridges sepa sobre esta clínica…',
    duplicateTitle: 'Confirma que es un duplicado',
    duplicateSub: 'Dinos dónde viste el otro listado para que podamos combinarlos.',
    addNote: 'Agregar una nota (opcional)',
    notePlaceholder: '¿Cómo lo sabes? p. ej. la visité el sábado, o me lo dijo un miembro del personal…',
    yourName: 'Tu nombre',
    yourOrg: 'Tu organización',
    namePlaceholder: 'Nombre y apellido',
    orgPlaceholder: 'Clínica, organización, etc.',
    emailLabel: 'Correo para seguimiento',
    emailPlaceholder: 'tu@ejemplo.com',
    emailInvalid: 'Ingresa un correo electrónico válido.',
    optional: '(opcional)',
    anonTitle: 'Estás reportando de forma anónima.',
    anonBody: 'No se necesita cuenta. Solo usamos tu correo para hacerte una pregunta de seguimiento si no podemos verificar el cambio.',
    successTitle: 'Gracias — es de gran ayuda',
    successBody: 'Nuestro equipo revisará tu reporte y actualizará el listado una vez que podamos verificarlo. Si dejaste un correo, te contactaremos con cualquier pregunta. La información precisa ayuda a todos a encontrar atención.',
    reportNumber: (n) => `Reporte #${n}`,
    backToClinic: 'Volver a la clínica',
  },
};

const ISSUE_ORDER = ['wrong_info', 'closed_moved', 'duplicate', 'feedback'];
const ISSUE_ICONS = { wrong_info: Clock, closed_moved: XCircle, duplicate: Copy, feedback: MessageCircle };
const DETAIL_ORDER = ['hours', 'phone', 'address', 'website'];
const FEEDBACK_ORDER = ['accessibility', 'staff_service', 'wait_times', 'something_else'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Modal issue type + closed state -> DB report_category enum.
const CATEGORY_FOR = (issueType, closedState) => {
  if (issueType === 'wrong_info') return 'wrong_info';
  if (issueType === 'closed_moved') return closedState === 'closed' ? 'site_closed' : 'site_moved';
  if (issueType === 'duplicate') return 'duplicate';
  return 'general_feedback';
};

// Modal feedback category -> DB feedback_topic enum ('something_else' -> 'other').
const TOPIC_FOR = (cat) => (cat === 'something_else' ? 'other' : cat);

const initialState = {
  step: 1,
  issueType: null,
  wrongFields: [],
  wrongValues: {},
  closedState: null,
  newAddress: '',
  feedbackCategory: null,
  feedbackText: '',
  note: '',
  name: '',
  organization: '',
  email: '',
  submitting: false,
  submitError: null,
  ticketId: null,
  captchaToken: null,
  captchaNonce: 0, // bumped to force a fresh Turnstile widget after a failed submit
};

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------
function FieldLabel({ children, requiredHint }) {
  return (
    <span className="ri-flabel">
      {children}
      {requiredHint && <span style={{ color: 'var(--mb-primary)' }}> {requiredHint}</span>}
    </span>
  );
}

function AnonNotice({ t }) {
  return (
    <div className="ri-anon">
      <Lock size={16} className="ri-anon-ic" />
      <div className="ri-anon-t">
        <strong>{t.anonTitle}</strong> {t.anonBody}
      </div>
    </div>
  );
}

// Shared identity + email block used by every Step-2 pane.
function IdentityFields({ t, name, organization, email, emailError, onChange }) {
  return (
    <>
      <div className="ri-swap">
        <div className="ri-swapcol">
          <FieldLabel requiredHint={t.optional}>{t.yourName}</FieldLabel>
          <input
            className="ri-inp"
            type="text"
            value={name}
            placeholder={t.namePlaceholder}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </div>
        <div className="ri-swapcol">
          <FieldLabel requiredHint={t.optional}>{t.yourOrg}</FieldLabel>
          <input
            className="ri-inp"
            type="text"
            value={organization}
            placeholder={t.orgPlaceholder}
            onChange={(e) => onChange('organization', e.target.value)}
          />
        </div>
      </div>

      <div style={{ marginBottom: '4px' }}>
        <FieldLabel requiredHint={t.optional}>{t.emailLabel}</FieldLabel>
        <input
          className="ri-inp"
          type="email"
          value={email}
          placeholder={t.emailPlaceholder}
          aria-invalid={emailError || undefined}
          onChange={(e) => onChange('email', e.target.value)}
        />
        {emailError && (
          <div style={{ fontSize: '12px', color: '#B04A3A', marginTop: '6px' }}>{t.emailInvalid}</div>
        )}
      </div>

      <AnonNotice t={t} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ReportIssueModal = ({
  isOpen,
  onClose,
  clinicName,
  current = {},
  subjectType = 'site',
  subjectKey,
}) => {
  const { lang } = useLang();
  const t = CONTENT[lang];
  const [s, setS] = useState(initialState);
  const panelRef = useRef(null);

  const set = (patch) => setS((prev) => ({ ...prev, ...patch }));

  // Reset to a clean slate on the way out so the next open starts fresh
  // (the component stays mounted and simply renders null while closed).
  const handleClose = () => {
    setS(initialState);
    onClose();
  };

  // Body-scroll lock + Esc-to-close, matching SearchOptionsModal.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const emailError = s.email.trim() !== '' && !EMAIL_RE.test(s.email.trim());

  // Per-step "can advance" gate.
  const canSubmit = useMemo(() => {
    if (emailError) return false;
    // When captcha is enabled, a valid token is required to submit.
    if (TURNSTILE_SITE_KEY && !s.captchaToken) return false;
    switch (s.issueType) {
      case 'wrong_info':
        return s.wrongFields.length > 0
          && s.wrongFields.every((k) => (s.wrongValues[k] || '').trim() !== '');
      case 'closed_moved':
        if (!s.closedState) return false;
        if (s.closedState === 'moved') return s.newAddress.trim() !== '';
        return true;
      case 'feedback':
        return s.feedbackText.trim() !== '';
      case 'duplicate':
        return true;
      default:
        return false;
    }
  }, [s, emailError]);

  if (!isOpen) return null;

  const currentValueFor = (key) => (current[key] || '').trim();

  const toggleWrongField = (key) => {
    setS((prev) => {
      const on = prev.wrongFields.includes(key);
      return {
        ...prev,
        wrongFields: on ? prev.wrongFields.filter((k) => k !== key) : [...prev.wrongFields, key],
      };
    });
  };

  const goToDetails = () => {
    if (!s.issueType) return;
    set({ step: 2 });
  };

  const buildPayload = () => {
    const category = CATEGORY_FOR(s.issueType, s.closedState);
    const payload = {
      subject_type: subjectType,
      subject_key: subjectKey,
      category,
      reporter_name: s.name.trim() || undefined,
      reporter_organization: s.organization.trim() || undefined,
      reporter_email: s.email.trim() || undefined,
    };

    if (category === 'site_moved') payload.new_address = s.newAddress.trim();

    if (s.issueType === 'feedback') {
      payload.description = s.feedbackText.trim();
      if (s.feedbackCategory) payload.feedback_topic = TOPIC_FOR(s.feedbackCategory);
    } else if (s.note.trim()) {
      payload.description = s.note.trim();
    }

    if (s.issueType === 'wrong_info') {
      payload.fields = s.wrongFields.map((key) => ({
        field: key,
        currently_listed: currentValueFor(key) || undefined,
        should_be: (s.wrongValues[key] || '').trim(),
      }));
    }

    if (TURNSTILE_SITE_KEY && s.captchaToken) payload.captcha_token = s.captchaToken;

    return payload;
  };

  const handleSubmit = async () => {
    if (!canSubmit || s.submitting) return;
    set({ submitting: true, submitError: null });
    try {
      const res = await submitReport(buildPayload());
      set({ submitting: false, ticketId: res.reference, step: 3 });
    } catch (err) {
      // A Turnstile token is single-use; on any failure discard it and remount
      // the widget (bump nonce) so the user gets a fresh challenge to retry.
      set({
        submitting: false,
        submitError: err?.code === 'captcha_failed' ? t.captchaFailed : t.submitFailed,
        captchaToken: null,
        captchaNonce: s.captchaNonce + 1,
      });
    }
  };

  // Stepper cell state helper.
  const stepState = (n) => (s.step > n ? 'done' : s.step === n ? 'now' : 'next');

  const currentTitle = () => {
    if (s.issueType === 'wrong_info') return t.wrongTitle;
    if (s.issueType === 'closed_moved') return t.closedTitle;
    if (s.issueType === 'feedback') return t.feedbackTitle;
    if (s.issueType === 'duplicate') return t.duplicateTitle;
    return '';
  };

  const closeBtn = (bg) => (
    <button
      type="button"
      onClick={handleClose}
      aria-label={t.closeModal}
      className="ri-x"
      style={{ background: bg }}
    >
      <X size={18} />
    </button>
  );

  return (
    <div
      role="presentation"
      onClick={handleClose}
      className="ri-overlay"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ri-title"
        onClick={(e) => e.stopPropagation()}
        className="ri-panel"
      >
        <div className="ri-grab" aria-hidden="true" />

        {s.step === 3 ? (
          // ----------------------------- Step 3 -----------------------------
          <>
            {closeBtn('#F1ECE0')}
            <div className="ri-succ">
              <div className="ri-succ-ic">
                <Check size={38} strokeWidth={2.4} />
              </div>
              <div className="ri-ticket">
                <Ticket size={15} /> {t.reportNumber(s.ticketId)}
              </div>
              <h2 id="ri-title" className="ri-succ-title">{t.successTitle}</h2>
              <p className="ri-succ-body">{t.successBody}</p>
              <button type="button" className="ri-cta ri-cta-full" onClick={handleClose}>
                {t.backToClinic} <ArrowRight size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ----------------------------- Header ----------------------------- */}
            <div className="ri-head">
              {closeBtn('rgba(255,255,255,.7)')}
              <span className="ri-eyebrow">
                <Flag size={13} />
                {s.step === 2 ? `${t.eyebrow} · ${t.typeLabels[s.issueType]}` : t.eyebrow}
              </span>
              <div id="ri-title" className="ri-title">
                {s.step === 1 ? t.step1Title : currentTitle()}
              </div>
              {s.step === 1 && clinicName && (
                <div className="ri-ctx">
                  <MapPin size={14} color="var(--mb-primary)" /> {clinicName}
                </div>
              )}
            </div>

            {/* ----------------------------- Stepper ---------------------------- */}
            <div className="ri-steps">
              {t.steps.map((label, i) => {
                const n = i + 1;
                const state = stepState(n);
                return (
                  <div key={label} style={{ display: 'contents' }}>
                    {i > 0 && <div className={`ri-stp-line${s.step > i ? ' done' : ''}`} />}
                    <div className={`ri-stp ${state}`}>
                      <div className="ri-dot">
                        {state === 'done' ? <Check size={14} strokeWidth={3} /> : n}
                      </div>
                      <span className="ri-lbl">{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ------------------------------ Body ------------------------------ */}
            <div className="ri-body">
              {s.step === 1 && (
                <>
                  <div className="ri-qs">{t.step1Sub}</div>
                  {ISSUE_ORDER.map((key) => {
                    const Icon = ISSUE_ICONS[key];
                    const sel = s.issueType === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`ri-orow${sel ? ' sel' : ''}`}
                        aria-pressed={sel}
                        onClick={() => set({ issueType: key })}
                      >
                        <span className="ri-oic"><Icon size={20} /></span>
                        <span style={{ flex: 1, textAlign: 'left' }}>
                          <span className="ri-oname">{t.issueTypes[key].name}</span>
                          <span className="ri-odesc">{t.issueTypes[key].desc}</span>
                        </span>
                        <span className="ri-oradio" />
                      </button>
                    );
                  })}
                </>
              )}

              {s.step === 2 && s.issueType === 'wrong_info' && (
                <>
                  <FieldLabel>{t.whichWrong}</FieldLabel>
                  <div className="ri-subchips">
                    {DETAIL_ORDER.map((key) => {
                      const on = s.wrongFields.includes(key);
                      return (
                        <button
                          type="button"
                          key={key}
                          className={`ri-schip${on ? ' on' : ''}`}
                          aria-pressed={on}
                          onClick={() => toggleWrongField(key)}
                        >
                          {on && <Check size={13} strokeWidth={3} style={{ marginRight: '4px' }} />}
                          {t.details[key]}
                        </button>
                      );
                    })}
                  </div>

                  {s.wrongFields.map((key) => (
                    <div className="ri-card" key={key}>
                      <div className="ri-card-h">{t.details[key]}</div>
                      <div className="ri-swap">
                        <div className="ri-swapcol">
                          <FieldLabel>{t.currentlyListed}</FieldLabel>
                          <input
                            className="ri-inp cur"
                            type="text"
                            readOnly
                            value={currentValueFor(key) || t.notListed}
                          />
                        </div>
                        <ArrowRight size={18} className="ri-arr" />
                        <div className="ri-swapcol">
                          <FieldLabel>{t.shouldBe}</FieldLabel>
                          <input
                            className="ri-inp"
                            type="text"
                            value={s.wrongValues[key] || ''}
                            onChange={(e) =>
                              set({ wrongValues: { ...s.wrongValues, [key]: e.target.value } })}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginBottom: '18px' }}>
                    <FieldLabel>{t.addNote}</FieldLabel>
                    <textarea
                      className="ri-ta"
                      value={s.note}
                      placeholder={t.notePlaceholder}
                      onChange={(e) => set({ note: e.target.value })}
                    />
                  </div>

                  <IdentityFields
                    t={t}
                    name={s.name}
                    organization={s.organization}
                    email={s.email}
                    emailError={emailError}
                    onChange={(field, value) => set({ [field]: value })}
                  />
                </>
              )}

              {s.step === 2 && s.issueType === 'closed_moved' && (
                <>
                  {['closed', 'moved'].map((key) => {
                    const sel = s.closedState === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        className={`ri-orow${sel ? ' sel' : ''}`}
                        aria-pressed={sel}
                        onClick={() => set({ closedState: key })}
                      >
                        <span style={{ flex: 1, textAlign: 'left' }}>
                          <span className="ri-oname">{t.closedOptions[key].name}</span>
                          <span className="ri-odesc">{t.closedOptions[key].desc}</span>
                        </span>
                        <span className="ri-oradio" />
                      </button>
                    );
                  })}

                  {s.closedState === 'moved' && (
                    <div style={{ margin: '18px 0' }}>
                      <FieldLabel requiredHint={t.required}>{t.newAddress}</FieldLabel>
                      <input
                        className="ri-inp"
                        type="text"
                        value={s.newAddress}
                        placeholder={t.newAddressPlaceholder}
                        onChange={(e) => set({ newAddress: e.target.value })}
                      />
                    </div>
                  )}

                  <div style={{ margin: '18px 0' }}>
                    <FieldLabel>{t.addNote}</FieldLabel>
                    <textarea
                      className="ri-ta"
                      value={s.note}
                      placeholder={t.notePlaceholder}
                      onChange={(e) => set({ note: e.target.value })}
                    />
                  </div>

                  <IdentityFields
                    t={t}
                    name={s.name}
                    organization={s.organization}
                    email={s.email}
                    emailError={emailError}
                    onChange={(field, value) => set({ [field]: value })}
                  />
                </>
              )}

              {s.step === 2 && s.issueType === 'feedback' && (
                <>
                  <div className="ri-subchips">
                    {FEEDBACK_ORDER.map((key) => {
                      const on = s.feedbackCategory === key;
                      return (
                        <button
                          type="button"
                          key={key}
                          className={`ri-schip${on ? ' on' : ''}`}
                          aria-pressed={on}
                          onClick={() => set({ feedbackCategory: key })}
                        >
                          {t.feedbackCategories[key]}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <FieldLabel requiredHint={t.required}>{t.yourFeedback}</FieldLabel>
                    <textarea
                      className="ri-ta"
                      style={{ minHeight: '120px' }}
                      value={s.feedbackText}
                      placeholder={t.feedbackPlaceholder}
                      onChange={(e) => set({ feedbackText: e.target.value })}
                    />
                  </div>

                  <IdentityFields
                    t={t}
                    name={s.name}
                    organization={s.organization}
                    email={s.email}
                    emailError={emailError}
                    onChange={(field, value) => set({ [field]: value })}
                  />
                </>
              )}

              {s.step === 2 && s.issueType === 'duplicate' && (
                <>
                  <div className="ri-qs">{t.duplicateSub}</div>
                  <div style={{ marginBottom: '18px' }}>
                    <FieldLabel>{t.addNote}</FieldLabel>
                    <textarea
                      className="ri-ta"
                      value={s.note}
                      placeholder={t.notePlaceholder}
                      onChange={(e) => set({ note: e.target.value })}
                    />
                  </div>

                  <IdentityFields
                    t={t}
                    name={s.name}
                    organization={s.organization}
                    email={s.email}
                    emailError={emailError}
                    onChange={(field, value) => set({ [field]: value })}
                  />
                </>
              )}

              {s.step === 2 && TURNSTILE_SITE_KEY && (
                <div className="ri-captcha">
                  <span className="ri-flabel">{t.verifyHuman}</span>
                  <Turnstile
                    key={s.captchaNonce}
                    siteKey={TURNSTILE_SITE_KEY}
                    onVerify={(token) => set({ captchaToken: token })}
                    onExpire={() => set({ captchaToken: null })}
                  />
                </div>
              )}
            </div>

            {s.submitError && (
              <div className="ri-submit-error" role="alert">{s.submitError}</div>
            )}

            {/* ----------------------------- Footer ----------------------------- */}
            <div className="ri-foot">
              <button
                type="button"
                className="ri-ghost"
                onClick={() => set({ step: 1 })}
                style={{ visibility: s.step === 1 ? 'hidden' : 'visible' }}
              >
                <ArrowLeft size={16} /> {t.back}
              </button>
              {s.step === 1 ? (
                <button type="button" className="ri-cta" disabled={!s.issueType} onClick={goToDetails}>
                  {t.continue} <ArrowRight size={18} />
                </button>
              ) : (
                <button type="button" className="ri-cta" disabled={!canSubmit || s.submitting} onClick={handleSubmit}>
                  {s.submitting ? t.submitting : t.submit}
                  {!s.submitting && <ArrowRight size={18} />}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .ri-overlay {
          position: fixed; inset: 0; z-index: 200;
          display: flex; align-items: center; justify-content: center; padding: 32px 16px;
          background: rgba(37, 48, 46, 0.5);
          backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);
        }
        .ri-panel {
          position: relative; background: #fff; border-radius: 24px;
          box-shadow: 0 20px 60px rgba(15,110,86,0.28);
          width: 492px; max-width: 100%; max-height: 600px;
          display: flex; flex-direction: column; overflow: hidden;
          animation: ri-pop 0.2s ease-out;
        }
        .ri-grab { display: none; }

        .ri-x {
          position: absolute; top: 14px; right: 14px; z-index: 2;
          width: 36px; height: 36px; border-radius: 10px; border: none;
          display: flex; align-items: center; justify-content: center;
          color: var(--mb-text-secondary); cursor: pointer;
          transition: color 0.15s ease;
        }
        .ri-x:hover { color: var(--mb-primary); }

        .ri-head {
          background: var(--mb-bg-sage); border-bottom: 1px solid #D1E8E2;
          padding: 22px 26px 20px; position: relative; flex-shrink: 0;
        }
        .ri-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--mb-primary); margin-bottom: 9px;
        }
        .ri-title {
          font-size: 21px; font-weight: 600; letter-spacing: -0.01em;
          color: var(--mb-text-primary); line-height: 1.2;
        }
        .ri-ctx {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 9px;
          background: #fff; border: 1px solid #D1E8E2; border-radius: 999px;
          padding: 5px 11px; font-size: 12.5px; font-weight: 600; color: var(--mb-text-primary);
        }

        .ri-steps { display: flex; align-items: center; gap: 0; padding: 16px 26px 0; flex-shrink: 0; }
        .ri-stp { display: flex; align-items: center; gap: 9px; }
        .ri-dot {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12.5px; font-weight: 700; flex-shrink: 0;
        }
        .ri-lbl { font-size: 12.5px; font-weight: 600; white-space: nowrap; }
        .ri-stp.done .ri-dot { background: var(--mb-primary); color: #fff; }
        .ri-stp.done .ri-lbl { color: var(--mb-primary); }
        .ri-stp.now .ri-dot { background: var(--mb-primary); color: #fff; box-shadow: 0 0 0 4px rgba(15,110,86,.15); }
        .ri-stp.now .ri-lbl { color: var(--mb-text-primary); }
        .ri-stp.next .ri-dot { background: #F1ECE0; color: var(--mb-text-disabled); }
        .ri-stp.next .ri-lbl { color: var(--mb-text-disabled); }
        .ri-stp-line { flex: 1; height: 2px; background: #ECE5D8; margin: 0 10px; }
        .ri-stp-line.done { background: var(--mb-primary); }

        .ri-body { padding: 22px 26px; overflow-y: auto; flex: 1; }
        .ri-qs { font-size: 13px; color: var(--mb-text-muted); margin-bottom: 16px; line-height: 1.45; }

        .ri-orow {
          display: flex; align-items: center; gap: 13px; width: 100%;
          padding: 13px 15px; border: 1.5px solid var(--mb-border); border-radius: 14px;
          cursor: pointer; margin-bottom: 9px; background: #fff; text-align: left;
          transition: border-color 0.14s ease, background 0.14s ease;
        }
        .ri-orow:hover { border-color: #CBD3CE; background: #FBF9F4; }
        .ri-orow.sel { border-color: var(--mb-primary); background: #F3FAF7; }
        .ri-oic {
          width: 40px; height: 40px; border-radius: 12px;
          background: var(--mb-bg-sage); color: var(--mb-primary);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          transition: background 0.14s ease, color 0.14s ease;
        }
        .ri-orow.sel .ri-oic { background: var(--mb-primary); color: #fff; }
        .ri-oname { display: block; font-size: 14.5px; font-weight: 600; color: var(--mb-text-primary); line-height: 1.2; }
        .ri-odesc { display: block; font-size: 12.5px; color: var(--mb-text-muted); margin-top: 2px; line-height: 1.4; }
        .ri-oradio {
          width: 20px; height: 20px; border-radius: 50%; border: 2px solid #D8D2C4;
          flex-shrink: 0; margin-left: auto; position: relative;
        }
        .ri-orow.sel .ri-oradio { border-color: var(--mb-primary); }
        .ri-orow.sel .ri-oradio::after {
          content: ""; position: absolute; inset: 3px; border-radius: 50%; background: var(--mb-primary);
        }

        .ri-flabel {
          font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
          text-transform: uppercase; color: var(--mb-text-muted);
          margin-bottom: 8px; display: block;
        }
        .ri-subchips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 20px; }
        .ri-schip {
          display: inline-flex; align-items: center;
          font-size: 13px; font-weight: 600; padding: 7px 13px; border-radius: 999px;
          border: 1px solid var(--mb-border); background: #fff; color: var(--mb-text-secondary);
          cursor: pointer; transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
        }
        .ri-schip:hover { border-color: #CBD3CE; }
        .ri-schip.on { background: var(--mb-primary); border-color: var(--mb-primary); color: #fff; }

        .ri-card {
          border: 1px solid var(--mb-border-soft); border-radius: 14px;
          padding: 13px 14px; background: #FBF9F4; margin-bottom: 16px;
        }
        .ri-card-h {
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.04em;
          text-transform: uppercase; color: var(--mb-primary); margin-bottom: 10px;
        }

        .ri-inp {
          width: 100%; border: 1.5px solid var(--mb-border); border-radius: 13px;
          padding: 12px 14px; font-size: 14px; font-family: inherit;
          color: var(--mb-text-primary); background: #fff;
        }
        .ri-inp:focus { outline: none; border-color: var(--mb-primary); }
        .ri-inp.cur { background: #F4F1EA; color: var(--mb-text-muted); border-style: dashed; }
        .ri-inp::placeholder { color: var(--mb-text-disabled); }

        .ri-swap { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 18px; }
        .ri-swap:last-child { margin-bottom: 0; }
        .ri-arr { color: var(--mb-primary); flex-shrink: 0; margin-top: 30px; }
        .ri-swapcol { flex: 1; min-width: 0; }

        .ri-ta {
          width: 100%; min-height: 78px; border: 1.5px solid var(--mb-border); border-radius: 13px;
          padding: 12px 14px; font-size: 14px; font-family: inherit;
          color: var(--mb-text-primary); resize: vertical; line-height: 1.5;
        }
        .ri-ta:focus { outline: none; border-color: var(--mb-primary); }
        .ri-ta::placeholder { color: var(--mb-text-disabled); }

        .ri-anon {
          display: flex; align-items: flex-start; gap: 10px;
          background: #F3FAF7; border: 1px solid #D1E8E2; border-radius: 13px;
          padding: 13px 15px; margin-top: 18px;
        }
        .ri-anon-ic { color: var(--mb-primary); flex-shrink: 0; margin-top: 1px; }
        .ri-anon-t { font-size: 12.5px; line-height: 1.5; color: #3B4642; }

        .ri-captcha { margin-top: 18px; }
        .ri-submit-error {
          padding: 11px 26px; background: #F7E9E7; color: #B04A3A;
          font-size: 12.5px; font-weight: 600; line-height: 1.4;
          border-top: 1px solid #F0D8D3; flex-shrink: 0;
        }
        .ri-foot {
          border-top: 1px solid var(--mb-border-soft); padding: 16px 26px;
          display: flex; align-items: center; justify-content: space-between;
          background: #FBF9F4; flex-shrink: 0;
        }
        .ri-cta {
          height: 44px; padding: 0 22px; border-radius: 13px; border: none;
          background: var(--mb-primary); color: #fff; font-size: 14.5px; font-weight: 600;
          cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
          transition: background 0.14s ease;
        }
        .ri-cta:hover:not(:disabled) { background: var(--mb-primary-hover); }
        .ri-cta:disabled { opacity: 0.45; cursor: not-allowed; }
        .ri-ghost {
          height: 44px; padding: 0 18px; border-radius: 13px; border: 1px solid var(--mb-border);
          background: #fff; color: var(--mb-text-secondary); font-size: 14px; font-weight: 600;
          cursor: pointer; display: inline-flex; align-items: center; gap: 7px;
          transition: color 0.14s ease, border-color 0.14s ease;
        }
        .ri-ghost:hover { color: var(--mb-text-primary); border-color: #CBD3CE; }

        .ri-succ { padding: 40px 34px; text-align: center; display: flex; flex-direction: column; align-items: center; }
        .ri-succ-ic {
          width: 72px; height: 72px; border-radius: 50%;
          background: var(--mb-bg-sage); color: var(--mb-primary);
          display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
        }
        .ri-ticket {
          display: inline-flex; align-items: center; gap: 7px;
          background: #FAEEDA; color: #B87814; border: 1px solid #F2E0C2;
          border-radius: 999px; padding: 6px 13px; font-size: 12.5px; font-weight: 700; margin-bottom: 18px;
        }
        .ri-succ-title { font-size: 22px; font-weight: 600; color: var(--mb-text-primary); margin: 0 0 12px; }
        .ri-succ-body { font-size: 14px; line-height: 1.6; color: var(--mb-text-secondary); max-width: 340px; margin: 0 0 26px; }
        .ri-cta-full { width: 100%; height: 48px; justify-content: center; }

        @keyframes ri-pop {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes ri-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .ri-overlay { align-items: flex-end; padding: 0; }
          .ri-panel {
            width: 100%; max-width: 100%; max-height: 88%;
            border-radius: 26px 26px 0 0;
            box-shadow: 0 -12px 40px rgba(0,0,0,.2);
            animation: ri-sheet-up 0.26s ease-out;
          }
          .ri-grab {
            display: block; width: 40px; height: 5px; border-radius: 999px;
            background: #D8D2C4; margin: 10px auto 4px; flex-shrink: 0;
          }
          .ri-cta { height: 48px; }
        }
      `}</style>
    </div>
  );
};

export default ReportIssueModal;
