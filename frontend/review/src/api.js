async function request(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body.detail) message = body.detail
    } catch (_) {}
    throw new Error(message)
  }
  return res.json()
}

export const fetchCounts = () =>
  request('/review/counts')

export const fetchQueue = (status, page, pageSize) =>
  request(`/review/queue?status=${status}&page=${page}&page_size=${pageSize}`)

export const acceptCandidate = (id) =>
  request(`/review/${id}/accept`, { method: 'POST' })

export const rejectCandidate = (id) =>
  request(`/review/${id}/reject`, { method: 'POST' })
