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
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [currentUserStatus, setCurrentUserStatus] = useState(null)
  const [workspace, setWorkspace] = useState(null)
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
  const [chatAttachment, setChatAttachment] = useState(null)
  const [replyingTo, setReplyingTo] = useState(null)
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
  const [addMemberData, setAddMemberData] = useState({ fullName: '', email: '', role: 'Member' })
  const [addMemberLoading, setAddMemberLoading] = useState(false)
  const [addMemberMessage, setAddMemberMessage] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 4. Documents State
  const [documents, setDocuments] = useState([])
  const [docFile, setDocFile] = useState(null)
  const [docTitle, setDocTitle] = useState('')
  const [docCategory, setDocCategory] = useState('')
  const [docIsPublic, setDocIsPublic] = useState(true)
  const [docViewerIds, setDocViewerIds] = useState([])
  const [editingAccessDocId, setEditingAccessDocId] = useState(null)
  const [editDocIsPublic, setEditDocIsPublic] = useState(true)
  const [editDocViewerIds, setEditDocViewerIds] = useState([])
  const [selectedDocVersions, setSelectedDocVersions] = useState([])
  const [selectedDocTitle, setSelectedDocTitle] = useState('')
  const [activeJitsiRoomId, setActiveJitsiRoomId] = useState(null)
  const [activeJitsiMeetingTitle, setActiveJitsiMeetingTitle] = useState('')

  // Jitsi Script Loading
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://meet.jit.si/external_api.js"
    script.async = true
    document.body.appendChild(script)
  }, [])

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
  const [meetingCountdown, setMeetingCountdown] = useState(null)
  const [editingMeetingId, setEditingMeetingId] = useState(null)
  const [editMeetingDate, setEditMeetingDate] = useState('')

  const parseMeetingDate = (dateStr) => new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'))

  useEffect(() => {
    const updateCountdown = () => {
      const scheduledMeetings = meetings.filter(m => m.status === 'scheduled');
      if (scheduledMeetings.length === 0) {
        setMeetingCountdown(null);
        return;
      }
      const closest = scheduledMeetings.reduce((prev, curr) => {
        return (parseMeetingDate(curr.scheduled_at) < parseMeetingDate(prev.scheduled_at)) ? curr : prev;
      });
      const diff = parseMeetingDate(closest.scheduled_at) - new Date();
      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setMeetingCountdown({ text: `Starts in ${h}h ${m}m ${s}s`, meeting: closest });
      } else {
        setMeetingCountdown({ text: "Meeting time arrived", meeting: closest });
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [meetings]);

  // 6. AI Brain State
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiQueryLoading, setAiQueryLoading] = useState(false)

  // 7. Presence and Typing State
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [typingUsers, setTypingUsers] = useState({}) // channel_id -> { user_id: timestamp }

  // 8. Message Edit State
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editMessageContent, setEditMessageContent] = useState('')

  // 9. Global Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ messages: [], tasks: [], users: [] })
  const [searchLoading, setSearchLoading] = useState(false)

  // Load User, Workspace memberships and Notifications on mount
  const selectedChannelRef = useRef(selectedChannel)
  
  useEffect(() => {
    selectedChannelRef.current = selectedChannel
  }, [selectedChannel])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    initWorkspace()
  }, [workspace_id])

  // Global Search Effect
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSearchResults({ messages: [], tasks: [], users: [] })
        return
      }
      setSearchLoading(true)
      try {
        const results = await api.workspaces.search(workspace_id, searchQuery)
        setSearchResults(results)
      } catch (err) {
        console.error("Search failed", err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [searchQuery, workspace_id])

  // Clear stale typing indicators every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now()
        let updated = { ...prev }
        let changed = false
        
        for (const [chanId, users] of Object.entries(prev)) {
          for (const [uid, timestamp] of Object.entries(users)) {
            if (now - timestamp > 3000) {
              const newUsers = { ...updated[chanId] }
              delete newUsers[uid]
              updated[chanId] = newUsers
              changed = true
            }
          }
        }
        return changed ? updated : prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Global Workspace WebSocket
  useEffect(() => {
    if (!workspace_id) return
    const token = localStorage.getItem('access_token')
    if (!token) return

    let socket = null;
    let pingInterval = null;
    let reconnectTimer = null;
    let isIntentionalClose = false;

    const connectWebSocket = () => {
      const wsUrl = api.chat.getWsUrl(workspace_id, token)
      socket = new WebSocket(wsUrl)
      
      socket.onopen = () => {
        // Start ping interval to keep connection alive (prevent Render proxy timeout)
        pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'PING' }))
          }
        }, 30000); // 30 seconds
      }

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === "PRESENCE_SYNC") {
          setOnlineUsers(new Set(data.online_users))
          return
        }
        
        if (data.type === "USER_ONLINE") {
          setOnlineUsers(prev => {
            const next = new Set(prev)
            next.add(data.user_id)
            return next
          })
          return
        }
        
        if (data.type === "USER_OFFLINE") {
          setOnlineUsers(prev => {
            const next = new Set(prev)
            next.delete(data.user_id)
            return next
          })
          return
        }

        if (data.type === "USER_TYPING") {
          setTypingUsers(prev => ({
            ...prev,
            [data.channel_id]: {
              ...prev[data.channel_id],
              [data.user_id]: Date.now()
            }
          }))
          return
        }

        if (data.type === "MESSAGE_EDITED") {
          const currentChannel = selectedChannelRef.current
          if (currentChannel && currentChannel.id === data.channel_id) {
            setMessages(prev => prev.map(m => m.id === data.message_id ? { ...m, content: data.content } : m))
          }
          return
        }

        if (data.type === "MESSAGE_DELETED") {
          const currentChannel = selectedChannelRef.current
          if (currentChannel && currentChannel.id === data.channel_id) {
            setMessages(prev => prev.filter(m => m.id !== data.message_id))
          }
          return
        }

        if (data.type === "WORKSPACE_UPDATE") {
          api.workspaces.members(workspace_id).then(members => {
            setWorkspaceMembers(members)
            // If the current user status changed, update it so they see the right screen
            api.auth.me().then(user => {
              const myMemberRecord = members.find(m => m.user_id === user.id)
              if (myMemberRecord) {
                setCurrentUserStatus(myMemberRecord.status)
                setCurrentUserRole(myMemberRecord.role)
              }
            }).catch(console.error)
          }).catch(console.error)
          return
        }

        // Standard Chat Message
        const newMsg = data
        const currentChannel = selectedChannelRef.current
        
        if (currentChannel && currentChannel.id === newMsg.channel_id) {
          setMessages(prev => {
            // Prevent duplicate messages in UI
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          })
          api.chat.markRead(workspace_id, currentChannel.id).catch(console.error)
        } else {
          setChannels(prev => prev.map(c => 
            c.id === newMsg.channel_id ? { ...c, unread_count: (c.unread_count || 0) + 1 } : c
          ))
        }
        
        fetchNotifications()
      }
      
      socket.onclose = () => {
        clearInterval(pingInterval);
        if (!isIntentionalClose) {
          // Auto-reconnect after 3 seconds
          reconnectTimer = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      }
      
      socketRef.current = socket
    }

    connectWebSocket();
    
    return () => {
      isIntentionalClose = true;
      clearInterval(pingInterval);
      clearTimeout(reconnectTimer);
      if (socket) socket.close();
    }
  }, [workspace_id])

  const initWorkspace = async () => {
    try {
      // Parallelize core data fetching
      const [user, wsDetails, members] = await Promise.all([
        api.auth.me(),
        api.workspaces.get(workspace_id),
        api.workspaces.members(workspace_id)
      ])
      
      setCurrentUser(user)
      setWorkspace(wsDetails)
      setWorkspaceMembers(members)
      const myMemberRecord = members.find(m => m.user_id === user.id)
      setCurrentUserRole(myMemberRecord?.role)
      setCurrentUserStatus(myMemberRecord?.status)
      
      // Fire secondary requests in the background
      fetchNotifications()
      loadDashboardTab()
      
      api.meetings.list(workspace_id).then(setMeetings).catch(console.error)
      
      api.workspaces.invitations(workspace_id).then(invs => {
        setPendingInvitations(invs)
        const joinCode = btoa(workspace_id).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        setInviteLink(`${window.location.origin}/join/${joinCode}`)
      }).catch(e => {})
      
    } catch (err) {
      console.error(err)
      router.push('/workspaces')
    } finally {
      setLoading(false)
    }
  }

  async function fetchNotifications() {
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

  const executeDeleteWorkspace = async () => {
    try {
      await api.workspaces.delete(workspace_id)
      router.push('/workspaces')
    } catch (err) {
      alert("Failed to delete workspace: " + err.message)
    }
  }

  // 2. Chat Loading & WebSocket
  const loadChatTab = async () => {
    try {
      const chans = await api.chat.channels(workspace_id)
      setChannels(chans)
      
      if (!selectedChannel && chans.length > 0) {
        const defaultChan = chans.find(c => !c.is_dm && !c.is_private) || chans[0]
        handleSelectChannel(defaultChan)
      }
    } catch (err) {
      console.error('Error loading channels:', err)
    }
  }

  const handleSelectChannel = async (channel) => {
    setSelectedChannel(channel)
    setReplyingTo(null)
    
    // Mark as read immediately when opening (fire and forget to prevent UI blocking)
    api.chat.markRead(workspace_id, channel.id)
      .then(() => setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, unread_count: 0 } : c)))
      .catch(err => console.error('Failed to mark channel read', err))
    
    // Fetch message history
    try {
      const msgHistory = await api.chat.messages(workspace_id, channel.id)
      setMessages(msgHistory)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendChat = async () => {
    if ((!chatInput.trim() && !chatAttachment) || !socketRef.current) return
    
    // Safety check: if socket is closed or connecting, prevent sending
    if (socketRef.current.readyState !== WebSocket.OPEN) {
      alert("Chat connection lost. Reconnecting... Please wait a moment and try again.");
      return;
    }

    if (chatAttachment) {
      const formData = new FormData()
      if (chatInput.trim()) formData.append('content', chatInput)
      formData.append('file', chatAttachment)
      if (replyingTo) formData.append('parent_id', replyingTo.id)
      
      try {
        await api.chat.uploadFile(workspace_id, selectedChannel.id, formData)
      } catch (err) {
        console.error('File upload failed', err)
      }
    } else {
      const payload = {
        content: chatInput,
        parent_id: replyingTo ? replyingTo.id : null,
        channel_id: selectedChannel.id
      }
      socketRef.current.send(JSON.stringify(payload))
    }
    setChatInput('')
    setChatAttachment(null)
    setReplyingTo(null)
  }

  const handleDeleteMessage = async (msgId) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await api.chat.deleteMessage(workspace_id, selectedChannel.id, msgId);
      // Wait for WS broadcast to actually remove it, or optimistically remove it:
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete message");
    }
  }

  const handleEditMessageSave = async () => {
    if (!editMessageContent.trim()) return;
    try {
      const updated = await api.chat.editMessage(workspace_id, selectedChannel.id, editingMessageId, editMessageContent);
      setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: updated.content } : m));
      setEditingMessageId(null);
      setEditMessageContent('');
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to edit message");
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

  const handleDeleteProject = async (projectId) => {
    if (!confirm("Are you sure you want to delete this project? All tasks inside will be permanently deleted!")) return;
    try {
      await api.projects.delete(workspace_id, projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setTasks([]);
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete project");
    }
  }

  const handleAddMemberDirect = async (e) => {
    e.preventDefault()
    
    if (!addMemberData.email.trim() || !addMemberData.fullName.trim()) return

    setAddMemberLoading(true)
    setAddMemberMessage('')
    setGeneratedPassword('')

    try {
      const res = await api.workspaces.addDirect(
        workspace_id, 
        addMemberData.fullName.trim(), 
        addMemberData.email.trim(), 
        addMemberData.role
      )
      setAddMemberMessage(`Successfully added! Please share the generated password with the user.`)
      setGeneratedPassword(res.generated_password)
      setAddMemberData({ fullName: '', email: '', role: 'Member' })
      
      const members = await api.workspaces.members(workspace_id)
      setWorkspaceMembers(members)
    } catch (err) {
      setAddMemberMessage(`Error: ${err.message || 'Failed to add member'}`)
    }

    setAddMemberLoading(false)
  }

  const handleApproveMember = async (userId) => {
    try {
      await api.workspaces.approveMember(workspace_id, userId)
      const members = await api.workspaces.members(workspace_id)
      setWorkspaceMembers(members)
    } catch (err) {
      alert(err.message || "Failed to approve member")
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!confirm('Are you sure you want to remove this member from the workspace? They will lose all access immediately.')) return;
    try {
      await api.workspaces.removeMember(workspace_id, userId)
      setWorkspaceMembers(workspaceMembers.filter(m => m.user_id !== userId))
    } catch (err) {
      alert(err.message)
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
    
    try {
      if (newTaskAssignee === 'all') {
        const newTasks = [];
        for (const member of workspaceMembers) {
          const created = await api.projects.createTask(workspace_id, selectedProject.id, newTaskTitle, newTaskDesc, 'To Do', member.user_id)
          newTasks.push(created)
        }
        setTasks([...tasks, ...newTasks])
      } else {
        const assignee = newTaskAssignee ? parseInt(newTaskAssignee) : null
        const created = await api.projects.createTask(workspace_id, selectedProject.id, newTaskTitle, newTaskDesc, 'To Do', assignee)
        setTasks([...tasks, created])
      }
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskAssignee('')
      alert('Task(s) added!')
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

  const handleTaskAssigneeChange = async (taskId, newAssigneeId) => {
    try {
      const assignee = newAssigneeId ? parseInt(newAssigneeId) : null;
      await api.projects.updateTaskAssignee(workspace_id, taskId, assignee)
      // Update local task state
      setTasks(tasks.map(t => t.id === taskId ? { ...t, assignee_id: assignee } : t))
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
      const uploaded = await api.documents.upload(workspace_id, docFile, docTitle, docCategory, docIsPublic, docViewerIds)
      setDocuments([uploaded, ...documents])
      setDocFile(null)
      setDocTitle('')
      setDocCategory('')
      setDocIsPublic(true)
      setDocViewerIds([])
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

  const handleUpdateAccess = async (docId) => {
    try {
      const updatedDoc = await api.documents.updateAccess(workspace_id, docId, editDocIsPublic, editDocViewerIds)
      setDocuments(documents.map(d => d.id === docId ? updatedDoc : d))
      setEditingAccessDocId(null)
      alert("Access updated successfully!")
    } catch (err) {
      alert(err.message)
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
      setNewMeetDate('')
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUpdateMeeting = async (meetId) => {
    try {
      const dateIso = new Date(editMeetingDate).toISOString()
      const updated = await api.meetings.update(workspace_id, meetId, dateIso)
      setMeetings(meetings.map(m => m.id === meetId ? updated : m))
      setEditingMeetingId(null)
    } catch (err) {
      alert(err.message)
    }
  }
  const handleStartMeeting = async (meetId) => {
    try {
      const updated = await api.meetings.startMeeting(workspace_id, meetId)
      setMeetings(meetings.map(m => m.id === meetId ? updated : m))
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEndMeeting = async (meetId) => {
    try {
      const updated = await api.meetings.endMeeting(workspace_id, meetId)
      setMeetings(meetings.map(m => m.id === meetId ? updated : m))
      setActiveJitsiRoomId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteMeeting = async (meetId) => {
    if (!window.confirm("Are you sure you want to delete this meeting?")) return
    try {
      await api.meetings.delete(workspace_id, meetId)
      setMeetings(meetings.filter(m => m.id !== meetId))
    } catch (err) {
      alert(err.message)
    }
  }

  useEffect(() => {
    let jitsiApi = null
    if (activeJitsiRoomId && window.JitsiMeetExternalAPI) {
        const domain = 'meet.jit.si'
        const options = {
            roomName: activeJitsiRoomId,
            width: '100%',
            height: '100%',
            parentNode: document.querySelector('#jitsi-container'),
            userInfo: {
                displayName: currentUser?.full_name || 'SynapseIQ User'
            },
            configOverwrite: {
                prejoinPageEnabled: false,
                disableDeepLinking: true
            },
            interfaceConfigOverwrite: {
                SHOW_PROMOTIONAL_CLOSE_PAGE: false,
                SHOW_JITSI_WATERMARK: false,
                SHOW_BRAND_WATERMARK: false
            }
        }
        jitsiApi = new window.JitsiMeetExternalAPI(domain, options)
    }
    return () => {
        if (jitsiApi) jitsiApi.dispose()
    }
  }, [activeJitsiRoomId, currentUser])

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

  if (currentUserStatus === 'Pending Approval') {
    return (
      <div className="min-h-screen bg-[var(--paper)] text-[#1a1a1a] flex flex-col items-center justify-center font-inter p-8">
        <div className="bg-white border-4 border-black p-10 max-w-lg w-full text-center shadow-[16px_16px_0_#1a1a1a]">
          <div className="w-16 h-16 bg-[var(--gold)] border-4 border-black mx-auto rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-space font-bold uppercase tracking-widest mb-4">Pending Approval</h1>
          <p className="text-sm font-medium mb-8">
            You have successfully logged in, but you are waiting for a Team Head to approve your access to <b>{workspace?.name}</b>.
            <br/><br/>
            Please wait or contact your administrator.
          </p>
          <button 
            onClick={() => router.push('/workspaces')}
            className="px-6 py-3 bg-black text-white font-bold text-sm uppercase tracking-wider hover:bg-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
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
          {meetingCountdown && (
            <div className="relative group cursor-help text-xs font-bold bg-yellow-400 text-black px-3 py-1 border-2 border-black shadow-[2px_2px_0_#1a1a1a] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse"></span>
              {meetingCountdown.text}
              
              <div className="absolute top-full mt-2 right-0 hidden group-hover:block w-[280px] bg-white border-2 border-black text-black p-3 z-50 shadow-[4px_4px_0_#1a1a1a] whitespace-normal pointer-events-none">
                 <p className="font-semibold text-[11px] mb-1">Team head has organised a meeting:</p>
                 <span className="font-extrabold text-[var(--gold)] bg-black px-1 mt-1 inline-block">{meetingCountdown.meeting.title}</span><br/>
                 <span className="font-bold text-[10px] uppercase block mt-1">{parseMeetingDate(meetingCountdown.meeting.scheduled_at).toLocaleString()}</span>
                 <hr className="border-black my-2" />
                 <span className="font-semibold text-[11px]">{meetingCountdown.text.includes('Starts in') ? `It will start in ${meetingCountdown.text.replace('Starts in ', '')}` : meetingCountdown.text}</span>
              </div>
            </div>
          )}
          <div className="flex gap-4">
            {/* Global Search Indicator */}
            <div className="relative cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => setIsSearchOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            
            {/* Notifications Indicator */}
            <div className="relative cursor-pointer hover:-translate-y-0.5 transition-transform" onClick={() => handleTabChange('notifications')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="black" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {bellCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center border border-black shadow-[2px_2px_0_#1a1a1a]">
                  {bellCount}
                </span>
              )}
            </div>
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
        <aside className="w-80 shrink-0 bg-[var(--paper)] border-r-2 border-black p-6 flex flex-col justify-between z-10 shadow-[4px_0px_0_rgba(0,0,0,0.05)]">
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

          <div className="mt-8 flex flex-col gap-4">
            <button
              onClick={() => router.push('/workspaces')}
              className="w-full py-3 border-2 border-black bg-[var(--paper-lift)] text-sm text-black font-bold shadow-[4px_4px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[4px_6px_0_#1a1a1a] transition-all"
            >
              &larr; Switch Workspace
            </button>

            {currentUserRole === 'Owner' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 border-2 border-red-900 bg-red-600 text-sm text-white font-bold uppercase tracking-widest shadow-[4px_4px_0_#7f1d1d] hover:-translate-y-0.5 hover:shadow-[4px_6px_0_#7f1d1d] transition-all"
              >
                Delete Workspace
              </button>
            )}
          </div>
        </aside>

        {/* Tab Content Window */}
        <main data-lenis-prevent="true" className="flex-grow p-10 overflow-y-auto bg-[var(--paper)]">
          
          {/* --- TAB A: DASHBOARD ANALYTICS --- */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-10 w-full">
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

              {(currentUserRole === 'Owner' || currentUserRole === 'Admin') && (
                <div className="p-8 bg-white border-2 border-black shadow-[8px_8px_0_#1a1a1a]">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                  <div className="max-w-md pt-2">
                    <h3 className="font-bold text-2xl font-space mb-2">Add Team Member</h3>
                    <p className="text-sm font-medium">
                      Add a new team member and instantly generate a secure 6-character password for them.
                    </p>
                  </div>

                  <div className="flex flex-col w-full lg:w-auto gap-4">
                    <div className="flex flex-col md:flex-row gap-4 md:items-end w-full">
                      <div className="flex flex-col gap-2 flex-grow">
                        <label className="text-xs font-bold uppercase tracking-wider">Full Name</label>
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          value={addMemberData.fullName}
                          onChange={(e) => setAddMemberData({...addMemberData, fullName: e.target.value})}
                          className="w-full px-4 py-3 bg-[var(--paper)] border-2 border-black text-sm font-medium focus:outline-none focus:bg-white transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-2 flex-grow">
                        <label className="text-xs font-bold uppercase tracking-wider">Company Email</label>
                        <input
                          type="email"
                          required
                          placeholder="teammate@company.com"
                          value={addMemberData.email}
                          onChange={(e) => setAddMemberData({...addMemberData, email: e.target.value})}
                          className="w-full px-4 py-3 bg-[var(--paper)] border-2 border-black text-sm font-medium focus:outline-none focus:bg-white transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider">Role</label>
                        <select
                          value={addMemberData.role}
                          onChange={(e) => setAddMemberData({...addMemberData, role: e.target.value})}
                          className="px-4 py-3 bg-[var(--paper)] border-2 border-black text-sm font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="Member">Member</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={handleAddMemberDirect}
                        disabled={addMemberLoading}
                        className="px-6 py-3 bg-[var(--gold)] border-2 border-black text-black font-bold text-sm uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all whitespace-nowrap"
                      >
                        {addMemberLoading ? 'Processing...' : 'Add Member & Generate Password'}
                      </button>
                    </div>
                  </div>
                </div>

                {addMemberMessage && (
                  <div className="mt-6 p-4 bg-[var(--paper-lift)] border-2 border-black shadow-[4px_4px_0_#1a1a1a]">
                    <p className="text-sm font-bold">{addMemberMessage}</p>
                    {generatedPassword && (
                      <div className="mt-4 p-4 bg-white border-2 border-black flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-black/60">Generated Password</span>
                        <div className="flex justify-between items-center">
                          <span className="font-space text-2xl tracking-widest font-bold text-[var(--danger)]">{generatedPassword}</span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(generatedPassword)}
                            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-gray-800"
                          >
                            Copy Password
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pending Approvals Section */}
                {workspaceMembers.filter(m => m.status === 'Pending Approval').length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Pending Approvals</h4>
                    <div className="flex flex-col gap-2">
                      {workspaceMembers.filter(m => m.status === 'Pending Approval').map(member => (
                        <div key={member.id} className="flex justify-between items-center p-4 bg-[var(--paper-lift)] border-2 border-black shadow-[4px_4px_0_#1a1a1a]">
                          <div className="flex flex-col gap-0.5">
                            <p className="font-bold text-sm">{member.full_name}</p>
                            <p className="font-medium text-black/60 text-xs">{member.email}</p>
                            <p className="text-[10px] uppercase tracking-wider text-yellow-600 font-bold mt-1">Pending Approval • {member.role}</p>
                          </div>
                          <button 
                            onClick={() => handleApproveMember(member.user_id)}
                            className="px-4 py-2 bg-[var(--gold)] border-2 border-black text-black text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a] transition-all"
                          >
                            Approve Access
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Members Section */}
                {workspaceMembers.filter(m => m.status === 'Active').length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-sm font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Active Team Members</h4>
                    <div className="flex flex-col gap-2">
                      {workspaceMembers.filter(m => m.status === 'Active').map(member => (
                        <div key={member.id} className="flex justify-between items-center p-4 bg-white border-2 border-black shadow-[4px_4px_0_#1a1a1a]">
                          <div className="flex flex-col gap-0.5">
                            <p className="font-bold text-sm flex items-center">
                              {member.full_name} 
                              {onlineUsers.has(member.user_id) ? (
                                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_1px_#000]" title="Online"></span>
                              ) : (
                                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-gray-300 shadow-[0_0_0_1px_#000]" title="Offline"></span>
                              )}
                            </p>
                            <p className="font-medium text-black/60 text-xs">{member.email}</p>
                            <p className="text-[10px] uppercase tracking-wider text-green-600 font-bold mt-1">Active • {member.role}</p>
                          </div>
                          {member.user_id !== currentUser?.id && (currentUserRole === 'Owner' || currentUserRole === 'Admin') && (
                            <button 
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-colors"
                            >
                              Remove Member
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )}

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
            <div className="flex h-full gap-6 overflow-hidden max-w-[1600px]">
              
              {/* Left Panel: Workspace Details */}
              <div className="w-1/5 bg-white border-2 border-black shadow-[6px_6px_0_#1a1a1a] p-6 flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-6">Workspace Details</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Name</div>
                    <div className="font-space font-bold text-xl leading-tight">{workspace?.name || 'Loading...'}</div>
                  </div>
                  {workspace?.description && (
                    <div>
                      <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Description</div>
                      <div className="text-sm font-medium leading-relaxed">{workspace.description}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-bold uppercase opacity-50 mb-1">Workspace ID</div>
                    <div className="text-xs font-mono bg-[var(--paper)] p-2 border-2 border-black">{workspace?.id || '...'}</div>
                  </div>
                </div>
              </div>

              {/* Middle Panel: Active Chat Feed */}
              <div className="flex-grow flex flex-col bg-white border-2 border-black shadow-[6px_6px_0_#1a1a1a] overflow-hidden">
                <div className="h-16 border-b-2 border-black px-6 flex items-center justify-between bg-[var(--paper-lift)]">
                  <span className="font-bold text-lg font-space tracking-tight">
                    {(() => {
                      if (selectedChannel?.is_dm) {
                        const otherUserId = selectedChannel.dm_user_1_id === currentUser?.id ? selectedChannel.dm_user_2_id : selectedChannel.dm_user_1_id;
                        const otherUser = workspaceMembers.find(m => m.user_id === otherUserId);
                        return otherUser ? `@ ${otherUser.full_name}` : '@ Personal Chat';
                      }
                      return '💬 Group Chat';
                    })()}
                  </span>
                  <span className="text-xs font-medium opacity-70">{selectedChannel?.description}</span>
                </div>

                {/* Messages Feed */}
                <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-6 bg-[var(--paper)]">
                  {messages.map((msg) => {
                    const isMe = currentUser && msg.sender_id === currentUser.id;
                    const senderName = isMe ? "You" : (workspaceMembers.find(m => m.user_id === msg.sender_id)?.full_name || `User #${msg.sender_id}`);
                    const msgDate = new Date(msg.created_at + (msg.created_at.endsWith('Z') ? '' : 'Z'));
                    
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col relative group max-w-[85%] ${
                          isMe ? 'self-end items-end' : 'self-start items-start'
                        }`}
                      >
                        <div 
                          className={`flex flex-col p-4 border-2 border-black shadow-[4px_4px_0_#1a1a1a] ${
                            isMe ? 'bg-white' : 'bg-white'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full text-[10px] font-bold uppercase tracking-wider mb-2 border-b-2 border-black/10 pb-2 gap-6">
                            <span className={isMe ? "text-[var(--primary)]" : "text-[var(--danger)]"}>{senderName}</span>
                            <span className="font-mono">{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          {/* Inline Reply Preview */}
                          {msg.parent_id && (
                            <div className="mb-3 p-2 bg-[var(--paper-lift)] border-l-4 border-[var(--gold)] text-xs border border-black/20 cursor-pointer hover:bg-[var(--gold)]/20 transition-colors">
                              <div className="font-bold uppercase tracking-wider text-[10px] mb-1 text-black/60">
                                Replying to {messages.find(m => m.id === msg.parent_id)?.sender_id === currentUser?.id ? "You" : "Message"}
                              </div>
                              <div className="truncate max-w-[250px] font-medium opacity-80">
                                {messages.find(m => m.id === msg.parent_id)?.content || "Attachment"}
                              </div>
                            </div>
                          )}

                          {msg.file_url && (
                            <div className={`mb-3 mt-1 ${isMe ? 'self-end' : 'self-start'}`}>
                              {msg.file_type?.startsWith('image/') ? (
                                <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${msg.file_url}`} alt={msg.file_name} className="max-w-xs max-h-64 object-cover border-2 border-black" />
                              ) : (
                                <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000'}${msg.file_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold hover:bg-black hover:text-white border-2 border-black bg-[var(--paper)] px-3 py-2 transition-colors">
                                  📎 {msg.file_name}
                                </a>
                              )}
                            </div>
                          )}

                          {editingMessageId === msg.id ? (
                            <div className="mt-2 w-full flex flex-col gap-2">
                              <input 
                                type="text"
                                value={editMessageContent}
                                onChange={e => setEditMessageContent(e.target.value)}
                                className="w-full px-2 py-1 text-sm border-2 border-black focus:outline-none bg-[var(--paper-lift)] text-black"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => { setEditingMessageId(null); setEditMessageContent(''); }} className="text-[10px] font-bold uppercase hover:underline">Cancel</button>
                                <button onClick={handleEditMessageSave} className="text-[10px] font-bold uppercase text-[var(--primary)] hover:underline">Save</button>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-sm font-medium leading-relaxed whitespace-pre-wrap break-words ${isMe ? 'text-right' : 'text-left'}`}>
                              {msg.content}
                            </p>
                          )}
                        </div>

                        {/* Hover Actions: Reply, Edit, Delete */}
                        <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 ${isMe ? '-left-20' : '-right-20'}`}>
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="px-2 py-1 bg-[var(--gold)] border-2 border-black shadow-[2px_2px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                            title="Reply"
                          >
                            Reply
                          </button>
                          
                          {(isMe || currentUserRole === 'Owner' || currentUserRole === 'Admin') && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="px-2 py-1 bg-[var(--danger)] text-white border-2 border-black shadow-[2px_2px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                              title="Delete"
                            >
                              Delete
                            </button>
                          )}

                          {isMe && (
                            <button
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setEditMessageContent(msg.content);
                              }}
                              className="px-2 py-1 bg-[var(--paper)] border-2 border-black shadow-[2px_2px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                              title="Edit"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Typing Indicator */}
                  {selectedChannel && typingUsers[selectedChannel.id] && Object.keys(typingUsers[selectedChannel.id]).length > 0 && (
                    <div className="self-start text-[10px] font-bold uppercase tracking-widest text-[var(--gold)] bg-black px-3 py-1 animate-pulse border border-black shadow-[2px_2px_0_#1a1a1a]">
                      {Object.keys(typingUsers[selectedChannel.id])
                        .filter(uid => parseInt(uid) !== currentUser?.id)
                        .map(uid => workspaceMembers.find(m => m.user_id === parseInt(uid))?.full_name || "Someone")
                        .join(", ")} {Object.keys(typingUsers[selectedChannel.id]).filter(uid => parseInt(uid) !== currentUser?.id).length > 1 ? 'are' : 'is'} typing...
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="border-t-2 border-black bg-[var(--paper-lift)] flex flex-col">
                  {replyingTo && (
                    <div className="px-6 py-2 border-b-2 border-[var(--gold)] flex justify-between items-center bg-[var(--paper)] text-xs font-bold">
                      <span className="truncate">Replying to: {replyingTo.content || "Attachment"}</span>
                      <button onClick={() => setReplyingTo(null)} className="text-[var(--danger)] hover:underline ml-4">Cancel</button>
                    </div>
                  )}
                  {chatAttachment && (
                    <div className="px-6 py-2 border-b-2 border-black/10 flex justify-between items-center bg-white text-xs font-bold">
                      <span>📎 Attached: {chatAttachment.name}</span>
                      <button onClick={() => setChatAttachment(null)} className="text-[var(--danger)] hover:underline">Remove</button>
                    </div>
                  )}
                  <div className="h-20 px-6 flex items-center gap-4">
                    <label className="cursor-pointer px-4 py-3 bg-white border-2 border-black font-bold hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a] transition-all flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => setChatAttachment(e.target.files[0])}
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Message..."
                      value={chatInput}
                      onChange={(e) => {
                        setChatInput(e.target.value)
                        // Emit typing indicator
                        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && selectedChannel) {
                          socketRef.current.send(JSON.stringify({
                            type: "USER_TYPING",
                            channel_id: selectedChannel.id
                          }))
                        }
                      }}
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
              </div>

              {/* Right Panel: Members & Group Chat Navigation */}
              {(
                <div className="w-1/4 bg-white border-2 border-black shadow-[6px_6px_0_#1a1a1a] p-5 flex flex-col overflow-y-auto">
                  <h3 className="text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Group Chat</h3>
                  
                  <div className="flex flex-col gap-2 mb-6">
                    {/* Group Chat Button */}
                    {channels.filter(c => !c.is_dm && !c.is_private).map(chan => (
                      <button
                        key={chan.id}
                        onClick={() => handleSelectChannel(chan)}
                        className={`w-full py-3 px-4 border-2 border-black text-sm font-bold text-left transition-all flex items-center justify-between ${selectedChannel?.id === chan.id ? 'bg-black text-white shadow-[2px_2px_0_var(--gold)] translate-x-1' : 'bg-[var(--paper-lift)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a]'}`}
                      >
                        <span>💬 Group Chat</span>
                        {chan.unread_count > 0 && (
                          <span className="bg-[var(--danger)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0_#000]">{chan.unread_count}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <h3 className="text-xs font-bold uppercase tracking-widest border-b-2 border-black pb-2 mb-4">Personal Chat</h3>
                  <div className="flex flex-col gap-2">
                    {workspaceMembers.filter(m => {
                      if (m.user_id === currentUser?.id) return false;
                      if (currentUserRole === 'Owner' || currentUserRole === 'Admin') return true;
                      return m.role === 'Owner';
                    }).map(member => {
                      // Find the DM channel for this member using robust ID matching
                      const dmChannel = channels.find(c => 
                        c.is_dm && 
                        (c.dm_user_1_id === member.user_id || c.dm_user_2_id === member.user_id)
                      );
                      
                      const isTeamHead = member.role === 'Owner';
                      const displayName = isTeamHead ? `@ ${member.full_name} (Team Head)` : `@ ${member.full_name}`;
                      const unreadCount = dmChannel?.unread_count || 0;

                      return (
                        <button
                          key={member.user_id}
                          onClick={() => {
                            if (dmChannel) handleSelectChannel(dmChannel);
                            else alert('DM channel not yet initialized for this member.');
                          }}
                          className={`w-full py-3 px-4 border-2 border-black text-sm font-bold text-left transition-all flex items-center justify-between ${selectedChannel?.id === dmChannel?.id ? 'bg-black text-white shadow-[2px_2px_0_var(--gold)] translate-x-1' : 'bg-white hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a]'}`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {onlineUsers.has(member.user_id) ? (
                              <span className="inline-block w-2 h-2 rounded-full bg-green-500 shadow-[0_0_0_1px_#000] flex-shrink-0" title="Online"></span>
                            ) : (
                              <span className="inline-block w-2 h-2 rounded-full bg-gray-400 shadow-[0_0_0_1px_#000] flex-shrink-0" title="Offline"></span>
                            )}
                            <span className="truncate">{displayName}</span>
                            {unreadCount > 0 && (
                              <span className="bg-[var(--danger)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0_#000] flex-shrink-0">{unreadCount}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono px-2 py-1 bg-[var(--paper)] text-black border border-black flex-shrink-0">{member.role}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* --- TAB C: PROJECTS & KANBAN --- */}
          {activeTab === 'projects' && (
            <div className="flex flex-col gap-10 min-h-full max-w-[1600px] pb-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-space font-bold border-b-4 border-black pb-4">Sprint Manager</h2>
                  {selectedProject && (
                    <div className="flex items-center gap-4 mt-4">
                      <span className="text-sm font-bold uppercase tracking-wider inline-block bg-[var(--gold)] border-2 border-black px-3 py-1 shadow-[2px_2px_0_#1a1a1a]">Active Project: {selectedProject.name}</span>
                      {(currentUserRole === 'Owner' || currentUserRole === 'Admin') && (
                        <button 
                          onClick={() => handleDeleteProject(selectedProject.id)}
                          className="px-3 py-1 bg-[#ff4a4a] text-white border-2 border-black text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a] transition-all"
                        >
                          Delete Project
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Project Creator Form */}
                {(currentUserRole === 'Owner' || currentUserRole === 'Admin') && (
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
                )}
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

              {/* Task Add Form */}
              {(currentUserRole === 'Owner' || currentUserRole === 'Admin') && selectedProject && (
                <form onSubmit={handleCreateTask} className="p-8 bg-[var(--paper-lift)] border-2 border-black shadow-[8px_8px_0_#1a1a1a] flex flex-col lg:flex-row gap-6 items-end mb-6">
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
                      <option value="all">All Members</option>
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

              {/* Kanban board layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-grow">
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
                        {columnTasks.map((t) => {
                          const assignedMember = workspaceMembers.find(m => m.user_id === t.assignee_id);
                          return (
                          <div key={t.id} className="p-4 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(0,0,0,1)] transition-transform flex flex-col gap-3">
                            <h4 className="font-bold text-sm">{t.title}</h4>
                            <p className="text-xs font-medium leading-relaxed opacity-80">{t.description}</p>
                            {(currentUserRole === 'Owner' || currentUserRole === 'Admin') ? (
                              <div className="mt-1 self-start">
                                <select 
                                  value={t.assignee_id || ""} 
                                  onChange={(e) => handleTaskAssigneeChange(t.id, e.target.value)}
                                  className="text-[10px] font-bold tracking-wider uppercase bg-[var(--paper)] p-2 border-2 border-black focus:outline-none cursor-pointer"
                                >
                                  <option value="">Unassigned</option>
                                  {workspaceMembers.map(m => (
                                    <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="text-[10px] font-bold tracking-wider uppercase mt-1 bg-[var(--paper)] p-2 border-2 border-black self-start">
                                Assigned to: {assignedMember ? assignedMember.full_name : 'Unassigned'}
                              </div>
                            )}
                            
                            {/* Simple Status Toggler buttons */}
                            {(currentUserRole === 'Owner' || currentUserRole === 'Admin' || t.assignee_id === currentUser?.id) && (
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
                            )}
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>


            </div>
          )}

          {/* --- TAB D: DOCUMENT STORAGE --- */}
          {activeTab === 'documents' && (
            <div className="flex flex-col gap-10 max-w-[1400px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-black pb-4">
                <h2 className="text-4xl font-space font-bold">Document Library</h2>
                
                {/* Upload Form (Visible to everyone) */}
                <form onSubmit={handleDocUpload} className="flex flex-col gap-4 bg-white border-2 border-black p-4 shadow-[6px_6px_0_#1a1a1a]">
                  <div className="flex flex-wrap gap-4 items-center">
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
                    
                    <select
                      value={docIsPublic ? "public" : "restricted"}
                      onChange={(e) => setDocIsPublic(e.target.value === "public")}
                      className="px-4 py-2 bg-[var(--paper)] border-2 border-black text-sm font-bold focus:outline-none focus:bg-white cursor-pointer"
                    >
                      <option value="public">Visibility: Public</option>
                      <option value="restricted">Visibility: Restricted</option>
                    </select>

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
                  </div>
                  
                  {/* Restricted Viewers Checklist */}
                  {!docIsPublic && (
                    <div className="flex flex-wrap gap-3 mt-2 pt-4 border-t-2 border-dashed border-black/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider self-center">Grant access to:</span>
                      {workspaceMembers.filter(m => m.user_id !== currentUser?.id).map(m => (
                        <label key={m.user_id} className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={docViewerIds.includes(m.user_id)}
                            onChange={(e) => {
                              if (e.target.checked) setDocViewerIds([...docViewerIds, m.user_id])
                              else setDocViewerIds(docViewerIds.filter(id => id !== m.user_id))
                            }}
                            className="w-4 h-4 accent-black border-2 border-black"
                          />
                          {m.full_name}
                        </label>
                      ))}
                    </div>
                  )}
                </form>
              </div>

              {/* Grid document layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Documents list */}
                <div className="flex flex-col gap-5">
                  <h3 className="font-bold text-lg font-space uppercase tracking-widest border-b-2 border-black pb-2">Stored Documents</h3>
                  <div className="flex flex-col gap-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex flex-col border-2 border-black bg-white shadow-[4px_4px_0_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(0,0,0,1)] transition-transform">
                        <div
                          onClick={() => viewDocVersions(doc)}
                          className="p-5 flex justify-between items-center cursor-pointer"
                        >
                          <div>
                            <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                              {!doc.is_public && <span title="Restricted Document">🔒</span>}
                              {doc.title}
                            </h4>
                            <span className="text-[10px] font-bold tracking-widest border-2 border-black bg-[var(--paper)] px-2 py-0.5 uppercase mt-2 inline-block">Category: {doc.category}</span>
                          </div>
                          <span className="text-xs text-black font-black bg-[var(--gold)] border-2 border-black px-3 py-1 shadow-[2px_2px_0_#1a1a1a]">Ver. {doc.current_version} &rarr;</span>
                        </div>
                        
                        {(currentUserRole === 'Owner' || currentUserRole === 'Admin' || currentUser?.id === doc.creator_id) && (
                          <div className="border-t-2 border-black p-3 bg-[var(--paper-lift)] flex flex-col gap-3">
                            {editingAccessDocId === doc.id ? (
                              <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-bold uppercase tracking-wider">Edit Access</span>
                                  <button 
                                    onClick={() => setEditingAccessDocId(null)} 
                                    className="px-3 py-1 bg-white border-2 border-black text-[10px] font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a] transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <select
                                  value={editDocIsPublic ? "public" : "restricted"}
                                  onChange={(e) => setEditDocIsPublic(e.target.value === "public")}
                                  className="px-2 py-1 bg-white border-2 border-black text-xs font-bold"
                                >
                                  <option value="public">Public</option>
                                  <option value="restricted">Restricted</option>
                                </select>
                                {!editDocIsPublic && (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    {workspaceMembers.filter(m => m.user_id !== currentUser?.id).map(m => (
                                      <label key={m.user_id} className="flex items-center gap-1 text-[10px] font-bold cursor-pointer">
                                        <input 
                                          type="checkbox" 
                                          checked={editDocViewerIds.includes(m.user_id)}
                                          onChange={(e) => {
                                            if (e.target.checked) setEditDocViewerIds([...editDocViewerIds, m.user_id])
                                            else setEditDocViewerIds(editDocViewerIds.filter(id => id !== m.user_id))
                                          }}
                                          className="w-3 h-3 accent-black"
                                        />
                                        {m.full_name}
                                      </label>
                                    ))}
                                  </div>
                                )}
                                <button 
                                  onClick={() => handleUpdateAccess(doc.id)} 
                                  className="mt-3 self-start px-6 py-2 bg-black text-white border-2 border-black text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all"
                                >
                                  Save Changes
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setEditingAccessDocId(doc.id)
                                  setEditDocIsPublic(doc.is_public)
                                  setEditDocViewerIds(doc.viewer_ids || [])
                                }}
                                className="self-start px-4 py-2 bg-[var(--gold)] text-black border-2 border-black text-[10px] font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all shadow-[2px_2px_0_#1a1a1a]"
                              >
                                Edit Access
                              </button>
                            )}
                          </div>
                        )}
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
                          
                          <div className="flex gap-2">
                            <a
                              href={api.documents.getViewUrl(workspace_id, ver.document_id, ver.version_number)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-white text-black border-2 border-black text-[10px] font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all whitespace-nowrap"
                            >
                              View
                            </a>
                            <a
                              href={api.documents.getDownloadUrl(workspace_id, ver.document_id, ver.version_number)}
                              className="px-4 py-2 bg-[var(--gold)] text-black border-2 border-black text-[10px] font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all whitespace-nowrap"
                              download
                            >
                              Download
                            </a>
                          </div>
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
                {(currentUserRole === 'Owner' || currentUserRole === 'Admin') && (
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
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Meetings List */}
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-lg font-space uppercase tracking-widest border-b-2 border-black pb-2 mb-2">Meetings Feed</h3>
                  {meetings.map((meet) => (
                    <div key={meet.id} className="p-5 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:-translate-y-1 hover:shadow-[6px_6px_0_rgba(0,0,0,1)] transition-transform">
                      <div>
                        <h4 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                          {meet.status === 'scheduled' && <span className="w-2 h-2 rounded-full bg-yellow-500"></span>}
                          {meet.status === 'in_progress' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                          {meet.status === 'completed' && <span className="w-2 h-2 rounded-full bg-gray-500"></span>}
                          {meet.title}
                        </h4>
                        <div className="flex gap-2 items-center mt-2">
                          <span className="text-[10px] font-bold tracking-widest border-2 border-black bg-[var(--paper)] px-2 py-0.5 uppercase inline-block">{parseMeetingDate(meet.scheduled_at).toLocaleString()}</span>
                          <span className="text-[10px] font-bold uppercase text-gray-500">{meet.status.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        {meet.status === 'scheduled' && (
                          (currentUserRole === 'Owner' || currentUserRole === 'Admin') ? (
                            editingMeetingId === meet.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="datetime-local"
                                  value={editMeetingDate}
                                  onChange={(e) => setEditMeetingDate(e.target.value)}
                                  className="px-2 py-1 text-xs border-2 border-black focus:outline-none"
                                />
                                <button
                                  onClick={() => handleUpdateMeeting(meet.id)}
                                  className="px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-wider border-2 border-black"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingMeetingId(null)}
                                  className="px-3 py-1.5 bg-gray-200 text-black text-[10px] font-bold uppercase tracking-wider border-2 border-black"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartMeeting(meet.id)}
                                  disabled={new Date() < parseMeetingDate(meet.scheduled_at)}
                                  className={`px-4 py-2 text-black border-2 border-black text-[10px] font-bold uppercase tracking-wider transition-all ${new Date() < parseMeetingDate(meet.scheduled_at) ? 'bg-gray-300 opacity-50 cursor-not-allowed' : 'bg-[var(--gold)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a]'}`}
                                >
                                  Start Meeting
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMeetingId(meet.id)
                                    const d = parseMeetingDate(meet.scheduled_at);
                                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                                    setEditMeetingDate(d.toISOString().slice(0, 16));
                                  }}
                                  className="px-4 py-2 bg-white text-black border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider transition-all"
                                >
                                  Reschedule
                                </button>
                              </>
                            )
                          ) : (
                            <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                              Waiting for Host
                            </div>
                          )
                        )}

                        {meet.status === 'in_progress' && (
                          <>
                            <button
                              onClick={() => {
                                setActiveJitsiRoomId(meet.jitsi_room_id)
                                setActiveJitsiMeetingTitle(meet.title)
                              }}
                              className="px-4 py-2 bg-black text-white border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                              Join Meeting
                            </button>
                            {(currentUserRole === 'Owner' || currentUserRole === 'Admin') && (
                              <button
                                onClick={() => handleEndMeeting(meet.id)}
                                className="px-4 py-2 bg-red-600 text-white border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider transition-all"
                              >
                                End Meeting
                              </button>
                            )}
                          </>
                        )}

                        {meet.status === 'completed' && (
                          <>
                            <button
                              onClick={() => setSelectedMeeting(meet)}
                              className="px-4 py-2 bg-[var(--paper)] border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                              Add Meeting Notes
                            </button>
                            <button
                              onClick={() => handleTriggerSummary(meet)}
                              className="px-4 py-2 bg-[var(--gold)] text-black border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                              AI Summary
                            </button>
                          </>
                        )}
                        
                        {(currentUserRole === 'Owner' || currentUserRole === 'Admin') && meet.status === 'scheduled' && (
                          <button
                            onClick={() => handleDeleteMeeting(meet.id)}
                            className="px-4 py-2 bg-white text-red-600 border-2 border-red-600 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#dc2626] text-[10px] font-bold uppercase tracking-wider transition-all"
                            title="Delete Meeting"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Area: Transcripts & AI Summaries */}
                <div className="flex flex-col gap-8">
                  {/* Selected Meeting Transcript Upload */}
                  {selectedMeeting && (
                    <div className="p-8 bg-[var(--paper-lift)] border-2 border-black shadow-[8px_8px_0_#1a1a1a]">
                      <h4 className="font-bold text-lg font-space uppercase tracking-widest mb-4 border-b-2 border-black pb-2">Add Meeting Notes for: {selectedMeeting.title}</h4>
                      <form onSubmit={handleUploadTranscript} className="flex flex-col gap-4">
                        <textarea
                          rows="5"
                          required
                          placeholder="Type or paste meeting notes/transcript here..."
                          value={transcriptText}
                          onChange={(e) => setTranscriptText(e.target.value)}
                          className="w-full p-4 bg-white border-2 border-black text-sm font-medium focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="w-fit px-8 py-3 bg-black text-white border-2 border-black text-xs font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--gold)] transition-all"
                        >
                          Save Notes
                        </button>
                      </form>
                    </div>
                  )}

                  {/* AI Summarization result */}
                  <div className="p-8 bg-[var(--paper-lift)] border-2 border-black shadow-[8px_8px_0_#1a1a1a]">
                    <h3 className="font-bold text-lg font-space uppercase tracking-widest border-b-2 border-black pb-3 mb-5">SynapseIQ AI Intelligence Report</h3>
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
                <div className="flex items-center gap-6">
                  <button onClick={() => handleTabChange('dashboard')} className="p-2 border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] bg-white transition-all" title="Back to Dashboard">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-4xl font-space font-bold">In-App Notifications</h2>
                    <p className="text-sm font-medium mt-2">Recipients feed triggered by Chat @mentions</p>
                  </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0_#1a1a1a] max-w-lg w-full p-8 flex flex-col gap-6">
            <h2 className="text-3xl font-space font-bold text-red-600 uppercase tracking-wide">Delete Project Room?</h2>
            <div className="bg-red-50 border-l-4 border-red-600 p-4">
              <p className="text-sm font-bold text-red-900 leading-relaxed">
                Are you sure you want to permanently delete this project room? 
                <br /><br />
                If done, <span className="underline">no data</span> can be recovered afterward. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 bg-white text-black border-2 border-black font-bold text-sm uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteWorkspace}
                className="px-6 py-3 bg-red-600 text-white border-2 border-black font-bold text-sm uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#7f1d1d] transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[var(--paper)] border-4 border-black shadow-[16px_16px_0_#1a1a1a] max-w-4xl w-full flex flex-col max-h-[85vh]">
            <div className="p-6 border-b-4 border-black flex justify-between items-center bg-[var(--gold)]">
              <h2 className="text-2xl font-space font-bold uppercase tracking-widest text-black">Global Search</h2>
              <button onClick={() => setIsSearchOpen(false)} className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all font-bold">
                ✕
              </button>
            </div>
            
            <div className="p-6 border-b-4 border-black bg-white">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-4 top-1/2 -translate-y-1/2 text-black/50">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Search messages, tasks, and users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-white border-4 border-black text-lg font-bold placeholder-black/30 focus:outline-none focus:ring-4 focus:ring-[var(--gold)]/50 transition-all shadow-[4px_4px_0_#1a1a1a]"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-8 bg-[var(--paper-lift)]">
              {searchLoading ? (
                <div className="text-center py-12 font-bold uppercase tracking-widest text-black/50 animate-pulse">
                  Searching the matrix...
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <div className="text-center py-12 font-bold uppercase tracking-widest text-black/50">
                  Type at least 2 characters to search
                </div>
              ) : (
                <>
                  {/* Users Results */}
                  {searchResults.users?.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-lg font-space font-bold uppercase tracking-widest border-b-4 border-black pb-2 inline-block self-start">Team Members</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults.users.map(u => (
                          <div key={u.id} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0_#1a1a1a] hover:-translate-y-1 transition-transform">
                            <div className="font-bold text-lg">{u.full_name}</div>
                            <div className="text-xs font-mono opacity-70 mt-1">{u.email}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tasks Results */}
                  {searchResults.tasks?.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-lg font-space font-bold uppercase tracking-widest border-b-4 border-black pb-2 inline-block self-start">Tasks</h3>
                      <div className="flex flex-col gap-3">
                        {searchResults.tasks.map(t => (
                          <div key={t.id} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0_#1a1a1a] flex justify-between items-center hover:-translate-y-1 transition-transform">
                            <span className="font-bold text-sm">{t.title}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 border border-black shadow-[2px_2px_0_#000] ${t.status === 'Done' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--gold)] text-black'}`}>
                              {t.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages Results */}
                  {searchResults.messages?.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <h3 className="text-lg font-space font-bold uppercase tracking-widest border-b-4 border-black pb-2 inline-block self-start">Messages</h3>
                      <div className="flex flex-col gap-3">
                        {searchResults.messages.map(m => {
                          const msgDate = new Date(m.created_at + (m.created_at.endsWith('Z') ? '' : 'Z'));
                          return (
                            <div key={m.id} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0_#1a1a1a] flex flex-col gap-2 hover:-translate-y-1 transition-transform">
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider border-b-2 border-black/10 pb-2">
                                <span className="text-[var(--primary)]">User #{m.sender_id}</span>
                                <span className="font-mono">{msgDate.toLocaleDateString()} {msgDate.toLocaleTimeString()}</span>
                              </div>
                              <p className="text-sm font-medium whitespace-pre-wrap">{m.content || "Attachment"}</p>
                              <div className="mt-2 text-[10px] font-bold bg-black text-[var(--gold)] inline-block self-start px-2 py-1 shadow-[2px_2px_0_var(--gold)]">
                                In Channel #{m.channel_id}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {searchResults.messages?.length === 0 && searchResults.tasks?.length === 0 && searchResults.users?.length === 0 && (
                    <div className="text-center py-12 font-bold uppercase tracking-widest text-[var(--danger)]">
                      No results found for &quot;{searchQuery}&quot;
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* JITSI MODAL */}
      {activeJitsiRoomId && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="p-4 bg-[var(--gold)] border-b-4 border-black flex justify-between items-center z-[101] shadow-[0_4px_0_#1a1a1a]">
            <h2 className="font-space font-bold text-xl uppercase tracking-widest text-black">{activeJitsiMeetingTitle || 'Meeting In Progress'}</h2>
            <button 
              onClick={() => setActiveJitsiRoomId(null)}
              className="px-6 py-2 bg-white text-black border-2 border-black font-bold uppercase tracking-wider hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] transition-all"
            >
              Leave Meeting Room
            </button>
          </div>
          <div id="jitsi-container" className="flex-grow w-full h-full bg-black"></div>
        </div>
      )}
    </div>
  )
}
