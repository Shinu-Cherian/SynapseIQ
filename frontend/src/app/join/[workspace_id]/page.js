'use client'

import Link from 'next/link'
import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../api'

export default function JoinWorkspacePage({ params }) {
  const unwrappedParams = use(params)
  // Decode the URL-safe base64 string back into the actual workspace ID
  let base64 = unwrappedParams.workspace_id.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const workspace_id = atob(base64);

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // The join endpoint creates the user if they don't exist and joins them
      await api.workspaces.join(workspace_id, email, fullName, password)
      
      // Auto-login after successful join
      try {
        const data = await api.auth.login(email, password)
        localStorage.setItem('access_token', data.access_token)
        router.push(`/workspaces/${workspace_id}`)
      } catch (loginErr) {
        // If auto-login fails, redirect to login page
        router.push('/login')
      }
    } catch (err) {
      setError(err.message || 'Failed to join workspace. Ensure your email was invited.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-story">
          <Link className="brand-mark" href="/">
            <span className="brand-icon" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>SYNAPSEIQ</span>
          </Link>

          <div>
            <h1>You have been invited.</h1>
            <p>
              Join the <strong>{workspace_id}</strong> project room.
              Enter your pre-authorized company email address to gain access to the workspace.
            </p>
          </div>

          <div className="auth-metrics" aria-label="Workspace capabilities">
            <span>Rooms</span>
            <span>Tasks</span>
            <span>AI Memory</span>
          </div>
        </div>

        <div className="auth-card">
          <h2>Join Workspace</h2>
          <p>Register or log in to accept the invite.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label htmlFor="email">Company Email</label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                required
                placeholder="John Doe"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                placeholder="Create or enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Joining...' : 'Join Workspace'}
            </button>
          </form>

          <p className="auth-link">
            Already a member? <Link href="/login">Log in here</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
