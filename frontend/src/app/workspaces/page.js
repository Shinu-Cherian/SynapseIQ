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
  const router = useRouter()

  const fetchWorkspaces = useCallback(async () => {
    try {
      const list = await api.workspaces.list()
      setWorkspaces(list)
    } catch (err) {
      setError('Could not load workspaces. Please log in again.')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

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

      <section className="workspace-grid">
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
                <button
                  key={workspace.id}
                  onClick={() => router.push(`/workspaces/${workspace.id}`)}
                  className="workspace-card"
                >
                  <h3>{workspace.name}</h3>
                  <span>ID: {workspace.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="workspace-panel">
          <h2>Create New Room</h2>
          <p>Use a short slug for the project room and a readable team name.</p>

          <form onSubmit={handleCreate} className="workspace-form">
            <div className="form-field">
              <label htmlFor="workspace-id">Workspace Slug ID</label>
              <input
                id="workspace-id"
                type="text"
                required
                placeholder="TECHNOVA-001"
                value={newId}
                onChange={(event) => setNewId(event.target.value)}
              />
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
      </section>
    </main>
  )
}
