import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, BadgeCheck } from 'lucide-react';
import PlaceRow from './PlaceRow';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Counties in order of their nearest item (`items` must already be sorted closest first). */
function countiesOf(items) {
  return [...new Set(items.map((i) => i.county).filter(Boolean))];
}

/**
 * Searchable, filterable list of an organization's other locations or its
 * partner pharmacies: a right-side drawer on desktop, a bottom sheet on
 * mobile. Filters live here, so they reset each time the panel opens.
 */
const ListPanel = ({ mode, items, title, subtitle, t, onClose, siteLink }) => {
  const isLocations = mode === 'locations';
  const [query, setQuery] = useState('');
  const [county, setCounty] = useState('all');
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Esc closes, Tab stays inside the dialog, the page behind doesn't scroll,
  // and focus goes back where it was on close.
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const nodes = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const counties = isLocations ? countiesOf(items) : [];
  const anyConfirmed = isLocations && items.some((i) => i.services?.length > 0);
  const q = query.trim().toLowerCase();
  const filtered = items.filter((i) => (
    (!q || [i.name, i.address_line_1, i.city, i.zip].filter(Boolean).join(' ').toLowerCase().includes(q))
    && (county === 'all' || i.county === county)
    && (!confirmedOnly || i.services?.length > 0)
  ));

  // Group by county only for locations, with "All" selected, across 2+ counties.
  let groups;
  if (isLocations && county === 'all' && counties.length > 1) {
    const byCounty = new Map();
    filtered.forEach((i) => {
      const key = i.county || null;
      if (!byCounty.has(key)) byCounty.set(key, []);
      byCounty.get(key).push(i);
    });
    groups = [...counties, null]
      .filter((c) => byCounty.has(c))
      .map((c) => ({ label: c ?? t.otherGroup, items: byCounty.get(c) }));
  } else {
    groups = [{ label: null, items: filtered }];
  }

  const clearFilters = () => {
    setQuery('');
    setCounty('all');
    setConfirmedOnly(false);
  };

  const chips = [
    ['all', `${t.all} (${items.length})`],
    ...counties.map((c) => [c, `${c} (${items.filter((i) => i.county === c).length})`]),
  ];

  // Portaled to <body>: the page's fadeIn transform would otherwise trap position: fixed.
  return createPortal(
    <div className="lp-root">
      <div className="lp-scrim" onClick={onClose} />
      <div
        ref={dialogRef}
        className="lp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lp-title"
        tabIndex={-1}
      >
        <div className="lp-head">
          <div className="lp-grab" aria-hidden="true" />
          <div className="lp-titlebar">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div id="lp-title" className="lp-title">{title}</div>
              {subtitle && <div className="lp-sub">{subtitle}</div>}
            </div>
            <button type="button" className="lp-close" onClick={onClose} aria-label={t.close}>
              <X size={20} />
            </button>
          </div>
          <div className="lp-controls">
            <label className="lp-search">
              <Search size={16} color="var(--mb-text-muted)" style={{ flexShrink: 0 }} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isLocations ? t.searchLocs : t.searchPharm}
                aria-label={isLocations ? t.searchLocs : t.searchPharm}
              />
            </label>
            {isLocations && counties.length > 0 && (
              <div className="lp-chips">
                {chips.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="lp-chip"
                    aria-pressed={county === key}
                    onClick={() => setCounty(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {anyConfirmed && (
              <button
                type="button"
                className="lp-check"
                aria-pressed={confirmedOnly}
                onClick={() => setConfirmedOnly((v) => !v)}
              >
                <span className="lp-box">{confirmedOnly && <Check size={13} strokeWidth={3} />}</span>
                {t.confirmedOnly}
              </button>
            )}
          </div>
        </div>

        <div className="lp-list">
          <div className="lp-count">{t.showing(filtered.length, items.length)}</div>
          {filtered.length > 0 && groups.map((group) => (
            <div key={group.label ?? 'all'}>
              {group.label && <div className="lp-group">{group.label} · {group.items.length}</div>}
              {group.items.map((item) => (
                <PlaceRow
                  key={item.site_id || item.pharmacy_id}
                  place={item}
                  callLabel={t.call}
                  to={isLocations ? siteLink(item) : undefined}
                  pills={item.services?.length > 0 && (
                    <div className="loc-pills">
                      <span className="pill pill-sage"><BadgeCheck size={11} /> {t.confirmedServices(item.services.length)}</span>
                    </div>
                  )}
                />
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="lp-empty">
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{t.noMatch}</div>
              <button type="button" className="call-outline" onClick={clearFilters}>{t.clearFilters}</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .lp-root {
          position: fixed; inset: 0; z-index: 1000;
          display: flex; justify-content: flex-end; align-items: stretch;
        }
        .lp-scrim { position: absolute; inset: 0; background: rgba(37, 48, 46, 0.4); }
        .lp-dialog {
          position: relative; width: 440px; max-width: 100%; height: 100%;
          background: var(--mb-bg-primary); display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 18px 44px rgba(15, 110, 86, 0.12); outline: none;
        }
        .lp-head { background: var(--mb-bg-surface); border-bottom: 1px solid var(--mb-border-soft); }
        .lp-grab { display: none; width: 40px; height: 4px; border-radius: 999px; background: #D6CEBD; margin: 8px auto 0; }
        .lp-titlebar { display: flex; align-items: flex-start; gap: 12px; padding: 14px 20px 4px; }
        .lp-title { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.3; color: var(--mb-text-primary); }
        .lp-sub { font-size: 13px; color: var(--mb-text-secondary); line-height: 1.4; }
        .lp-close {
          width: 44px; height: 44px; flex-shrink: 0; margin: -6px -10px 0 0; border: none; background: none;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          color: var(--mb-text-primary); border-radius: 12px;
        }
        .lp-close:hover { background: var(--mb-bg-surface-hover); }
        .lp-controls { padding: 10px 20px 14px; display: flex; flex-direction: column; gap: 10px; }
        .lp-search {
          display: flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px;
          border: 1px solid var(--mb-border); border-radius: 12px; background: var(--mb-bg-primary);
        }
        .lp-search:focus-within { border-color: var(--mb-primary); }
        .lp-search input {
          flex: 1; min-width: 0; border: none; outline: none; background: transparent;
          font: inherit; font-size: 15px; color: var(--mb-text-primary);
        }
        .lp-chips { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
        .lp-chip {
          flex-shrink: 0; display: inline-flex; align-items: center; min-height: 36px; padding: 0 12px;
          border-radius: 999px; border: 1px solid var(--mb-border); background: var(--mb-bg-surface);
          color: var(--mb-text-primary); font: inherit; font-size: 13px; font-weight: 600;
          white-space: nowrap; cursor: pointer;
        }
        .lp-chip[aria-pressed="true"] { background: var(--mb-primary); border-color: var(--mb-primary); color: #fff; }
        .lp-check {
          display: flex; align-items: center; gap: 9px; min-height: 36px; border: none; background: none;
          padding: 0; cursor: pointer; font: inherit; font-size: 13.5px; font-weight: 500;
          color: var(--mb-text-primary); text-align: left;
        }
        .lp-box {
          width: 20px; height: 20px; flex-shrink: 0; border-radius: 6px; border: 1px solid #CFC8B8;
          background: var(--mb-bg-surface); color: #fff; display: flex; align-items: center; justify-content: center;
        }
        .lp-check[aria-pressed="true"] .lp-box { background: var(--mb-primary); border-color: var(--mb-primary); }
        .lp-list { flex: 1; min-height: 0; overflow: auto; padding: 0 20px 24px; }
        .lp-count { font-size: 12.5px; color: var(--mb-text-secondary); padding: 12px 0 2px; }
        .lp-group {
          position: sticky; top: 0; z-index: 2; background: var(--mb-bg-primary);
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
          color: var(--mb-text-secondary); padding: 14px 0 6px; border-bottom: 1px solid var(--mb-border-soft);
        }
        .lp-list .loc { border-bottom-color: var(--mb-border-soft); }
        .lp-list .loc-call { background: var(--mb-bg-surface); }
        .lp-empty { padding: 28px 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        @media (max-width: 768px) {
          .lp-root { align-items: flex-end; }
          .lp-dialog { width: 100%; height: 88%; border-radius: 20px 20px 0 0; }
          .lp-grab { display: block; }
        }
      `}</style>
    </div>,
    document.body,
  );
};

export default ListPanel;
