import { useState } from 'react'

// Sørensen–Dice coefficient on character frequencies.
// Returns 0–1; < 0.6 means addresses are significantly different.
function charDice(a, b) {
  const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const ca = clean(a)
  const cb = clean(b)
  if (!ca && !cb) return 1
  if (!ca || !cb) return 0
  const freq = (s) => {
    const f = {}
    for (const c of s) f[c] = (f[c] || 0) + 1
    return f
  }
  const fa = freq(ca)
  const fb = freq(cb)
  let common = 0
  for (const c in fa) common += Math.min(fa[c], fb[c] || 0)
  return (2 * common) / (ca.length + cb.length)
}

function Field({ label, value, mono, highlight }) {
  const empty = value == null || value === ''
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div
        className={[
          'field-value',
          empty ? 'empty' : '',
          mono ? 'npi' : '',
          highlight ? 'highlight' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {empty ? '—' : value}
      </div>
    </div>
  )
}

export default function DetailView({ candidate: c, onBack, onAccept, onReject }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const addrHighlight =
    charDice(c.address, c.nppes_address_1) < 0.6 &&
    (c.address || c.nppes_address_1)

  const handle = (action) => async () => {
    setLoading(true)
    setError(null)
    try {
      await action(c.id)
    } catch (e) {
      setError(e.message || 'Request failed')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <h2>{c.site_name}</h2>
        <span className="detail-status">{c.status}</span>
      </div>

      <div className="cards">
        {/* Left: HRSA / existing record */}
        <div className="card">
          <div className="card-title">HRSA Record</div>
          <Field label="Site Name" value={c.site_name} />
          <Field label="Address" value={c.address} />
          <Field
            label="City / State / ZIP"
            value={[c.city, c.state, c.zip_code].filter(Boolean).join(', ')}
          />
          <Field label="Site NPI" value={c.site_npi} mono />
          <Field label="Org NPI" value={c.org_npi} mono />
          <Field label="Phone" value={c.phone} />
          <Field label="BHCMIS ID" value={c.bhcmis_id} />
        </div>

        {/* Right: NPPES candidate */}
        <div className="card">
          <div className="card-title">NPPES Candidate</div>
          <Field label="Legal Business Name" value={c.nppes_name} />
          <Field label="Address" value={c.nppes_address_1} highlight={!!addrHighlight} />
          {c.nppes_address_2 && <Field label="Address Line 2" value={c.nppes_address_2} />}
          <Field
            label="City / State / ZIP"
            value={[c.nppes_city, c.nppes_state, c.nppes_zip].filter(Boolean).join(', ')}
          />
          <Field label="Candidate NPI" value={c.candidate_npi} mono />

          {/* Entity type — warn if not "2" (organizational) */}
          <div className="field">
            <div className="field-label">Entity Type</div>
            <div className="field-value">
              {c.nppes_entity_type || '—'}
              {c.nppes_entity_type && c.nppes_entity_type !== '2' && (
                <span className="badge-warning" style={{ marginLeft: 8 }}>
                  NOT ORG
                </span>
              )}
            </div>
          </div>

          <Field label="Primary Taxonomy" value={c.nppes_primary_taxonomy} />
          <Field label="Enumeration Date" value={c.nppes_enumeration_date} />

          {/* Deactivation date — red warning if populated */}
          <div className="field">
            <div className="field-label">Deactivation Date</div>
            <div className="field-value">
              {c.nppes_deactivation_date ? (
                <>
                  {c.nppes_deactivation_date}
                  <span className="badge-danger" style={{ marginLeft: 8 }}>
                    DEACTIVATED
                  </span>
                </>
              ) : (
                <span className="empty">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Match metadata */}
      <div className="match-meta">
        <div className="meta-item">
          <span className="meta-label">Match Score</span>
          <span className="meta-value">{(c.match_score * 100).toFixed(1)}%</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Match Tier</span>
          <span className="meta-value">Tier {c.match_tier}</span>
        </div>
        {c.matched_on &&
          Object.entries(c.matched_on).map(([k, v]) => (
            <div key={k} className="meta-item">
              <span className="meta-label">{k}</span>
              <span className="meta-value" style={{ fontSize: '0.85rem' }}>
                {String(v)}
              </span>
            </div>
          ))}
      </div>

      {/* Actions */}
      <div className="actions">
        <button className="btn-accept" disabled={loading} onClick={handle(onAccept)}>
          {loading ? 'Saving…' : 'Accept'}
        </button>
        <button className="btn-reject" disabled={loading} onClick={handle(onReject)}>
          {loading ? 'Saving…' : 'Reject'}
        </button>
        <button className="btn-skip" onClick={onBack}>
          Skip
        </button>
        {error && <span className="action-error">{error}</span>}
      </div>
    </div>
  )
}
