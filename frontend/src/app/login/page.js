'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await api.auth.login(email, password)
      localStorage.setItem('access_token', data.access_token)
      router.push('/workspaces')
    } catch (err) {
      setError(err.message || 'Login failed. Invalid email or password.')
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
            <h1>Return to the room where your team works.</h1>
            <p>
              Log in to access your company project rooms, update tasks, read
              channels, review documents, and ask the AI brain what the team
              already knows.
            </p>
          </div>

          <div className="auth-metrics" aria-label="Workspace capabilities">
            <span>Rooms</span>
            <span>Tasks</span>
            <span>AI Memory</span>
          </div>
        </div>

        <div className="auth-card">
          <h2>Welcome Back</h2>
          <p>Enter your workspace credentials.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label htmlFor="email">Email Address</label>
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
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Logging In...' : 'Log In'}
            </button>
          </form>

          <p className="auth-link">
            Need an account? <Link href="/signup">Create one</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
