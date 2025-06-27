'use client'

import { useState, useEffect } from 'react'
import { Upload, CheckCircle, MoreVertical, LogOut, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Edit3, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

// Type definitions
interface LogEntry {
  id: string
  timestamp: string
  energy: number
  energyLabel: string
  attention: string
  note: string | null
  imagePreview: string | null
}

interface Celebration {
  emoji: string
  message: string
}

interface StreakData {
  dailiesCount: number // Current day's track count (1-8)
  dayCount: number // Number of consecutive days
  weekCount: number // Number of consecutive weeks
  monthCount: number // Number of consecutive months
  yearCount: number // Number of consecutive years
  currentTier: number // Current exponent tier (1-8)
  lastLogDate: string | null
  streakStartDate: string | null
}

export default function TEATracker() {
  const [energy, setEnergy] = useState(3) // Default to Steady
  const [attention, setAttention] = useState('focused') // Default to Focused
  const [note, setNote] = useState('')
  const [, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, setShowSuccess] = useState(false)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [, setUser] = useState<User | null>(null)
  const [, setIsLoading] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showMenu, setShowMenu] = useState(false)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [streakData, setStreakData] = useState<StreakData>({
    dailiesCount: 0,
    dayCount: 0,
    weekCount: 0,
    monthCount: 0,
    yearCount: 0,
    currentTier: 1,
    lastLogDate: null,
    streakStartDate: null
  })
  const [isSimplifiedMode, setIsSimplifiedMode] = useState(false)
  const [editingTimestamp, setEditingTimestamp] = useState<string | null>(null)
  const [editTimestampValue, setEditTimestampValue] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const MAX_NOTE_LENGTH = 100
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const ITEMS_PER_PAGE = 10

  // Energy levels with past tense labels
  const energyLevels = [
    { value: 1, label: 'Exhausted', icon: '🪫', color: '#ef4444' },
    { value: 2, label: 'Drained', icon: '☕', color: '#f97316' },
    { value: 3, label: 'Steady', icon: '🔋', color: '#eab308' },
    { value: 4, label: 'Energized', icon: '✨', color: '#84cc16' },
    { value: 5, label: 'Peaked', icon: '🚀', color: '#22c55e' }
  ]

  // Pagination calculations
  const totalPages = Math.ceil(logs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentLogs = isAuthenticated ? logs.slice(startIndex, endIndex) : logs.slice(0, ITEMS_PER_PAGE)
  const showPagination = isAuthenticated && logs.length > ITEMS_PER_PAGE

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Enhanced exponential streak calculation
  const calculateStreakFromLogs = (logs: LogEntry[]): StreakData => {
    if (logs.length === 0) {
      return {
        dailiesCount: 0,
        dayCount: 0,
        weekCount: 0,
        monthCount: 0,
        yearCount: 0,
        currentTier: 1,
        lastLogDate: null,
        streakStartDate: null
      }
    }

    // Sort logs by date (newest first)
    const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    // Group logs by date and count dailies per day
    const logsByDate = new Map<string, number>()
    sortedLogs.forEach(log => {
      const dateKey = new Date(log.timestamp).toDateString()
      logsByDate.set(dateKey, (logsByDate.get(dateKey) || 0) + 1)
    })

    // Get sorted unique dates
    const uniqueDates = Array.from(logsByDate.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    
    if (uniqueDates.length === 0) {
      return {
        dailiesCount: 0,
        dayCount: 0,
        weekCount: 0,
        monthCount: 0,
        yearCount: 0,
        currentTier: 1,
        lastLogDate: null,
        streakStartDate: null
      }
    }

    const now = new Date()
    const today = now.toDateString()
    const gracePeriod = new Date(now.getTime() - 36 * 60 * 60 * 1000).toDateString() // 36 hours ago

    // Check if we're within grace period
    const latestDate = uniqueDates[0]
    const isWithinGracePeriod = latestDate === today || new Date(latestDate) >= new Date(gracePeriod)

    if (!isWithinGracePeriod) {
      return {
        dailiesCount: 0,
        dayCount: 0,
        weekCount: 0,
        monthCount: 0,
        yearCount: 0,
        currentTier: 1,
        lastLogDate: sortedLogs[0].timestamp,
        streakStartDate: null
      }
    }

    // Calculate current day's dailies count
    const todayCount = logsByDate.get(today) || 0
    const latestDayCount = logsByDate.get(latestDate) || 0
    const dailiesCount = Math.min(todayCount > 0 ? todayCount : latestDayCount, 8)

    // Calculate consecutive days and current tier
    let dayCount = 0
    let currentTier = 1
    let streakStartDate: string | null = null
    let currentDayTier = 1

    // Find consecutive days and track tier consistency
    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i])
      const dailiesForDay = Math.min(logsByDate.get(uniqueDates[i]) || 0, 8)
      
      if (i === 0) {
        // First day sets the initial tier
        currentDayTier = dailiesForDay
        dayCount = 1
        streakStartDate = uniqueDates[i]
      } else {
        // Check if this day is consecutive (within 36 hours)
        const prevDate = new Date(uniqueDates[i-1])
        const timeDiff = prevDate.getTime() - currentDate.getTime()
        const daysDiff = timeDiff / (24 * 60 * 60 * 1000)
        
        if (daysDiff <= 1.5) { // Within 36 hours
          dayCount++
          streakStartDate = uniqueDates[i]
          
          // Update tier based on minimum consistent level
          if (dailiesForDay < currentDayTier) {
            currentDayTier = dailiesForDay
          }
        } else {
          break
        }
      }
    }

    currentTier = Math.max(currentDayTier, 1)

    // Calculate weeks, months, years
    const weekCount = Math.floor(dayCount / 7)
    const monthCount = Math.floor(weekCount / 4)
    const yearCount = Math.floor(monthCount / 12)

    return {
      dailiesCount,
      dayCount,
      weekCount,
      monthCount,
      yearCount,
      currentTier,
      lastLogDate: sortedLogs[0].timestamp,
      streakStartDate
    }
  }

  // Initialize authentication and load data
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        setIsAuthenticated(true)
      }
      
      setIsLoading(false)
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
        setIsLoading(false)
      }
    )

    initializeAuth()

    // Load logs and calculate streaks from localStorage
    const savedLogs = localStorage.getItem('tea-logs')
    if (savedLogs) {
      const parsedLogs = JSON.parse(savedLogs)
      setLogs(parsedLogs)
      
      // Calculate and set streak data
      const calculatedStreaks = calculateStreakFromLogs(parsedLogs)
      setStreakData(calculatedStreaks)
    }

    // Load simplified mode preference
    const simplifiedMode = localStorage.getItem('tea-simplified-mode')
    if (simplifiedMode === 'true') {
      setIsSimplifiedMode(true)
    }

    // Cleanup subscription
    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Toggle simplified mode and save preference
  const toggleSimplifiedMode = () => {
    const newMode = !isSimplifiedMode
    setIsSimplifiedMode(newMode)
    localStorage.setItem('tea-simplified-mode', newMode.toString())
  }

  // Attention states with consistent tense
  const attentionStates = [
    { value: 'scattered', label: 'Scattered', emoji: '🌪️' },
    { value: 'focused', label: 'Focused', emoji: '💡' },
    { value: 'hyperfocused', label: 'Hyperfocused', emoji: '🎯' }
  ]

  // Enhanced celebration system with variety and context
  const getCelebration = (): Celebration => {
    const basicCelebrations: Celebration[] = [
      { emoji: '🦄', message: 'Magical tracking!' },
      { emoji: '🌟', message: 'You\'re a star!' },
      { emoji: '🎉', message: 'Way to go!' },
      { emoji: '🌈', message: 'Rainbow power!' },
      { emoji: '⚡', message: 'Lightning tracker!' },
      { emoji: '🔥', message: 'On fire!' },
      { emoji: '💫', message: 'Stellar job!' },
      { emoji: '🏆', message: 'Champion logger!' },
      { emoji: '✨', message: 'Sparkling progress!' },
      { emoji: '🎯', message: 'Right on target!' },
      { emoji: '🚀', message: 'Blast off!' },
      { emoji: '💎', message: 'Precious moment!' },
      { emoji: '🌺', message: 'Blooming beautifully!' },
      { emoji: '🎪', message: 'Amazing show!' },
      { emoji: '🎨', message: 'Masterpiece!' }
    ]

    const streakCelebrations: Celebration[] = [
      { emoji: '🔥', message: 'Streak master!' },
      { emoji: '💪', message: 'Consistency champion!' },
      { emoji: '🎯', message: 'Bullseye habits!' },
      { emoji: '⭐', message: 'Stellar streak!' },
      { emoji: '🏅', message: 'Dedication medal!' },
      { emoji: '🌟', message: 'Shining bright!' },
      { emoji: '💫', message: 'Cosmic consistency!' },
      { emoji: '🎊', message: 'Celebration time!' }
    ]

    const energyCelebrations: Celebration[] = [
      { emoji: '⚡', message: 'Electric energy!' },
      { emoji: '🌞', message: 'Sunshine vibes!' },
      { emoji: '🔋', message: 'Fully charged!' },
      { emoji: '✨', message: 'Sparkling spirit!' },
      { emoji: '🌈', message: 'Colorful energy!' },
      { emoji: '🎈', message: 'Floating high!' },
      { emoji: '🦋', message: 'Light as air!' },
      { emoji: '🌸', message: 'Fresh energy!' }
    ]

    const focusCelebrations: Celebration[] = [
      { emoji: '🎯', message: 'Laser focused!' },
      { emoji: '🔍', message: 'Sharp attention!' },
      { emoji: '💡', message: 'Bright mind!' },
      { emoji: '🧠', message: 'Brain power!' },
      { emoji: '🎪', message: 'Center stage!' },
      { emoji: '🎨', message: 'Creative focus!' },
      { emoji: '🔬', message: 'Scientific precision!' },
      { emoji: '🎵', message: 'In the zone!' }
    ]

    const encouragingCelebrations: Celebration[] = [
      { emoji: '🤗', message: 'You did it!' },
      { emoji: '👏', message: 'Well done!' },
      { emoji: '🙌', message: 'Fantastic!' },
      { emoji: '💝', message: 'Gift to yourself!' },
      { emoji: '🌻', message: 'Growing strong!' },
      { emoji: '🦄', message: 'Uniquely you!' },
      { emoji: '🎁', message: 'Present moment!' },
      { emoji: '💖', message: 'Self-care win!' }
    ]

    // Choose celebration type based on context
    if (streakData.dayCount >= 7) {
      return streakCelebrations[Math.floor(Math.random() * streakCelebrations.length)]
    } else if (energy >= 4) {
      return energyCelebrations[Math.floor(Math.random() * energyCelebrations.length)]
    } else if (attention === 'hyperfocused') {
      return focusCelebrations[Math.floor(Math.random() * focusCelebrations.length)]
    } else if (Math.random() < 0.3) {
      return encouragingCelebrations[Math.floor(Math.random() * encouragingCelebrations.length)]
    } else {
      return basicCelebrations[Math.floor(Math.random() * basicCelebrations.length)]
    }
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    if (text.length <= MAX_NOTE_LENGTH) {
      setNote(text)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        alert('Please upload an image file (JPEG, PNG, GIF, or WebP)')
        return
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        alert('File size must be less than 5MB')
        return
      }

      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async () => {
    // Simple client-side rate limiting
    const lastSubmit = localStorage.getItem('last-tea-submit')
    const now = Date.now()
    if (lastSubmit && now - parseInt(lastSubmit) < 5000) { // 5 seconds
      alert('Please wait a few seconds before logging another entry')
      return
    }
    localStorage.setItem('last-tea-submit', now.toString())

    setIsSubmitting(true)

    const selectedEnergy = energyLevels.find(l => l.value === energy)
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      energy: energy,
      energyLabel: selectedEnergy?.label || '',
      attention: attention,
      note: note || null,
      imagePreview: imagePreview,
    }

    // Save to logs
    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem('tea-logs', JSON.stringify(updatedLogs))

    // Update streak data
    const updatedStreaks = calculateStreakFromLogs(updatedLogs)
    setStreakData(updatedStreaks)

    // Reset to first page when new entry is added
    setCurrentPage(1)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setShowSuccess(true)

      // Show contextual celebration
      const contextualCelebration = getCelebration()
      setCelebration(contextualCelebration)

      // Reset form (but keep defaults)
      setEnergy(3)
      setAttention('focused')
      setNote('')
      setImage(null)
      setImagePreview(null)

      // Hide success message after animation
      setTimeout(() => {
        setShowSuccess(false)
        setCelebration(null)
      }, 3000)
    }, 500)
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      
      // Clear all user-specific localStorage data for security on shared devices
      localStorage.removeItem('tea-logs')
      localStorage.removeItem('last-tea-submit')
      localStorage.removeItem('tea-simplified-mode')
      
      // Reset local state
      setLogs([])
      setStreakData({
        dailiesCount: 0,
        dayCount: 0,
        weekCount: 0,
        monthCount: 0,
        yearCount: 0,
        currentTier: 1,
        lastLogDate: null,
        streakStartDate: null
      })
      setIsSimplifiedMode(false)
      setCurrentPage(1)
      
      setShowMenu(false)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleLogin = () => {
    router.push('/auth/login')
  }

  const handleSignUp = () => {
    router.push('/auth/sign-up')
  }

  // Timestamp editing handlers
  const startEditingTimestamp = (logId: string, currentTimestamp: string) => {
    setEditingTimestamp(logId)
    // Format for datetime-local input
    const date = new Date(currentTimestamp)
    const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setEditTimestampValue(localDateTime)
  }

  const saveTimestampEdit = (logId: string) => {
    if (!editTimestampValue) return

    // Prevent future timestamps
    const newTimestamp = new Date(editTimestampValue)
    const now = new Date()
    if (newTimestamp > now) {
      alert('Cannot set a future timestamp')
      return
    }

    const updatedLogs = logs.map(log => 
      log.id === logId 
        ? { ...log, timestamp: newTimestamp.toISOString() }
        : log
    )
    
    setLogs(updatedLogs)
    localStorage.setItem('tea-logs', JSON.stringify(updatedLogs))
    
    // Recalculate streaks after timestamp change
    const updatedStreaks = calculateStreakFromLogs(updatedLogs)
    setStreakData(updatedStreaks)
    
    setEditingTimestamp(null)
    setEditTimestampValue('')
  }

  const cancelTimestampEdit = () => {
    setEditingTimestamp(null)
    setEditTimestampValue('')
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    if (isYesterday) {
      return 'Yesterday'
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const formatFullDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-safe">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main Tracker Card */}
        <div className="w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="space-y-2">
            {/* Row 1: Action Bar - Track, Log In, Sign Up with identical heights */}
            <div className="flex justify-between items-center">
              {/* Left side - Track title with streak */}
              <div className="flex items-center gap-3 h-10">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Track
                </h1>
                {streakData.dayCount > 0 && (
                  <div className="flex items-center gap-2">
                    {/* Dailies count */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                      <span className="text-sm">🔥</span>
                      <span className="text-xs font-semibold text-orange-700">
                        {streakData.dailiesCount}
                      </span>
                    </div>
                    
                    {/* Days with exponent */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full">
                      <span className="text-sm">📅</span>
                      <span className="text-xs font-semibold text-blue-700">
                        {streakData.dayCount}
                        {streakData.currentTier > 1 && (
                          <sup className="text-[8px]">{streakData.currentTier}</sup>
                        )}
                      </span>
                    </div>
                    
                    {/* Weeks with exponent (if any) */}
                    {streakData.weekCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                        <span className="text-sm">📊</span>
                        <span className="text-xs font-semibold text-green-700">
                          {streakData.weekCount}
                          {streakData.currentTier > 1 && (
                            <sup className="text-[8px]">{streakData.currentTier}</sup>
                          )}
                        </span>
                      </div>
                    )}
                    
                    {/* Months with exponent (if any) */}
                    {streakData.monthCount > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
                        <span className="text-sm">🏆</span>
                        <span className="text-xs font-semibold text-purple-700">
                          {streakData.monthCount}
                          {streakData.currentTier > 1 && (
                            <sup className="text-[8px]">{streakData.currentTier}</sup>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right side - Auth section */}
              {isAuthenticated ? (
                <div className="relative flex items-center h-10">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 h-10">
                  <button 
                    onClick={handleLogin}
                    className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium px-2 py-2"
                  >
                    Log In
                  </button>
                  <button 
                    onClick={handleSignUp}
                    className="px-4 sm:px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all font-medium text-xs sm:text-sm whitespace-nowrap"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: Descriptive Text - Balanced visual weight */}
            {!isAuthenticated && (
              <div className="flex justify-between items-start">
                {/* Left side - Subtitle with increased line height for visual balance */}
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    Time · Energy · Attention
                  </p>
                </div>

                {/* Right side - Sign up description aligned under Sign Up button */}
                <div className="text-right ml-4" style={{ width: '140px' }}>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    Sign up to save your logs
                  </p>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    unlock analytics (soon™)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Energy Level */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700">
              How was your energy?
            </label>
            <div className="grid grid-cols-5 gap-0.5 sm:gap-2">
              {energyLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setEnergy(level.value)}
                  className={`p-1 sm:p-3 rounded-lg border-2 transition-all ${energy === level.value
                      ? 'border-indigo-500 bg-indigo-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="text-base sm:text-2xl mb-0 sm:mb-1">{level.icon}</div>
                  <div className="text-[9px] sm:text-xs font-medium leading-none">{level.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Attention Quality */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700">
              How was your attention?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {attentionStates.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setAttention(option.value)}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all ${attention === option.value
                    ? 'border-indigo-500 bg-indigo-50 scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="text-xl sm:text-2xl mb-0.5 sm:mb-1">{option.emoji}</div>
                  <div className="text-xs sm:text-sm font-medium">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Simplified Mode Toggle */}
          <div className="flex justify-center">
            <button
              onClick={toggleSimplifiedMode}
              className="flex items-center gap-2 px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isSimplifiedMode ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Show details</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Quick mode</span>
                </>
              )}
            </button>
          </div>

          {/* Collapsible Optional Sections */}
          {!isSimplifiedMode && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Optional Context */}
              <div className="space-y-1">
                <input
                  type="text"
                  value={note}
                  onChange={handleNoteChange}
                  placeholder="What were you just doing?"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                />
                <div className="flex justify-end">
                  <span className="text-[10px] text-gray-400">{note.length}/{MAX_NOTE_LENGTH}</span>
                </div>
              </div>

              {/* Image Upload - Minimal */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors group"
                  >
                    {imagePreview ? (
                      <div className="relative w-full">
                        <div className="relative w-full h-24 sm:h-32">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover rounded"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded">
                            <span className="text-white text-sm">Tap to change</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-5 sm:w-6 h-5 sm:h-6 text-gray-400" />
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button - Always enabled */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full py-2.5 sm:py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${
              isSubmitting
                ? 'bg-indigo-400 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 transform hover:scale-105'
              }`}
          >
            {isSubmitting ? (
              <>Processing...</>
            ) : (
              <>
                <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                Track it
              </>
            )}
          </button>

          {/* Celebration Animation */}
          {celebration && (
            <>
              <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                {/* Main emoji sliding across */}
                <div
                  className="absolute text-6xl sm:text-8xl animate-slide-across"
                  style={{ top: '20%' }}
                >
                  {celebration.emoji}
                </div>

                {/* Trailing sparkles */}
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-2xl sm:text-4xl animate-sparkle"
                    style={{
                      animationDelay: `${i * 0.2}s`,
                      left: `${10 + i * 15}%`,
                      top: `${15 + i * 10}%`,
                    }}
                  >
                    ✨
                  </div>
                ))}

                {/* Message bouncing in center */}
                <div className="absolute inset-0 flex items-center justify-center px-4">
                  <div
                    className="text-xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 animate-bounce-in text-center"
                  >
                    {celebration.message}
                  </div>
                </div>

                {/* Confetti particles */}
                {[...Array(10)].map((_, i) => (
                  <div
                    key={`confetti-${i}`}
                    className="absolute text-lg sm:text-2xl animate-confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: '-10%',
                      animationDelay: `${Math.random() * 1}s`,
                    }}
                  >
                    {['🎊', '🎉', '⭐', '💫'][Math.floor(Math.random() * 4)]}
                  </div>
                ))}
              </div>

              <style jsx global>{`
                @keyframes animate-slide-across {
                  0% {
                    left: -100px;
                    transform: rotate(0deg) scale(0.5);
                  }
                  50% {
                    transform: rotate(180deg) scale(1.5);
                  }
                  100% {
                    left: 100%;
                    transform: rotate(360deg) scale(1);
                  }
                }
                
                .animate-slide-across {
                  animation: animate-slide-across 3s ease-out forwards;
                }
                
                @keyframes animate-sparkle {
                  0% {
                    opacity: 0;
                    transform: scale(0) rotate(0deg);
                  }
                  50% {
                    opacity: 1;
                    transform: scale(1) rotate(180deg);
                  }
                  100% {
                    opacity: 0;
                    transform: scale(0) rotate(360deg) translateY(100px);
                  }
                }
                
                .animate-sparkle {
                  animation: animate-sparkle 1.5s ease-out forwards;
                }
                
                @keyframes animate-bounce-in {
                  0% {
                    opacity: 0;
                    transform: scale(0.3);
                  }
                  50% {
                    opacity: 1;
                    transform: scale(1.05);
                  }
                  70% {
                    transform: scale(0.9);
                  }
                  100% {
                    opacity: 1;
                    transform: scale(1);
                  }
                }
                
                .animate-bounce-in {
                  animation: animate-bounce-in 1s ease-out forwards;
                  animation-delay: 0.5s;
                  opacity: 0;
                }
                
                @keyframes animate-confetti {
                  0% {
                    opacity: 1;
                    transform: translateY(0) rotate(0deg);
                  }
                  100% {
                    opacity: 0;
                    transform: translateY(800px) rotate(720deg);
                  }
                }
                
                .animate-confetti {
                  animation: animate-confetti 2s ease-out forwards;
                }
              `}</style>
            </>
          )}
        </div>

        {/* Recent Logs - Clean ADHD-Friendly Layout */}
        {logs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">History</h2>
            <div className="space-y-3">
              {currentLogs.map((log) => {
                const logEnergy = energyLevels.find(l => l.value === log.energy)
                const logAttention = attentionStates.find(a => a.value === log.attention)
                const isEditing = editingTimestamp === log.id
                
                return (
                  <div key={log.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    {/* Date Header - Clean and Consistent */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                      <span className="text-sm font-medium text-gray-700">
                        {formatFullDate(log.timestamp)} • {formatTimestamp(log.timestamp)}
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="datetime-local"
                            value={editTimestampValue}
                            onChange={(e) => setEditTimestampValue(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                          <button
                            onClick={() => saveTimestampEdit(log.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={cancelTimestampEdit}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditingTimestamp(log.id, log.timestamp)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Content - Vertically Stacked for Better Alignment */}
                    <div className="flex gap-4">
                      {/* Main Content - Fixed Height for Consistency */}
                      <div className="flex-1 min-h-[60px] flex items-center">
                        <div className="space-y-2 w-full">
                          {/* Energy */}
                          <div className="flex items-center gap-3">
                            <span className="text-xl w-6 text-center">{logEnergy?.icon}</span>
                            <span className="text-sm font-medium text-gray-700">{logEnergy?.label}</span>
                          </div>
                          
                          {/* Attention */}
                          <div className="flex items-center gap-3">
                            <span className="text-xl w-6 text-center">{logAttention?.emoji}</span>
                            <span className="text-sm font-medium text-gray-700">{logAttention?.label}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Image - Fixed Size for Consistency */}
                      <div className="flex-shrink-0 w-16 h-16">
                        {log.imagePreview ? (
                          <div 
                            className="w-full h-full relative rounded cursor-pointer hover:opacity-90 transition-opacity border border-gray-200 overflow-hidden"
                            onClick={() => setExpandedImage(log.imagePreview)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={log.imagePreview}
                              alt="Log screenshot"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full"></div>
                        )}
                      </div>
                    </div>

                    {/* Note - Only if Present, Consistent Spacing */}
                    {log.note && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <p className="text-sm text-gray-600 italic">{log.note}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Pagination Controls - Only for authenticated users */}
            {showPagination && (
              <div className="flex items-center justify-between py-4">
                <div className="text-xs text-gray-500">
                  Showing {startIndex + 1}-{Math.min(endIndex, logs.length)} of {logs.length} tracks
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Expanded Image Modal */}
        {expandedImage && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={expandedImage}
                alt="Expanded screenshot"
                className="max-w-full max-h-full object-contain"
              />
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
