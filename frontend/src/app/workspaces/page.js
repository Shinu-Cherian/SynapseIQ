'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api'

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [memberId, setMemberId] = useState('')
  const [workspacePassword, setWorkspacePassword] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinMessage, setJoinMessage] = useState('')
  const [pendingRequests, setPendingRequests] = useState([])
  const router = useRouter()

  const fetchWorkspaces = useCallback(async () => {
    try {
      const [list, requests] = await Promise.all([
        api.workspaces.list(),
        api.workspaces.myAccessRequests()
      ])
      setWorkspaces(list)
      setPendingRequests(requests)
    } catch (err) {
      setError('Could not load workspaces. Please log in again.')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (pendingRequests.length === 0) return

    const poll = window.setInterval(async () => {
      try {
        const [list, requests] = await Promise.all([
          api.workspaces.list(),
          api.workspaces.myAccessRequests()
        ])
        setWorkspaces(list)
        setPendingRequests(requests)

        const approved = pendingRequests.find(request =>
          list.some(workspace => workspace.id === request.workspace_id) &&
          !requests.some(current => current.id === request.id)
        )
        if (approved) router.push(`/workspaces/${approved.workspace_id}`)
      } catch (err) {
        console.error('Could not refresh workspace approval status', err)
      }
    }, 3000)

    return () => window.clearInterval(poll)
  }, [pendingRequests, router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const handleCreate = async (event) => {
    event.preventDefault()
    setError(null)
    setCreateLoading(true)

    try {
      const created = await api.workspaces.create(newId, newName)
      setWorkspaces([...workspaces, created])
      setNewId('')
      setNewName('')
    } catch (err) {
      setError(err.message || 'Failed to create workspace.')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    router.push('/login')
  }

  const handleJoin = async (event) => {
    event.preventDefault()
    setError(null)
    setJoinMessage('')
    setJoinLoading(true)
    try {
      const result = await api.workspaces.requestAccess(memberId.trim().toUpperCase(), workspacePassword)
      if (result.status === 'Active') {
        router.push(`/workspaces/${result.workspace_id}`)
        return
      }
      setJoinMessage(result.message || 'Waiting for Team Head approval.')
      setWorkspacePassword('')
      const requests = await api.workspaces.myAccessRequests()
      setPendingRequests(requests)
    } catch (err) {
      setJoinMessage(err.message || 'Could not submit the workspace access request.')
    } finally {
      setJoinLoading(false)
    }
  }

  return (
    <main className="workspace-page">
      <div className="w-full max-w-[1200px] mx-auto pb-4">
        <header className="site-header">
          <Link className="brand-mark" href="/">
            <span className="brand-icon" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>SYNAPSEIQ</span>
          </Link>

          <div className="site-nav" aria-hidden="true"></div>

          <div className="nav-actions" style={{ justifySelf: 'end' }}>
            <button onClick={handleLogout} className="nav-button">
              Log Out
            </button>
          </div>
        </header>

        <div className="frame-rule" aria-hidden="true">
          <span />
          <span />
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-8 pt-8 pb-6">
        <h1 className="text-4xl font-space font-bold uppercase tracking-tight mb-2">Project Rooms</h1>
        <p className="text-sm font-medium">Create a workspace room or enter one your team already uses.</p>
      </div>

      {error && <div className="workspace-error">{error}</div>}

      <section className="workspace-list-layout">
        <div className="workspace-panel">
          <h2>Your Active Rooms</h2>
          <p>Open a room to manage chat, projects, documents, meetings, and AI memory.</p>

          {loading ? (
            <p className="workspace-loading">Loading workspaces...</p>
          ) : workspaces.length === 0 ? (
            <p className="workspace-empty">No rooms yet. Create the first one on the right.</p>
          ) : (
            <div className="workspace-list">
              {workspaces.map((workspace) => (
                <Link
                  key={workspace.id}
                  href={`/workspaces/${workspace.id}`}
                  className="workspace-card"
                >
                  <h3>{workspace.name}</h3>
                  <span>ID: {workspace.id}</span>
                </Link>
              ))}
            </div>
          )}

          {pendingRequests.length > 0 && (
            <div className="pending-room-list">
              <h3>Waiting for Approval</h3>
              {pendingRequests.map(request => (
                <div key={request.id} className="pending-room-card">
                  <strong>{request.workspace_name}</strong>
                  <span>{request.member_id} · Team Head approval pending</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="workspace-actions-grid">
          <div className="workspace-panel">
            <h2>Create New Room</h2>
            <p>Start a new company workspace as its Team Head.</p>

            <form onSubmit={handleCreate} className="workspace-form">
              <div className="form-field">
                <label htmlFor="workspace-id">Workspace Slug ID</label>
                <input
                  id="workspace-id"
                  type="text"
                  required
                  placeholder="TECHNOVA-001"
                  value={newId}
                  onChange={(event) => setNewId(event.target.value.replace(/\s/g, ''))}
                />
                <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>Spaces are not allowed. Use hyphens instead.</span>
              </div>

              <div className="form-field">
                <label htmlFor="workspace-name">Workspace Name</label>
                <input
                  id="workspace-name"
                  type="text"
                  required
                  placeholder="TechNova Engineering"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                />
              </div>

              <button type="submit" disabled={createLoading} className="workspace-button">
                {createLoading ? 'Creating Room...' : 'Create Room'}
              </button>
            </form>
          </div>

          <div className="workspace-panel">
            <h2>Join Existing Room</h2>
            <p>Use the Member ID and workspace password issued by your Team Head.</p>

            {joinMessage && <div className="workspace-notice" role="status">{joinMessage}</div>}

            <form onSubmit={handleJoin} className="workspace-form">
              <div className="form-field">
                <label htmlFor="member-id">Member ID</label>
                <input
                  id="member-id"
                  type="text"
                  required
                  placeholder="SIQ-AB12CD34"
                  value={memberId}
                  onChange={(event) => setMemberId(event.target.value.toUpperCase().replace(/\s/g, ''))}
                  autoComplete="off"
                />
              </div>

              <div className="form-field">
                <label htmlFor="workspace-password">Workspace Password</label>
                <input
                  id="workspace-password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Enter Team Head password"
                  value={workspacePassword}
                  onChange={(event) => setWorkspacePassword(event.target.value)}
                  autoComplete="off"
                />
              </div>

              <button type="submit" disabled={joinLoading} className="workspace-button">
                {joinLoading ? 'Sending Request...' : 'Request to Join'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}
