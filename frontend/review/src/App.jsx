import { useState, useEffect, useCallback } from 'react'
import QueueView from './QueueView.jsx'
import DetailView from './DetailView.jsx'
import { fetchCounts, fetchQueue, acceptCandidate, rejectCandidate } from './api.js'
import './styles.css'

const PAGE_SIZE = 20

export default function App() {
  const [view, setView] = useState('queue')
  const [activeTab, setActiveTab] = useState('requires_review')
  const [candidates, setCandidates] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [counts, setCounts] = useState({ requires_review: 0, pending: 0 })
  const [loading, setLoading] = useState(false)

  const loadCounts = useCallback(async () => {
    try {
      const data = await fetchCounts()
      setCounts(data)
    } catch (e) {
      console.error('Failed to fetch counts', e)
    }
  }, [])

  const loadQueue = useCallback(async (status, pg) => {
    setLoading(true)
    try {
      const data = await fetchQueue(status, pg, PAGE_SIZE)
      setCandidates(data.items)
      setTotal(data.total_count)
    } catch (e) {
      console.error('Failed to fetch queue', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCounts()
  }, [loadCounts])

  useEffect(() => {
    loadQueue(activeTab, page)
  }, [activeTab, page, loadQueue])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  const handleSelect = (candidate) => {
    setSelected(candidate)
    setView('detail')
  }

  const handleBack = () => {
    setView('queue')
    setSelected(null)
  }

  const handleAccept = async (id) => {
    await acceptCandidate(id)
    await loadCounts()
    await loadQueue(activeTab, page)
    setView('queue')
    setSelected(null)
  }

  const handleReject = async (id) => {
    await rejectCandidate(id)
    await loadCounts()
    await loadQueue(activeTab, page)
    setView('queue')
    setSelected(null)
  }

  if (view === 'detail' && selected) {
    return (
      <div className="app">
        <DetailView
          candidate={selected}
          onBack={handleBack}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="header">
        <h1>NPI Match Review</h1>
        <p>Review and resolve NPI match conflicts and low-confidence candidates.</p>
      </div>
      <QueueView
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={counts}
        candidates={candidates}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        onSelect={handleSelect}
        onPageChange={setPage}
      />
    </div>
  )
}
