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
      setDashboardAiReport(report.summary_report)
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
      <div className="min-h-screen bg-[#07080C] text-white flex items-center justify-center font-sans">
        <p className="text-sm tracking-wider uppercase">Loading Workspace Shell...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07080C] flex flex-col font-sans text-[#EEEEEE]">
      {/* Top Header Bar */}
      <header className="h-16 px-6 bg-[#10121D] border-b border-white/5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="font-steelfish text-2xl font-black tracking-tight text-white cursor-pointer" onClick={() => router.push('/workspaces')}>
            SYNAPSEIQ
          </span>
          <span className="text-xs text-white/30">/ Workspace: {workspace_id}</span>
        </div>

        <div className="flex items-center gap-6">
          {/* Notifications Indicator */}
          <div className="relative cursor-pointer" onClick={() => handleTabChange('notifications')}>
            <span className="text-lg">🔔</span>
            {bellCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#EF8E01] text-black text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {bellCount}
              </span>
            )}
          </div>

          <div className="text-right">
            <div className="text-xs font-bold">{currentUser?.full_name}</div>
            <div className="text-[10px] text-white/40">{currentUser?.email}</div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-grow h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-[#10121D] border-r border-white/5 p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-2">
            <h3 className="text-[10px] font-mono tracking-widest text-white/30 uppercase mb-4">MODULES</h3>
            
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left transition-all ${activeTab === 'dashboard' ? 'bg-[#0038BD] text-white' : 'hover:bg-white/5 text-white/60'}`}
            >
              📊 Dashboard Analytics
            </button>

            <button
              onClick={() => handleTabChange('chat')}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left transition-all ${activeTab === 'chat' ? 'bg-[#0038BD] text-white' : 'hover:bg-white/5 text-white/60'}`}
            >
              💬 Channel Chats
            </button>

            <button
              onClick={() => handleTabChange('projects')}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left transition-all ${activeTab === 'projects' ? 'bg-[#0038BD] text-white' : 'hover:bg-white/5 text-white/60'}`}
            >
              📋 Projects & Kanban
            </button>

            <button
              onClick={() => handleTabChange('documents')}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left transition-all ${activeTab === 'documents' ? 'bg-[#0038BD] text-white' : 'hover:bg-white/5 text-white/60'}`}
            >
              📂 Document Storage
            </button>

            <button
              onClick={() => handleTabChange('meetings')}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left transition-all ${activeTab === 'meetings' ? 'bg-[#0038BD] text-white' : 'hover:bg-white/5 text-white/60'}`}
            >
              📅 Intelligent Meetings
            </button>

            <button
              onClick={() => handleTabChange('ai')}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-left transition-all ${activeTab === 'ai' ? 'bg-[#0038BD] text-white' : 'hover:bg-white/5 text-white/60'}`}
            >
              🧠 AI Knowledge Brain
            </button>
          </div>

          <button
            onClick={() => router.push('/workspaces')}
            className="w-full py-3 border border-white/10 hover:bg-white/5 text-xs text-white/50 font-bold rounded-xl transition-all"
          >
            &larr; Switch Workspace
          </button>
        </aside>

        {/* Tab Content Window */}
        <main className="flex-grow p-8 overflow-y-auto bg-[#07080C]">
          
          {/* --- TAB A: DASHBOARD ANALYTICS --- */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-8">
              <h2 className="text-2xl font-bold">Workspace Overview</h2>
              {loadingStats ? (
                <p className="text-sm text-white/40">Fetching statistics...</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl bg-[#10121D] border border-white/5">
                    <div className="text-white/40 text-[10px] uppercase font-mono mb-1">Total Members</div>
                    <div className="text-3xl font-black">{workspaceMembers.length}</div>
                  </div>
                  <div className="p-6 rounded-2xl bg-[#10121D] border border-white/5">
                    <div className="text-white/40 text-[10px] uppercase font-mono mb-1">Total Tasks</div>
                    <div className="text-3xl font-black">{dashboardStats?.total_tasks || 0}</div>
                  </div>
                  <div className="p-6 rounded-2xl bg-[#10121D] border border-white/5">
                    <div className="text-white/40 text-[10px] uppercase font-mono mb-1">Completed Ratio</div>
                    <div className="text-3xl font-black text-emerald-500">
                      {dashboardStats?.completed_tasks || 0} / {dashboardStats?.total_tasks || 0}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-8 rounded-2xl bg-[#10121D] border border-white/5">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                  <div>
                    <h3 className="font-bold text-md">Invite Team Members</h3>
                    <p className="text-xs text-white/40 mt-1">
                      Add a company email, choose the workspace role, and send the room invite.
                    </p>
                  </div>

                  <form onSubmit={handleInviteMember} className="flex flex-col md:flex-row gap-3 md:items-end">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono uppercase text-white/40">Company Email</label>
                      <input
                        type="email"
                        required
                        placeholder="teammate@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="min-w-[240px] px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#EF8E01]"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-mono uppercase text-white/40">Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#EF8E01]"
                      >
                        <option value="Member">Member</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="px-5 py-3 rounded-xl bg-[#EF8E01] text-black font-semibold text-xs uppercase hover:opacity-90"
                    >
                      {inviteLoading ? 'Sending...' : 'Send Invite'}
                    </button>
                  </form>
                </div>

                {inviteMessage && (
                  <p className="text-xs text-[#EF8E01] mt-4">{inviteMessage}</p>
                )}
              </div>

              {/* AI Report Section */}
              <div className="p-8 rounded-2xl bg-[#10121D] border border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-md">AI Weekly Manager Progress Report</h3>
                    <p className="text-xs text-white/40">Aggregates workspace data using Groq Llama 3 summaries</p>
                  </div>
                  <button
                    onClick={triggerDashboardAiReport}
                    className="px-5 py-2.5 rounded-xl bg-[#EF8E01] text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90"
                  >
                    Analyze & Generate
                  </button>
                </div>
                {dashboardAiReport && (
                  <div className="p-5 rounded-xl bg-black/40 border border-white/5 text-xs text-white/70 leading-relaxed whitespace-pre-line font-mono">
                    {dashboardAiReport}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- TAB B: TEAM CHAT --- */}
          {activeTab === 'chat' && (
            <div className="flex h-full gap-6 overflow-hidden">
              {/* Left Panel: Channels List */}
              <div className="w-1/4 bg-[#10121D] rounded-2xl border border-white/5 p-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-white/30 mb-4">Channels</h3>
                  <div className="flex flex-col gap-1.5">
                    {channels.map((chan) => (
                      <button
                        key={chan.id}
                        onClick={() => handleSelectChannel(chan)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs text-left ${selectedChannel?.id === chan.id ? 'bg-[#0038BD] text-white font-bold' : 'hover:bg-white/5 text-white/60'}`}
                      >
                        # {chan.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Create Channel Form */}
                <form onSubmit={handleCreateChannel} className="border-t border-white/5 pt-4 mt-4 flex flex-col gap-2">
                  <input
                    type="text"
                    required
                    placeholder="New channel name..."
                    value={newChanName}
                    onChange={(e) => setNewChanName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newChanDesc}
                    onChange={(e) => setNewChanDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-white/10 hover:bg-white/20 text-[10px] font-bold uppercase rounded-xl"
                  >
                    + Add Channel
                  </button>
                </form>
              </div>

              {/* Middle Panel: Active Chat Feed */}
              <div className="flex-grow flex flex-col bg-[#10121D] rounded-2xl border border-white/5 overflow-hidden">
                <div className="h-12 border-b border-white/5 px-6 flex items-center justify-between">
                  <span className="font-bold text-sm"># {selectedChannel?.name}</span>
                  <span className="text-xs text-white/40">{selectedChannel?.description}</span>
                </div>

                {/* Messages Feed */}
                <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className="flex flex-col items-start bg-black/20 p-3 rounded-xl border border-white/5 max-w-[80%]">
                      <div className="flex justify-between items-center w-full text-[10px] font-mono text-white/40 mb-1">
                        <span>Sender: User #{msg.sender_id}</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{msg.content}</p>
                      
                      {/* Thread trigger */}
                      <button
                        onClick={() => openThread(msg)}
                        className="text-[9px] font-bold text-[#EF8E01] uppercase tracking-wider mt-2 hover:underline"
                      >
                        Reply in thread &rarr;
                      </button>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="h-16 border-t border-white/5 px-6 flex items-center gap-3">
                  <input
                    type="text"
                    placeholder={`Message #${selectedChannel?.name || ''}... (Tip: tag members like @username)`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    className="flex-grow px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <button
                    onClick={handleSendChat}
                    className="px-4 py-2 bg-[#0038BD] text-white rounded-xl text-xs font-bold hover:opacity-90"
                  >
                    Send
                  </button>
                </div>
              </div>

              {/* Right Panel: Chat Thread Drawer */}
              {threadParent && (
                <div className="w-1/3 bg-[#10121D] rounded-2xl border border-white/5 p-4 flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
                      <h4 className="font-bold text-xs">Thread Replies</h4>
                      <button onClick={() => setThreadParent(null)} className="text-white/40 text-xs hover:text-white">&times; Close</button>
                    </div>

                    {/* Parent Message details */}
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 mb-4 text-xs">
                      <div className="text-[9px] font-mono text-white/30 mb-1">PARENT MESSAGE:</div>
                      <p>{threadParent.content}</p>
                    </div>

                    {/* Replies list */}
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px]">
                      {threadReplies.map((rep) => (
                        <div key={rep.id} className="p-2.5 bg-white/5 rounded-xl text-[11px] leading-relaxed">
                          <div className="flex justify-between text-[9px] text-white/30 font-mono mb-1">
                            <span>User #{rep.sender_id}</span>
                            <span>{new Date(rep.created_at).toLocaleTimeString()}</span>
                          </div>
                          <p>{rep.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Thread reply input */}
                  <div className="border-t border-white/5 pt-3 mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Reply to thread..."
                      value={threadInput}
                      onChange={(e) => setThreadInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                      className="flex-grow px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={handleSendReply}
                      className="px-3 py-2 bg-[#EF8E01] text-black rounded-xl text-xs font-bold hover:opacity-90"
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
            <div className="flex flex-col gap-8 h-full">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Sprint Manager</h2>
                  {selectedProject && (
                    <span className="text-xs text-white/40">Active Project: {selectedProject.name}</span>
                  )}
                </div>

                {/* Project Creator Form */}
                <form onSubmit={handleCreateProject} className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Project name..."
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="px-3 py-2 bg-[#10121D] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Description..."
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    className="px-3 py-2 bg-[#10121D] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0038BD] text-white rounded-xl text-xs font-bold hover:opacity-90"
                  >
                    + Project
                  </button>
                </form>
              </div>

              {/* Selector */}
              <div className="flex gap-2 border-b border-white/5 pb-4">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => handleSelectProject(proj)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold ${selectedProject?.id === proj.id ? 'bg-[#EF8E01] text-black' : 'bg-[#10121D] text-white/50 hover:text-white'}`}
                  >
                    {proj.name}
                  </button>
                ))}
              </div>

              {/* Kanban board layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow overflow-hidden">
                {['To Do', 'In Progress', 'Done'].map((col) => {
                  const columnTasks = tasks.filter(t => t.status === col)
                  return (
                    <div key={col} className="bg-[#10121D] rounded-2xl border border-white/5 p-4 flex flex-col h-full min-h-[300px]">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-4">
                        <span className="font-bold text-xs uppercase tracking-widest">{col}</span>
                        <span className="px-2 py-0.5 bg-white/5 rounded-full text-[9px] font-bold">{columnTasks.length}</span>
                      </div>

                      <div className="flex flex-col gap-3 flex-grow overflow-y-auto">
                        {columnTasks.map((t) => (
                          <div key={t.id} className="p-4 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-2">
                            <h4 className="font-bold text-xs">{t.title}</h4>
                            <p className="text-[10px] text-white/40 leading-relaxed">{t.description}</p>
                            <div className="text-[8px] font-mono text-white/30 uppercase mt-1">Assignee ID: {t.assignee_id || 'Unassigned'}</div>
                            
                            {/* Simple Status Toggler buttons for testing */}
                            <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5">
                              {col !== 'To Do' && (
                                <button onClick={() => handleTaskStatusChange(t.id, 'To Do')} className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[8px] rounded uppercase font-bold">To Do</button>
                              )}
                              {col !== 'In Progress' && (
                                <button onClick={() => handleTaskStatusChange(t.id, 'In Progress')} className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[8px] rounded uppercase font-bold">In Dev</button>
                              )}
                              {col !== 'Done' && (
                                <button onClick={() => handleTaskStatusChange(t.id, 'Done')} className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[8px] rounded uppercase font-bold">Done</button>
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
                <form onSubmit={handleCreateTask} className="p-6 rounded-2xl bg-[#10121D] border border-white/5 flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-grow flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-white/40">Add Task to {selectedProject.name}</span>
                    <input
                      type="text"
                      required
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex-grow flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-white/40">Task description</span>
                    <input
                      type="text"
                      placeholder="Write brief description..."
                      value={newTaskDesc}
                      onChange={(e) => setNewTaskDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-white/40">Assignee</span>
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none min-w-[150px]"
                    >
                      <option value="">Unassigned</option>
                      {workspaceMembers.map(m => (
                        <option key={m.user_id} value={m.user_id}>{m.full_name} ({m.role})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#EF8E01] text-black font-bold rounded-xl text-xs hover:opacity-90"
                  >
                    + Add Task
                  </button>
                </form>
              )}
            </div>
          )}

          {/* --- TAB D: DOCUMENT STORAGE --- */}
          {activeTab === 'documents' && (
            <div className="flex flex-col gap-8">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-2xl font-bold">Document Library</h2>
                
                {/* Upload Form */}
                <form onSubmit={handleDocUpload} className="flex gap-3 items-center">
                  <input
                    type="text"
                    required
                    placeholder="Document title..."
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="px-3 py-2 bg-[#10121D] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Category (default: General)"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="px-3 py-2 bg-[#10121D] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <input
                    type="file"
                    required
                    onChange={(e) => setDocFile(e.target.files[0])}
                    className="text-xs text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white file:cursor-pointer"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0038BD] text-white rounded-xl text-xs font-bold hover:opacity-90"
                  >
                    Upload File
                  </button>
                </form>
              </div>

              {/* Grid document layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Documents list */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-sm">Stored Documents</h3>
                  <div className="flex flex-col gap-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => viewDocVersions(doc)}
                        className="p-4 bg-[#10121D] border border-white/5 rounded-2xl flex justify-between items-center cursor-pointer hover:border-[#0038BD]"
                      >
                        <div>
                          <h4 className="font-bold text-xs">{doc.title}</h4>
                          <span className="text-[9px] font-mono text-white/30 uppercase mt-1 block">Category: {doc.category}</span>
                        </div>
                        <span className="text-[10px] text-[#EF8E01] font-bold">Ver. {doc.current_version} &rarr;</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected document versions */}
                <div className="p-6 rounded-2xl bg-[#10121D] border border-white/5">
                  <h3 className="font-bold text-sm border-b border-white/5 pb-2 mb-4">
                    {selectedDocTitle ? `${selectedDocTitle} - Version Log` : 'Select a document to view history'}
                  </h3>
                  {selectedDocVersions.length === 0 ? (
                    <p className="text-xs text-white/30">Click a document from the list to show all version downloads.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {selectedDocVersions.map((ver) => (
                        <div key={ver.id} className="p-3 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-[11px] text-white/80">Version #{ver.version_number}</div>
                            <div className="text-[9px] text-white/30 mt-0.5 font-mono">{ver.file_type} | {(ver.file_size / 1024).toFixed(1)} KB</div>
                            {ver.changelog && <div className="text-[9px] text-white/50 mt-1 italic">Changelog: {ver.changelog}</div>}
                          </div>
                          
                          {/* Direct download */}
                          <a
                            href={api.documents.getDownloadUrl(workspace_id, ver.document_id, ver.version_number)}
                            className="px-3 py-1 bg-white/10 hover:bg-[#0038BD] text-[9px] font-bold uppercase rounded-xl transition-all"
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
            <div className="flex flex-col gap-8">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-2xl font-bold">Meeting Intelligence</h2>
                
                {/* Meeting Creator */}
                <form onSubmit={handleCreateMeeting} className="flex flex-wrap gap-2 items-end">
                  <input
                    type="text"
                    required
                    placeholder="Meeting title..."
                    value={newMeetTitle}
                    onChange={(e) => setNewMeetTitle(e.target.value)}
                    className="px-3 py-2 bg-[#10121D] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <input
                    type="datetime-local"
                    required
                    value={newMeetDate}
                    onChange={(e) => setNewMeetDate(e.target.value)}
                    className="px-3 py-2 bg-[#10121D] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0038BD] text-white rounded-xl text-xs font-bold hover:opacity-90"
                  >
                    + Schedule
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Meetings List */}
                <div className="flex flex-col gap-3">
                  <h3 className="font-bold text-sm mb-2">Meetings Feed</h3>
                  {meetings.map((meet) => (
                    <div key={meet.id} className="p-4 bg-[#10121D] border border-white/5 rounded-2xl flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs">{meet.title}</h4>
                        <p className="text-[10px] text-white/40 mt-1">{new Date(meet.scheduled_at).toLocaleString()}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedMeeting(meet)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[9px] font-bold rounded-lg uppercase"
                        >
                          Transcript
                        </button>
                        <button
                          onClick={() => handleTriggerSummary(meet)}
                          className="px-3 py-1.5 bg-[#EF8E01] text-black text-[9px] font-bold rounded-lg uppercase"
                        >
                          AI Summary
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Area: Transcripts & AI Summaries */}
                <div className="flex flex-col gap-6">
                  {/* Selected Meeting Transcript Upload */}
                  {selectedMeeting && (
                    <div className="p-6 rounded-2xl bg-[#10121D] border border-white/5">
                      <h4 className="font-bold text-xs mb-3">Upload Transcript for: {selectedMeeting.title}</h4>
                      <form onSubmit={handleUploadTranscript} className="flex flex-col gap-3">
                        <textarea
                          rows="4"
                          required
                          placeholder="Type or paste transcription text..."
                          value={transcriptText}
                          onChange={(e) => setTranscriptText(e.target.value)}
                          className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none font-mono"
                        />
                        <button
                          type="submit"
                          className="w-fit px-4 py-2 bg-[#0038BD] text-white rounded-xl text-xs font-bold hover:opacity-90"
                        >
                          Save Transcript
                        </button>
                      </form>
                    </div>
                  )}

                  {/* AI Summarization result */}
                  <div className="p-6 rounded-2xl bg-[#10121D] border border-white/5">
                    <h3 className="font-bold text-sm border-b border-white/5 pb-2 mb-4">Llama 3 AI intelligence Report</h3>
                    {summarizeLoading ? (
                      <p className="text-xs text-white/40">Requesting AI summary from backend...</p>
                    ) : !meetSummary ? (
                      <p className="text-xs text-white/30">Click &quot;AI Summary&quot; on any meeting to generate intelligence reports.</p>
                    ) : (
                      <div className="flex flex-col gap-4 text-xs">
                        <div>
                          <div className="font-bold text-[#EF8E01] mb-1">SUMMARY:</div>
                          <p className="leading-relaxed text-white/80">{meetSummary.summary}</p>
                        </div>
                        <div>
                          <div className="font-bold text-[#0038BD] mb-1">ACTION ITEMS:</div>
                          <pre className="whitespace-pre-line leading-relaxed text-white/70 font-mono text-[10px]">{meetSummary.action_items}</pre>
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
            <div className="flex flex-col gap-8 max-w-3xl">
              <div>
                <h2 className="text-2xl font-bold">AI Knowledge Brain</h2>
                <p className="text-xs text-white/40 mt-1">Queries pgvector documents storage and provides localized context summaries</p>
              </div>

              {/* RAG search form */}
              <form onSubmit={handleAiQuery} className="p-6 rounded-2xl bg-[#10121D] border border-white/5 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono uppercase text-white/40">Ask anything about the files in this workspace:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. What are the OAuth credentials rules? or summarize the tech details"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={aiQueryLoading}
                  className="px-6 py-2.5 bg-[#EF8E01] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:opacity-90 w-fit"
                >
                  {aiQueryLoading ? 'Querying Brain...' : 'Query AI Brain'}
                </button>
              </form>

              {/* AI Answer display */}
              {aiAnswer && (
                <div className="p-6 rounded-2xl bg-[#10121D] border border-white/5 flex flex-col gap-3">
                  <div className="text-xs font-bold text-[#0038BD]">AI BRAIN RESPONSE:</div>
                  <p className="text-xs leading-relaxed text-white/80 whitespace-pre-line font-mono bg-black/30 p-4 rounded-xl border border-white/5">
                    {aiAnswer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* --- TAB G: NOTIFICATIONS FEED --- */}
          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-8 max-w-2xl">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-2xl font-bold">In-App Notifications</h2>
                  <p className="text-xs text-white/40 mt-1">Recipients feed triggered by Chat @mentions</p>
                </div>
                <button
                  onClick={markAllNotificationsRead}
                  className="px-4 py-2 border border-white/10 hover:border-[#0038BD]/50 hover:bg-[#0038BD]/10 rounded-xl text-[10px] font-bold uppercase"
                >
                  Mark All Read
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {notifications.length === 0 ? (
                  <p className="text-sm text-white/30">Your inbox is completely clear!</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-2xl border flex justify-between items-center ${notif.is_read ? 'bg-[#10121D]/30 border-white/5 text-white/50' : 'bg-[#10121D] border-[#0038BD]/30 shadow-md'}`}
                    >
                      <div>
                        <div className="font-bold text-xs">{notif.title}</div>
                        <p className="text-[10px] leading-relaxed mt-1">{notif.content}</p>
                        <span className="text-[8px] font-mono text-white/30 uppercase mt-1 block">Type: {notif.notification_type}</span>
                      </div>
                      
                      {!notif.is_read && (
                        <button
                          onClick={() => markSingleNotificationRead(notif.id)}
                          className="px-3 py-1 bg-white/5 hover:bg-[#EF8E01] hover:text-black text-[9px] font-bold uppercase rounded-lg"
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
