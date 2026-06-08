'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import Link from 'next/link'
import ProductBrainScene from './ProductBrainScene'

const modules = ['Room Setup', 'Invite Mail', 'Project Board', 'Team Chat', 'Doc Memory', 'AI Reports']

export default function HeroSection() {
  const ribbonRef = useRef(null)

  useEffect(() => {
    if (!ribbonRef.current) return

    gsap.fromTo(
      ribbonRef.current.children,
      { y: 10 },
      { y: 0, duration: 0.7, stagger: 0.04, ease: 'power3.out' }
    )
  }, [])

  return (
    <section className="hero-shell" id="home">
      <div className="hero-grid">
        <div className="hero-copy">
          <motion.div
            className="eyebrow-line"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span>Company team rooms</span>
            <span>AI workspace memory</span>
          </motion.div>

          <h1 className="hero-title" aria-label="SynapseIQ collaborative intelligence for modern teams">
            <span>SYNAPSE</span>
            <span>IQ</span>
            <span className="muted-title">COLLABORATIVE</span>
            <span>INTELLIGENCE</span>
          </h1>

          <motion.p className="hero-lede" whileInView={{ y: [8, 0] }} transition={{ duration: 0.55 }}>
            A focused workspace where a team head creates a secure project room,
            invites members by company email, assigns work, tracks progress, and
            lets the AI brain remember chats, documents, meetings, and decisions.
          </motion.p>

          <motion.div className="hero-actions" whileInView={{ y: [8, 0] }} transition={{ duration: 0.55 }}>
            <Link href="/signup" className="primary-action">
              Create Team Room
              <span aria-hidden="true">-&gt;</span>
            </Link>
            <a href="#workflow" className="secondary-action">
              See Workflow
            </a>
          </motion.div>
        </div>

        <motion.div className="hero-visual" whileInView={{ scale: [0.98, 1] }} transition={{ duration: 0.7 }}>
          <ProductBrainScene />
          <div className="visual-readout visual-readout-a">
            <span>Owner control</span>
            <strong>Invite, assign, review</strong>
          </div>
          <div className="visual-readout visual-readout-b">
            <span>Member mode</span>
            <strong>Work inside limits</strong>
          </div>
        </motion.div>
      </div>

      <div ref={ribbonRef} className="feature-ribbon" aria-label="SynapseIQ modules">
        {modules.map((module) => (
          <span key={module}>{module}</span>
        ))}
      </div>
    </section>
  )
}
