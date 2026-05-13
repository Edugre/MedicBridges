export default function QueueView({
  activeTab,
  onTabChange,
  counts,
  candidates,
  total,
  page,
  pageSize,
  loading,
  onSelect,
  onPageChange,
}) {
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'requires_review' ? 'active' : ''}`}
          onClick={() => onTabChange('requires_review')}
        >
          Conflicts
          <span className="badge">{counts.requires_review}</span>
        </button>
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => onTabChange('pending')}
        >
          Pending
          <span className="badge">{counts.pending}</span>
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : candidates.length === 0 ? (
        <div className="empty">No candidates to review in this queue.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Site Name</th>
                  <th>HRSA Address</th>
                  <th>Score</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} onClick={() => onSelect(c)}>
                    <td>{c.site_name}</td>
                    <td>{[c.address, c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                    <td>{(c.match_score * 100).toFixed(1)}%</td>
                    <td>
                      <span className="tier-badge">T{c.match_tier}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span>
                {total} candidates — page {page} of {totalPages}
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn-page"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  ← Prev
                </button>
                <button
                  className="btn-page"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
