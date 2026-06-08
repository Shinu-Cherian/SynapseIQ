'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'

export default function Navbar() {
  const isLoggedIn = useSyncExternalStore(
    (notify) => {
      window.addEventListener('storage', notify)
      return () => window.removeEventListener('storage', notify)
    },
    () => !!localStorage.getItem('access_token'),
    () => false
  )

  return (
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

      <nav className="site-nav" aria-label="Primary navigation">
        <Link href="/#about">About</Link>
        <Link href="/#workflow">Workflow</Link>
        <Link href="/#modules">Modules</Link>
      </nav>

      <div className="nav-actions">
        {isLoggedIn ? (
          <Link href="/workspaces" className="nav-button">
            Workspaces
          </Link>
        ) : (
          <>
            <Link href="/login">Log In</Link>
            <Link href="/signup" className="nav-button">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
