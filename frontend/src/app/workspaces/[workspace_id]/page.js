'use client'

/* eslint-disable react-hooks/exhaustive-deps */

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../api'

export default function WorkspaceHubPage() {
  const { workspace_id } = useParams()
  const router = useRouter()
  
  // Tab states: 'dashboard', 'chat', 'projects', 'documents', 'meetings', 'ai', 'notifications'
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])
  const [bellCount, setBellCount] = useState(0)

  // Sub-module data states
  // 1. Dashboard State
  const [dashboardStats, setDashboardStats] = useState(null)
  const [dashboardAiReport, setDashboardAiReport] = useState('')
  const [loadingStats, setLoadingStats] = useState(false)

  // 2. Chat State
  const [channels, setChannels] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [threadParent, setThreadParent] = useState(null)
  const [threadReplies, setThreadReplies] = useState([])
  const [threadInput, setThreadInput] = useState('')
  const [newChanName, setNewChanName] = useState('')
  const [newChanDesc, setNewChanDesc] = useState('')
  const socketRef = useRef(null)

  // 3. Projects State
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [newProjName, setNewProjName] = useState('')
  const [newProjDesc, setNewProjDesc] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [workspaceMembers, setWorkspaceMembers] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  // 4. Documents State
  const [documents, setDocuments] = useState([])
  const [docFile, setDocFile] = useState(null)
  const [docTitle, setDocTitle] = useState('')
  const [docCategory, setDocCategory] = useState('General')
  const [selectedDocVersions, setSelectedDocVersions] = useState([])
  const [selectedDocTitle, setSelectedDocTitle] = useState('')

  // 5. Meetings State
  const [meetings, setMeetings] = useState([])
  const [newMeetTitle, setNewMeetTitle] = useState('')
  const [newMeetDesc, setNewMeetDesc] = useState('')
  const [newMeetDate, setNewMeetDate] = useState('')
  const [newMeetDuration, setNewMeetDuration] = useState('30')
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [transcriptText, setTranscriptText] = useState('')
  const [meetSummary, setMeetSummary] = useState(null)
  const [summarizeLoading, setSummarizeLoading] = useState(false)

  // 6. AI Brain State
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiQueryLoading, setAiQueryLoading] = useState(false)

  // Load User, Workspace memberships and Notifications on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    initWorkspace()
  }, [workspace_id])

  const initWorkspace = async () => {
    try {
      // 1. Fetch current user
      const user = await api.auth.me()
      setCurrentUser(user)
      
      // 2. Fetch notifications count
      fetchNotifications()
      
      // 3. Fetch workspace members for assignees lists
      const members = await api.workspaces.members(workspace_id)
      setWorkspaceMembers(members)
      
      // Load initial tab data
      loadDashboardTab()
    } catch (err) {
      console.error(err)
      router.push('/workspaces')
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      const list = await api.notifications.list(workspace_id)
      setNotifications(list)
      const unread = list.filter(n => !n.is_read).length
      setBellCount(unread)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      await api.notifications.readAll(workspace_id)
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  const markSingleNotificationRead = async (id) => {
    try {
      await api.notifications.read(workspace_id, id)
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  // --- TAB LOADER ACTIONS ---
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'dashboard') loadDashboardTab()
    if (tab === 'chat') loadChatTab()
    if (tab === 'projects') loadProjectsTab()
    if (tab === 'documents') loadDocumentsTab()
    if (tab === 'meetings') loadMeetingsTab()
    if (tab === 'notifications') fetchNotifications()
  }

  // 1. Dashboard Loading
  const loadDashboardTab = async () => {
    setLoadingStats(true)
    try {
      const stats = await api.dashboard.workload(workspace_id)
      setDashboardStats(stats)
    } catch (err) {
      console.error('Error loading dashboard statistics:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  const triggerDashboardAiReport = async () => {
    setDashboardAiReport('Analyzing sprint statistics and generating AI recommendation report...')
    try {
      const report = await api.dashboard.aiReport(workspace_id)
      setDashboardAiReport(report.weekly_ai_report)
    } catch (err) {
      setDashboardAiReport('Failed to generate AI report: ' + err.message)
    }
  }

  // 2. Chat Loading & WebSocket
  const loadChatTab = async () => {
    try {
      const chanList = await api.chat.channels(workspace_id)
      setChannels(chanList)
      if (chanList.length > 0 && !selectedChannel) {
        handleSelectChannel(chanList[0])
      }
    } catch (err) {
      console.error('Error loading channels:', err)
    }
  }

  const handleSelectChannel = async (channel) => {
    setSelectedChannel(channel)
    setThreadParent(null)
    
    // Close existing WebSocket if open
    if (socketRef.current) {
      socketRef.current.close()
    }
    
    // Fetch message history
    try {
      const msgHistory = await api.chat.messages(workspace_id, channel.id)
      setMessages(msgHistory)
    } catch (err) {
      console.error(err)
    }
    
    // Connect WebSocket
    const token = localStorage.getItem('access_token')
    const wsUrl = api.chat.getWsUrl(workspace_id, channel.id, token)
    
    const socket = new WebSocket(wsUrl)
    socket.onmessage = (event) => {
      const newMsg = JSON.parse(event.data)
      // Check if message belongs to active thread or main feed
      if (newMsg.parent_id) {
        if (threadParent && threadParent.id === newMsg.parent_id) {
          setThreadReplies(prev => [...prev, newMsg])
        }
      } else {
        setMessages(prev => [...prev, newMsg])
      }
      
      // Auto-reload notifications feed if current user might have been tagged
      fetchNotifications()
    }
    socketRef.current = socket
  }

  const handleSendChat = () => {
    if (!chatInput.trim() || !socketRef.current) return
    const payload = {
      content: chatInput,
      parent_id: null
    }
    socketRef.current.send(JSON.stringify(payload))
    setChatInput('')
  }

  const handleSendReply = () => {
    if (!threadInput.trim() || !socketRef.current || !threadParent) return
    const payload = {
      content: threadInput,
      parent_id: threadParent.id
    }
    socketRef.current.send(JSON.stringify(payload))
    setThreadInput('')
  }

  const handleCreateChannel = async (e) => {
    e.preventDefault()
    if (!newChanName) return
    try {
      const chan = await api.chat.createChannel(workspace_id, newChanName, newChanDesc)
      setChannels([...channels, chan])
      setNewChanName('')
      setNewChanDesc('')
      handleSelectChannel(chan)
      alert('Channel created!')
    } catch (err) {
      alert(err.message)
    }
  }

  const openThread = async (msg) => {
    setThreadParent(msg)
    try {
      const threadData = await api.chat.thread(workspace_id, selectedChannel.id, msg.id)
      setThreadReplies(threadData.replies)
    } catch (err) {
      console.error(err)
    }
  }

  // 3. Projects Loading
  const loadProjectsTab = async () => {
    try {
      const list = await api.projects.list(workspace_id)
      setProjects(list)
      if (list.length > 0 && !selectedProject) {
        handleSelectProject(list[0])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSelectProject = async (project) => {
    setSelectedProject(project)
    try {
      const taskList = await api.projects.tasks(workspace_id, project.id)
      setTasks(taskList)
    } catch (err) {
      console.error(err)
    }
  }

  const handleInviteMember = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setInviteMessage('')

    try {
      await api.workspaces.invite(workspace_id, inviteEmail.trim(), inviteRole)
      setInviteMessage(`Invite sent to ${inviteEmail.trim()}`)
      setInviteEmail('')
      const members = await api.workspaces.members(workspace_id)
      setWorkspaceMembers(members)
    } catch (err) {
      setInviteMessage(err.message || 'Could not send invite.')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProjName) return
    try {
      const created = await api.projects.create(workspace_id, newProjName, newProjDesc)
      setProjects([...projects, created])
      setNewProjName('')
      setNewProjDesc('')
      handleSelectProject(created)
      alert('Project created!')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!newTaskTitle || !selectedProject) return
    const assignee = newTaskAssignee ? parseInt(newTaskAssignee) : null
    try {
      const created = await api.projects.createTask(workspace_id, selectedProject.id, newTaskTitle, newTaskDesc, 'To Do', assignee)
      setTasks([...tasks, created])
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskAssignee('')
      alert('Task added!')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await api.projects.updateTaskStatus(workspace_id, taskId, newStatus)
      // Update local task state
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    } catch (err) {
      alert(err.message)
    }
  }

  // 4. Documents Loading
  const loadDocumentsTab = async () => {
    try {
      const docList = await api.documents.list(workspace_id)
      setDocuments(docList)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDocUpload = async (e) => {
    e.preventDefault()
    if (!docFile || !docTitle) return
    try {
      const uploaded = await api.documents.upload(workspace_id, docFile, docTitle, docCategory)
      setDocuments([uploaded, ...documents])
      setDocFile(null)
      setDocTitle('')
      alert('Document uploaded successfully!')
    } catch (err) {
      alert(err.message)
    }
  }

  const viewDocVersions = async (doc) => {
    setSelectedDocTitle(doc.title)
    try {
      const versions = await api.documents.versions(workspace_id, doc.id)
      setSelectedDocVersions(versions)
    } catch (err) {
      console.error(err)
    }
  }

  // 5. Meetings Loading
  const loadMeetingsTab = async () => {
    try {
      const list = await api.meetings.list(workspace_id)
      setMeetings(list)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateMeeting = async (e) => {
    e.preventDefault()
    if (!newMeetTitle || !newMeetDate) return
    try {
      const dateIso = new Date(newMeetDate).toISOString()
      const created = await api.meetings.create(workspace_id, newMeetTitle, newMeetDesc, dateIso, newMeetDuration)
      setMeetings([created, ...meetings])
      setNewMeetTitle('')
      setNewMeetDesc('')
      setNewMeetDate('')
      alert('Meeting scheduled!')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUploadTranscript = async (e) => {
    e.preventDefault()
    if (!transcriptText || !selectedMeeting) return
    try {
      await api.meetings.uploadTranscript(workspace_id, selectedMeeting.id, transcriptText)
      alert('Transcript saved successfully!')
      setTranscriptText('')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleTriggerSummary = async (meeting) => {
    setSelectedMeeting(meeting)
    setSummarizeLoading(true)
    setMeetSummary(null)
    try {
      const summary = await api.meetings.summarize(workspace_id, meeting.id)
      setMeetSummary(summary)
    } catch (err) {
      alert('Could not generate summary: ' + err.message)
    } finally {
      setSummarizeLoading(false)
    }
  }

  // 6. AI Querying
  const handleAiQuery = async (e) => {
    e.preventDefault()
    if (!aiQuestion.trim()) return
    setAiQueryLoading(true)
    setAiAnswer('')
    try {
      const res = await api.ai.query(workspace_id, aiQuestion)
      setAiAnswer(res.answer)
    } catch (err) {
      setAiAnswer('Error querying AI Brain: ' + err.message)
    } finally {
      setAiQueryLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[#1a1a1a] flex items-center justify-center font-space">
        <p className="text-sm tracking-wider uppercase font-bold">Loading Workspace Shell...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col font-inter text-[#1a1a1a]">
      {/* Top Header Bar */}
      <header className="h-[72px] px-8 bg-[var(--paper)] border-b-2 border-black flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <span className="font-space text-xl font-bold tracking-tight cursor-pointer flex items-center gap-2" onClick={() => router.push('/workspaces')}>
            <span className="grid grid-cols-2 gap-[2px]">
              <span className="w-2.5 h-2.5 bg-black"></span><span className="w-2.5 h-2.5 bg-black"></span>
              <span className="w-2.5 h-2.5 bg-black"></span><span className="w-2.5 h-2.5 bg-black"></span>
            </span>
            SYNAPSEIQ
          </span>
          <span className="text-sm font-semibold border-l-2 border-black pl-4">Workspace: {workspace_id}</span>
        </div>

        <div className="flex items-center gap-8">
          {/* Notifications Indicator */}
          <div className="relative cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => handleTabChange('notifications')}>
            <span className="text-xl">🔔</span>
            {bellCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center border border-black shadow-[2px_2px_0_#1a1a1a]">
                {bellCount}
              </span>
            )}
          </div>

          <div className="text-right border-l-2 border-black pl-6">
            <div className="text-sm font-bold">{currentUser?.full_name}</div>
            <div className="text-xs opacity-70">{currentUser?.email}</div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-grow h-[calc(100vh-72px)] overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-72 bg-[var(--paper)] border-r-2 border-black p-6 flex flex-col justify-between z-10 shadow-[4px_0px_0_rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-space tracking-widest uppercase mb-2 font-bold border-b-2 border-black pb-2">Modules</h3>
            
            {[
              { id: 'dashboard', icon: '📊', label: 'Dashboard Analytics' },
              { id: 'chat', icon: '💬', label: 'Channel Chats' },
              { id: 'projects', icon: '📋', label: 'Projects & Kanban' },
              { id: 'documents', icon: '📂', label: 'Document Storage' },
              { id: 'meetings', icon: '📅', label: 'Intelligent Meetings' },
              { id: 'ai', icon: '🧠', label: 'AI Knowledge Brain' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full py-3 px-4 text-sm font-bold text-left transition-all border-2 border-black ${activeTab === tab.id ? 'bg-black text-white shadow-[4px_4px_0_var(--gold)] translate-x-1' : 'bg-white text-black shadow-[4px_4px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[4px_6px_0_#1a1a1a]'}`}
              >
                {tab.icon} <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push('/workspaces')}
            className="w-full py-3 mt-8 border-2 border-black bg-[var(--paper-lift)] text-sm text-black font-bold shadow-[4px_4px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[4px_6px_0_#1a1a1a] transition-all"
          >
            &larr; Switch Workspace
          </button>
        </aside>

        {/* Tab Content Window */}
        <main className="flex-grow p-10 overflow-y-auto bg-[var(--paper)]">
          
          {/* --- TAB A: DASHBOARD ANALYTICS --- */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-10 max-w-6xl">
              <h2 className="text-4xl font-space font-bold border-b-4 border-black pb-4">Workspace Overview</h2>
              {loadingStats ? (
                <p className="text-sm font-bold uppercase tracking-wider">Fetching statistics...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-6 bg-white border-2 border-black shadow-[6px_6px_0_#1a1a1a]">
                    <div className="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Total Members</div>
                    <div className="text-5xl font-black font-space">{workspaceMembers.length}</div>
                  </div>
                  <div className="p-6 bg-white border-2 border-black shadow-[6px_6px_0_#1a1a1a]">
                    <div className="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Total Tasks</div>
                    <div className="text-5xl font-black font-space">{dashboardStats?.total_tasks || 0}</div>
                  </div>
                  <div className="p-6 bg-[#e8e8e2] border-2 border-black shadow-[6px_6px_0_#1a1a1a]">
                    <div className="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Completed Ratio</div>
                    <div className="text-5xl font-black font-space text-[var(--green)]">
                      {dashboardStats?.completed_tasks || 0} / {dashboardStats?.total_tasks || 0}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-8 bg-white border-2 border-black shadow-[8px_8px_0_#1a1a1a]">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                  <div className="max-w-md">
                    <h3 className="font-bold text-2xl font-space mb-2">Invite Team Members</h3>
                    <p className="text-sm font-medium">
                      Add a company email, choose the workspace role, and send the room invite.
                    </p>
                  </div>

                  <form onSubmit={handleInviteMember} className="flex flex-col md:flex-row gap-4 md:items-end w-full lg:w-auto">
                    <div className="flex flex-col gap-2 flex-grow">
                      <label className="text-xs font-bold uppercase tracking-wider">Company Email</label>
                      <input
                        type="email"
                        required
                        placeholder="teammate@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-[var(--paper)] border-2 border-black text-sm font-medium focus:outline-none focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="px-4 py-3 bg-[var(--paper)] border-2 border-black text-sm font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="Member">Member</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-6 py-3 bg-[var(--gold)] border-2 border-black text-black font-bold text-sm uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all whitespace-nowrap"
                    >
                      {inviteLoading ? 'Sending...' : 'Send Invite'}
                    </button>
                  </form>
                </div>

                {inviteMessage && (
                  <p className="text-sm font-bold mt-6 bg-[var(--paper-lift)] border-2 border-black p-3 inline-block">{inviteMessage}</p>
                )}
              </div>

              {/* AI Report Section */}
              <div className="p-8 bg-[var(--paper-lift)] border-2 border-black shadow-[8px_8px_0_#1a1a1a]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                  <div>
                    <h3 className="font-bold text-2xl font-space mb-2">AI Weekly Progress Report</h3>
                    <p className="text-sm font-medium">Aggregates workspace data using Groq Llama 3 summaries</p>
                  </div>
                  <button
                    onClick={triggerDashboardAiReport}
                    className="px-6 py-3 bg-black text-white border-2 border-black font-bold text-sm uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all whitespace-nowrap"
                  >
                    Analyze & Generate
                  </button>
                </div>
                {dashboardAiReport && (
                  <div className="p-6 bg-white border-2 border-black text-sm font-medium leading-relaxed whitespace-pre-line font-space shadow-[inset_4px_4px_0_rgba(0,0,0,0.05)]">
                    {dashboardAiReport}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- TAB B: TEAM CHAT --- */}
          {activeTab === 'chat' && (
            <div className="flex h-full gap-8 overflow-hidden max-w-[1400px]">
              {/* Left Panel: Channels List */}
              <div className="w-1/4 bg-white border-2 border-black shadow-[6px_6px_0_#1a1a1a] p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Channels</h3>
                  <div className="flex flex-col gap-2">
                    {channels.map((chan) => (
                      <button
                        key={chan.id}
                        onClick={() => handleSelectChannel(chan)}
                        className={`w-full py-3 px-4 border-2 border-black text-sm font-bold text-left transition-all ${selectedChannel?.id === chan.id ? 'bg-black text-white shadow-[2px_2px_0_var(--gold)] translate-x-1' : 'bg-white hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a]'}`}
                      >
                        # {chan.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create Channel Form */}
                <form onSubmit={handleCreateChannel} className="border-t-2 border-black pt-5 mt-5 flex flex-col gap-3">
                  <input
                    type="text"
                    required
                    placeholder="New channel name..."
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--paper)] border-2 border-black text-sm focus:outline-none focus:bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newChanDesc}
                    onChange={(e) => setNewChanDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--paper)] border-2 border-black text-sm focus:outline-none focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="w-full py-3 bg-[var(--paper-lift)] border-2 border-black text-black text-xs font-bold uppercase tracking-widest hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all"
                  >
                    + Add Channel
                  </button>
                </form>
              </div>

              {/* Middle Panel: Active Chat Feed */}
              <div className="flex-grow flex flex-col bg-white border-2 border-black shadow-[6px_6px_0_#1a1a1a] overflow-hidden">
                <div className="h-16 border-b-2 border-black px-6 flex items-center justify-between bg-[var(--paper-lift)]">
                  <span className="font-bold text-lg"># {selectedChannel?.name}</span>
                  <span className="text-xs font-medium opacity-70">{selectedChannel?.description}</span>
                </div>

                {/* Messages Feed */}
                <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-5 bg-[var(--paper)]">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col items-start bg-white p-4 border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,0.1)] max-w-[85%]">
                      <div className="flex justify-between items-center w-full text-[10px] font-bold uppercase tracking-wider mb-2 border-b-2 border-black/10 pb-1">
                        <span>User #{msg.sender_id}</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                      
                      {/* Thread trigger */}
                      <button
                        onClick={() => openThread(msg)}
                        className="text-[10px] font-bold text-black border-2 border-black bg-[var(--gold)] px-2 py-1 uppercase tracking-wider mt-3 hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a] transition-transform"
                      >
                        Reply in thread &rarr;
                      </button>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="h-20 border-t-2 border-black px-6 flex items-center gap-4 bg-[var(--paper-lift)]">
                  <input
                    type="text"
                    placeholder={`Message #${selectedChannel?.name || ''}...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    className="flex-grow px-4 py-3 bg-white border-2 border-black text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleSendChat}
                    className="px-6 py-3 bg-black text-white border-2 border-black text-sm font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all"
                  >
                    Send
                  </button>
                </div>
              </div>

              {/* Right Panel: Chat Thread Drawer */}
              {threadParent && (
                <div className="w-1/3 bg-white border-2 border-black shadow-[6px_6px_0_#1a1a1a] p-5 flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-5">
                      <h4 className="font-bold text-sm uppercase tracking-wider">Thread Replies</h4>
                      <button onClick={() => setThreadParent(null)} className="text-black font-bold text-lg hover:text-[var(--danger)]">&times;</button>
                    </div>

                    {/* Parent Message details */}
                    <div className="p-4 bg-[var(--paper)] border-2 border-black mb-5 text-sm">
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-2 border-b-2 border-black/10 pb-1">PARENT MESSAGE:</div>
                      <p className="font-medium">{threadParent.content}</p>
                    </div>

                    {/* Replies list */}
                    <div className="flex flex-col gap-4 overflow-y-auto max-h-[350px] pr-2">
                      {threadReplies.map((rep) => (
                        <div key={rep.id} className="p-3 bg-white border-2 border-black text-sm font-medium leading-relaxed">
                          <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider mb-2 border-b-2 border-black/10 pb-1">
                            <span>User #{rep.sender_id}</span>
                            <span>{new Date(rep.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p>{rep.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Thread reply input */}
                  <div className="border-t-2 border-black pt-4 mt-4 flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Reply to thread..."
                      value={threadInput}
                      onChange={(e) => setThreadInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                      className="w-full px-4 py-3 bg-[var(--paper)] border-2 border-black text-sm focus:outline-none focus:bg-white"
                    />
                    <button
                      onClick={handleSendReply}
                      className="w-full py-3 bg-[var(--gold)] text-black border-2 border-black text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- TAB C: PROJECTS & KANBAN --- */}
          {activeTab === 'projects' && (
            <div className="flex flex-col gap-10 h-full max-w-[1600px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-space font-bold border-b-4 border-black pb-4">Sprint Manager</h2>
                  {selectedProject && (
                    <span className="text-sm font-bold uppercase tracking-wider mt-4 inline-block bg-[var(--gold)] border-2 border-black px-3 py-1 shadow-[2px_2px_0_#1a1a1a]">Active Project: {selectedProject.name}</span>
                  )}
                </div>

                {/* Project Creator Form */}
                <form onSubmit={handleCreateProject} className="flex flex-wrap gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Project name..."
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="px-4 py-3 bg-[var(--paper)] border-2 border-black text-sm font-bold focus:outline-none focus:bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Description..."
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    className="px-4 py-3 bg-[var(--paper)] border-2 border-black text-sm font-bold focus:outline-none focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-black text-white border-2 border-black text-sm font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all whitespace-nowrap"
                  >
                    + Project
                  </button>
                </form>
              </div>

              {/* Selector */}
              <div className="flex flex-wrap gap-4 border-b-2 border-black pb-6">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleSelectProject(proj)}
                    className={`px-6 py-3 border-2 border-black text-sm font-bold uppercase tracking-wider transition-all ${selectedProject?.id === proj.id ? 'bg-[var(--gold)] text-black shadow-[4px_4px_0_#1a1a1a] translate-x-1' : 'bg-white text-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a]'}`}
                  >
                    {proj.name}
                  </button>
                ))}
              </div>

              {/* Kanban board layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow overflow-hidden">
                {['To Do', 'In Progress', 'Done'].map((col) => {
                  const columnTasks = tasks.filter(t => t.status === col)
                  const colBg = col === 'To Do' ? 'bg-[var(--paper-lift)]' : col === 'In Progress' ? 'bg-[#b7a36a]/20' : 'bg-[#3f6f55]/20';
                  
                  return (
                    <div key={col} className={`${colBg} border-2 border-black shadow-[6px_6px_0_#1a1a1a] p-5 flex flex-col h-full min-h-[400px]`}>
                      <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-5">
                        <span className="font-space text-lg font-bold uppercase tracking-widest">{col}</span>
                        <span className="px-3 py-1 bg-black text-white text-xs font-bold border-2 border-black shadow-[2px_2px_0_var(--gold)]">{columnTasks.length}</span>
                      </div>

                      <div className="flex flex-col gap-4 flex-grow overflow-y-auto pr-2">
                        {columnTasks.map((t) => (
                          <div key={t.id} className="p-4 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(0,0,0,1)] transition-transform flex flex-col gap-3">
                            <h4 className="font-bold text-sm">{t.title}</h4>
                            <p className="text-xs font-medium leading-relaxed opacity-80">{t.description}</p>
                            <div className="text-[10px] font-bold tracking-wider uppercase mt-1 bg-[var(--paper)] p-2 border-2 border-black self-start">Assignee: {t.assignee_id || 'Unassigned'}</div>
                            
                            {/* Simple Status Toggler buttons */}
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t-2 border-black/10">
                              {col !== 'To Do' && (
                                <button onClick={() => handleTaskStatusChange(t.id, 'To Do')} className="px-3 py-1.5 bg-white border-2 border-black text-[10px] font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors">To Do</button>
                              )}
                              {col !== 'In Progress' && (
                                <button onClick={() => handleTaskStatusChange(t.id, 'In Progress')} className="px-3 py-1.5 bg-white border-2 border-black text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--gold)] transition-colors">In Dev</button>
                              )}
                              {col !== 'Done' && (
                                <button onClick={() => handleTaskStatusChange(t.id, 'Done')} className="px-3 py-1.5 bg-white border-2 border-black text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--green)] hover:text-white transition-colors">Done</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Task Add Form */}
              {selectedProject && (
                <form onSubmit={handleCreateTask} className="p-8 bg-[var(--paper-lift)] border-2 border-black shadow-[8px_8px_0_#1a1a1a] flex flex-col lg:flex-row gap-6 items-end mt-4">
                  <div className="flex-grow flex flex-col gap-2 w-full">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Add Task to {selectedProject.name}</span>
                    <input
                      type="text"
                      required
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-black text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div className="flex-grow flex flex-col gap-2 w-full">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Task description</span>
                    <input
                      type="text"
                      placeholder="Write brief description..."
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-black text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2 w-full lg:w-auto">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Assignee</span>
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="w-full lg:w-48 px-4 py-3 bg-white border-2 border-black text-sm font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {workspaceMembers.map(m => (
                        <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.role})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full lg:w-auto px-8 py-3 bg-black text-white border-2 border-black font-bold uppercase tracking-wider text-sm hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all whitespace-nowrap"
                  >
                    + Add Task
                  </button>
                </form>
              )}
            </div>
          )}

          {/* --- TAB D: DOCUMENT STORAGE --- */}
          {activeTab === 'documents' && (
            <div className="flex flex-col gap-10 max-w-[1400px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-black pb-4">
                <h2 className="text-4xl font-space font-bold">Document Library</h2>
                
                {/* Upload Form */}
                <form onSubmit={handleDocUpload} className="flex flex-wrap gap-4 items-center bg-white border-2 border-black p-4 shadow-[6px_6px_0_#1a1a1a]">
                  <input
                    type="text"
                    required
                    placeholder="Document title..."
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="px-4 py-2 bg-[var(--paper)] border-2 border-black text-sm font-bold focus:outline-none focus:bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Category (default: General)"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="px-4 py-2 bg-[var(--paper)] border-2 border-black text-sm font-bold focus:outline-none focus:bg-white"
                  />
                  <input
                    type="file"
                    required
                    onChange={(e) => setDocFile(e.target.files[0])}
                    className="text-xs font-bold file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:text-xs file:font-bold file:bg-[var(--gold)] file:text-black file:cursor-pointer file:shadow-[2px_2px_0_#1a1a1a] file:hover:translate-y-px file:hover:shadow-[1px_1px_0_#1a1a1a] file:transition-all"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-black text-white border-2 border-black text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all whitespace-nowrap"
                  >
                    Upload File
                  </button>
                </form>
              </div>

              {/* Grid document layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Documents list */}
                <div className="flex flex-col gap-5">
                  <h3 className="font-bold text-lg font-space uppercase tracking-widest border-b-2 border-black pb-2">Stored Documents</h3>
                  <div className="flex flex-col gap-4">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => viewDocVersions(doc)}
                        className="p-5 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] flex justify-between items-center cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(0,0,0,1)] transition-transform"
                      >
                        <div>
                          <h4 className="font-bold text-sm uppercase tracking-wider">{doc.title}</h4>
                          <span className="text-[10px] font-bold tracking-widest border-2 border-black bg-[var(--paper)] px-2 py-0.5 uppercase mt-2 inline-block">Category: {doc.category}</span>
                        </div>
                        <span className="text-xs text-black font-black bg-[var(--gold)] border-2 border-black px-3 py-1 shadow-[2px_2px_0_#1a1a1a]">Ver. {doc.current_version} &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected document versions */}
                <div className="p-8 bg-[var(--paper-lift)] border-2 border-black shadow-[8px_8px_0_#1a1a1a]">
                  <h3 className="font-bold text-lg font-space uppercase tracking-widest border-b-2 border-black pb-3 mb-5">
                    {selectedDocTitle ? `${selectedDocTitle} - Version Log` : 'Select a document to view history'}
                  </h3>
                  {selectedDocVersions.length === 0 ? (
                    <p className="text-sm font-medium">Click a document from the list to show all version downloads.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {selectedDocVersions.map((ver) => (
                        <div key={ver.id} className="p-4 bg-white border-2 border-black shadow-[4px_4px_0_#1a1a1a] flex justify-between items-center">
                          <div>
                            <div className="font-bold text-sm uppercase tracking-wider mb-1">Version #{ver.version_number}</div>
                            <div className="text-[10px] font-bold tracking-widest uppercase border-2 border-black bg-[var(--paper)] px-2 py-0.5 inline-block">{ver.file_type} | {(ver.file_size / 1024).toFixed(1)} KB</div>
                            {ver.changelog && <div className="text-xs font-medium mt-2 bg-[var(--paper-lift)] border-l-4 border-black pl-2 py-1">Changelog: {ver.changelog}</div>}
                          </div>
                          
                          {/* Direct download */}
                          <a
                            href={api.documents.getDownloadUrl(workspace_id, ver.document_id, ver.version_number)}
                            className="px-4 py-2 bg-black text-white border-2 border-black text-[10px] font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all whitespace-nowrap"
                            download
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- TAB E: MEETINGS INTELLIGENCE --- */}
          {activeTab === 'meetings' && (
            <div className="flex flex-col gap-10 max-w-[1600px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-black pb-4">
                <h2 className="text-4xl font-space font-bold">Meeting Intelligence</h2>
                
                {/* Meeting Creator */}
                <form onSubmit={handleCreateMeeting} className="flex flex-wrap gap-4 items-center bg-white border-2 border-black p-4 shadow-[6px_6px_0_#1a1a1a]">
                  <input
                    type="text"
                    required
                    placeholder="Meeting title..."
                    value={newMeetTitle}
                    onChange={(e) => setNewMeetTitle(e.target.value)}
                    className="px-4 py-2 bg-[var(--paper)] border-2 border-black text-sm font-bold focus:outline-none focus:bg-white"
                  />
                  <input
                    type="datetime-local"
                    required
                    value={newMeetDate}
                    onChange={(e) => setNewMeetDate(e.target.value)}
                    className="px-4 py-2 bg-[var(--paper)] border-2 border-black text-sm font-bold focus:outline-none focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-black text-white border-2 border-black text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all whitespace-nowrap"
                  >
                    + Schedule
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Meetings List */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-lg font-space uppercase tracking-widest border-b-2 border-black pb-2 mb-2">Meetings Feed</h3>
                  {meetings.map((meet) => (
                    <div key={meet.id} className="p-5 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider">{meet.title}</h4>
                        <p className="text-[10px] font-bold tracking-widest border-2 border-black bg-[var(--paper)] px-2 py-0.5 uppercase mt-2 inline-block">{new Date(meet.scheduled_at).toLocaleString()}</p>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setSelectedMeeting(meet)}
                          className="px-4 py-2 bg-[var(--paper)] border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Transcript
                        </button>
                        <button
                          onClick={() => handleTriggerSummary(meet)}
                          className="px-4 py-2 bg-[var(--gold)] text-black border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          AI Summary
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Area: Transcripts & AI Summaries */}
                <div className="flex flex-col gap-8">
                  {/* Selected Meeting Transcript Upload */}
                  {selectedMeeting && (
                    <div className="p-8 bg-[var(--paper-lift)] border-2 border-black shadow-[8px_8px_0_#1a1a1a]">
                      <h4 className="font-bold text-lg font-space uppercase tracking-widest mb-4 border-b-2 border-black pb-2">Upload Transcript for: {selectedMeeting.title}</h4>
                      <form onSubmit={handleUploadTranscript} className="flex flex-col gap-4">
                        <textarea
                          rows="5"
                          required
                          placeholder="Type or paste transcription text..."
                          value={transcriptText}
                          onChange={(e) => setTranscriptText(e.target.value)}
                          className="w-full p-4 bg-white border-2 border-black text-sm font-medium focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="w-fit px-8 py-3 bg-black text-white border-2 border-black text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all"
                        >
                          Save Transcript
                        </button>
                      </form>
                    </div>
                  )}

                  {/* AI Summarization result */}
                  <div className="p-8 bg-[var(--paper-lift)] border-2 border-black shadow-[8px_8px_0_#1a1a1a]">
                    <h3 className="font-bold text-lg font-space uppercase tracking-widest border-b-2 border-black pb-3 mb-5">Llama 3 AI intelligence Report</h3>
                    {summarizeLoading ? (
                      <p className="text-sm font-bold uppercase tracking-wider animate-pulse">Requesting AI summary from backend...</p>
                    ) : !meetSummary ? (
                      <p className="text-sm font-medium">Click &quot;AI Summary&quot; on any meeting to generate intelligence reports.</p>
                    ) : (
                      <div className="flex flex-col gap-6 text-sm">
                        <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0_#1a1a1a]">
                          <div className="font-black text-lg uppercase tracking-wider border-b-2 border-black pb-2 mb-3 font-space bg-[var(--gold)] inline-block px-3 py-1">SUMMARY:</div>
                          <p className="leading-relaxed font-medium">{meetSummary.summary}</p>
                        </div>
                        <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0_#1a1a1a]">
                          <div className="font-black text-lg uppercase tracking-wider border-b-2 border-black pb-2 mb-3 font-space bg-black text-white inline-block px-3 py-1">ACTION ITEMS:</div>
                          <pre className="whitespace-pre-line leading-relaxed font-medium text-xs border-l-4 border-black pl-3 ml-2">{meetSummary.action_items}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB F: AI KNOWLEDGE BRAIN --- */}
          {activeTab === 'ai' && (
            <div className="flex flex-col gap-10 max-w-4xl">
              <div className="border-b-4 border-black pb-4">
                <h2 className="text-4xl font-space font-bold">AI Knowledge Brain</h2>
                <p className="text-sm font-medium mt-2">Queries pgvector documents storage and provides localized context summaries</p>
              </div>

              {/* RAG search form */}
              <form onSubmit={handleAiQuery} className="p-8 bg-white border-2 border-black shadow-[8px_8px_0_#1a1a1a] flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold uppercase tracking-wider">Ask anything about the files in this workspace:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. What are the OAuth credentials rules? or summarize the tech details"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    className="w-full px-5 py-4 bg-[var(--paper)] border-2 border-black text-sm font-medium focus:outline-none focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={aiQueryLoading}
                  className="px-8 py-4 bg-[var(--gold)] text-black border-2 border-black font-bold text-sm uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all w-fit disabled:opacity-50"
                >
                  {aiQueryLoading ? 'Querying Brain...' : 'Query AI Brain'}
                </button>
              </form>

              {/* AI Answer display */}
              {aiAnswer && (
                <div className="p-8 bg-[var(--paper-lift)] border-2 border-black shadow-[8px_8px_0_#1a1a1a] flex flex-col gap-5">
                  <div className="text-lg font-black font-space uppercase tracking-widest border-b-2 border-black pb-2 bg-black text-white inline-block px-4 py-2 self-start">AI BRAIN RESPONSE:</div>
                  <p className="text-sm leading-relaxed font-medium whitespace-pre-line bg-white p-6 border-2 border-black shadow-[inset_4px_4px_0_rgba(0,0,0,0.05)]">
                    {aiAnswer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* --- TAB G: NOTIFICATIONS FEED --- */}
          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-10 max-w-3xl">
              <div className="flex justify-between items-end border-b-4 border-black pb-4">
                <div>
                  <h2 className="text-4xl font-space font-bold">In-App Notifications</h2>
                  <p className="text-sm font-medium mt-2">Recipients feed triggered by Chat @mentions</p>
                </div>
                <button
                  onClick={markAllNotificationsRead}
                  className="px-6 py-3 bg-[var(--paper)] border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Mark All Read
                </button>
              </div>

              <div className="flex flex-col gap-5">
                {notifications.length === 0 ? (
                  <div className="p-8 bg-white border-2 border-black shadow-[4px_4px_0_#1a1a1a] text-center">
                    <p className="text-lg font-bold font-space uppercase">Your inbox is completely clear!</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-6 border-2 border-black flex justify-between items-center transition-transform hover:-translate-y-0.5 ${notif.is_read ? 'bg-[#e8e8e2] opacity-70 shadow-[2px_2px_0_#1a1a1a]' : 'bg-white shadow-[6px_6px_0_#1a1a1a]'}`}
                    >
                      <div>
                        <div className="font-bold text-lg mb-1">{notif.title}</div>
                        <p className="text-sm font-medium leading-relaxed">{notif.content}</p>
                        <span className="text-[10px] font-bold tracking-widest uppercase mt-3 inline-block bg-[var(--paper)] border-2 border-black px-2 py-0.5">Type: {notif.notification_type}</span>
                      </div>
                      
                      {!notif.is_read && (
                        <button
                          onClick={() => markSingleNotificationRead(notif.id)}
                          className="px-5 py-2 bg-[var(--gold)] text-black border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
