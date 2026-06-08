'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: 'easeOut' },
}

const workflowSteps = [
  {
    title: 'Team head creates a room',
    copy: 'Start a company workspace for one project, sprint, department, or client delivery.',
    meta: 'Owner access',
  },
  {
    title: 'Members join from mail',
    copy: 'Add teammates using company email. They receive the invite and enter the correct room.',
    meta: 'Verified entry',
  },
  {
    title: 'Work happens in one place',
    copy: 'Channels, tasks, documents, meetings, and notifications stay attached to that room.',
    meta: 'Team execution',
  },
  {
    title: 'AI remembers the project',
    copy: 'The knowledge brain answers questions from project files, transcripts, and team context.',
    meta: 'Org memory',
  },
]

const modules = [
  ['Channel Chats', 'Room-based conversations with mentions and thread replies for focused collaboration.'],
  ['Kanban Projects', 'Create projects, assign tasks, and move work through To Do, In Progress, and Done.'],
  ['Document Vault', 'Upload files, keep version history, and make project knowledge searchable.'],
  ['Meeting Intelligence', 'Schedule meetings, store transcripts, and generate action-oriented summaries.'],
  ['AI Knowledge Brain', 'Ask questions across the room and receive context-aware answers.'],
  ['Notifications', 'Keep members aware when they are mentioned or need to respond.'],
]

const permissions = [
  ['Team Head', 'Creates rooms, invites members, opens channels, uploads documents, schedules meetings, and reviews AI reports.'],
  ['Team Member', 'Joins assigned rooms, chats with teammates, views files, updates assigned work, and receives notifications.'],
]

export default function LandingSections() {
  return (
    <>
      <section className="landing-band" id="about">
        <motion.div className="section-heading" {...reveal}>
          <span>What SynapseIQ is</span>
          <h2>A project room that behaves like your team&apos;s shared brain.</h2>
        </motion.div>

        <div className="about-grid">
          <motion.div className="about-copy" {...reveal}>
            <p>
              SynapseIQ is built for company teams that need a controlled place
              to finish real work. The team head creates a workspace, invites
              members through company email, and gives everyone a single room
              where planning, communication, files, meetings, and AI answers
              stay connected.
            </p>
            <p>
              It is not only a task board or chat app. It is a project operating
              layer where the AI can understand the room&apos;s history and help the
              team find decisions, summaries, owners, and blockers.
            </p>
          </motion.div>

          <motion.div className="workspace-snapshot" {...reveal} transition={{ duration: 0.7, delay: 0.1 }}>
            <div className="snapshot-top">
              <span>SYNAPSEIQ / Workspace</span>
              <strong>Product Launch Room</strong>
            </div>
            <div className="snapshot-layout">
              <div className="snapshot-sidebar">
                <span className="active" />
                <span />
                <span />
                <span />
              </div>
              <div className="snapshot-main">
                <div className="snapshot-row">
                  <span>Members</span>
                  <strong>12</strong>
                </div>
                <div className="snapshot-row">
                  <span>Open Tasks</span>
                  <strong>38</strong>
                </div>
                <div className="snapshot-kanban">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="landing-band alternate" id="workflow">
        <motion.div className="section-heading" {...reveal}>
          <span>How users move through it</span>
          <h2>From invite to execution in four clear steps.</h2>
        </motion.div>

        <div className="workflow-grid">
          {workflowSteps.map((step, index) => (
            <motion.article
              className="workflow-card"
              key={step.title}
              {...reveal}
              transition={{ duration: 0.65, delay: index * 0.08 }}
            >
              <div className="workflow-index">{String(index + 1).padStart(2, '0')}</div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
              <span>{step.meta}</span>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="landing-band" id="modules">
        <motion.div className="section-heading" {...reveal}>
          <span>Major working parts</span>
          <h2>The room keeps every project signal connected.</h2>
        </motion.div>

        <div className="module-grid">
          {modules.map(([title, copy], index) => (
            <motion.article
              className="module-card"
              key={title}
              {...reveal}
              transition={{ duration: 0.65, delay: index * 0.05 }}
            >
              <div className="module-glyph" aria-hidden="true">{title.slice(0, 2)}</div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="landing-band alternate">
        <div className="permissions-layout">
          <motion.div className="section-heading compact" {...reveal}>
            <span>Role-aware product</span>
            <h2>Heads control the room. Members stay focused.</h2>
          </motion.div>

          <div className="permissions-grid">
            {permissions.map(([title, copy], index) => (
              <motion.article
                className="permission-panel"
                key={title}
                {...reveal}
                transition={{ duration: 0.65, delay: index * 0.08 }}
              >
                <h3>{title}</h3>
                <p>{copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <strong>SYNAPSEIQ</strong>
          <p>Unified rooms for company projects, team coordination, and AI workspace memory.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/#about">About</Link>
          <Link href="/#workflow">Workflow</Link>
          <Link href="/login">Log In</Link>
          <Link href="/signup">Sign Up</Link>
        </nav>
      </footer>
    </>
  )
}
