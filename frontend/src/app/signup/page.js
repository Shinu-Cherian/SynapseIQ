'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../api'

export default function SignupPage() {
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
      await api.auth.signup(email, fullName, password)
      router.push('/login')
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
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
            <h1>Create the first identity for your workspace flow.</h1>
            <p>
              Sign up, create a room, and start inviting company teammates by
              email. Team heads get creation controls while members enter a
              focused workspace with the right limits.
            </p>
          </div>

          <div className="auth-metrics" aria-label="Signup journey">
            <span>Create</span>
            <span>Invite</span>
            <span>Coordinate</span>
          </div>
        </div>

        <div className="auth-card">
          <h2>Create Account</h2>
          <p>Start your SynapseIQ access.</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label htmlFor="full-name">Full Name</label>
              <input
                id="full-name"
                type="text"
                required
                placeholder="Your name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>

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
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                placeholder="Create password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button type="submit" disabled={loading} className="auth-button">
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <p className="auth-link">
            Already registered? <Link href="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
