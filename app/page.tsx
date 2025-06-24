'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Zap, Target, Upload, CheckCircle, MoreVertical, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
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

export default function TEATracker() {
  const [energy, setEnergy] = useState(3) // Default to Steady
  const [attention, setAttention] = useState('focused') // Default to Focused
  const [note, setNote] = useState('')
  const [, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, setShowSuccess] = useState(false)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [noteLength, setNoteLength] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  
  const router = useRouter()
  const isAuthenticated = !!user

  const MAX_NOTE_LENGTH = 100
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const ITEMS_PER_PAGE = 10

  // Energy levels with past tense labels - moved up to avoid hoisting issues
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

  // Check authentication status and load logs
  useEffect(() => {
    const supabase = createClient()
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load logs based on authentication status
  useEffect(() => {
    const supabase = createClient()
    
    const loadLogs = async () => {
      if (isAuthenticated && user) {
        // Load from Supabase for authenticated users
        const { data, error } = await supabase
          .from('tea_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error loading logs:', error)
          // Fallback to localStorage
          const savedLogs = localStorage.getItem('tea-logs')
          if (savedLogs) {
            setLogs(JSON.parse(savedLogs))
          }
        } else {
          // Transform Supabase data to match our LogEntry interface
          const transformedLogs: LogEntry[] = data.map((log: Record<string, unknown>) => ({
            id: log.id as string,
            timestamp: log.timestamp as string,
            energy: log.energy as number,
            energyLabel: energyLevels.find(l => l.value === (log.energy as number))?.label || '',
            attention: log.attention as string,
            note: log.note as string | null,
            imagePreview: log.image_url as string | null
          }))
          setLogs(transformedLogs)
        }
      } else {
        // Load from localStorage for non-authenticated users
        const savedLogs = localStorage.getItem('tea-logs')
        if (savedLogs) {
          setLogs(JSON.parse(savedLogs))
        }
      }
    }

    loadLogs()
  }, [isAuthenticated, user])

  // Attention states with consistent tense
  const attentionStates = [
    { value: 'scattered', label: 'Scattered', emoji: '🌪️' },
    { value: 'focused', label: 'Focused', emoji: '💡' },
    { value: 'hyperfocused', label: 'Hyperfocused', emoji: '🎯' }
  ]

  // Celebration animations
  const celebrations: Celebration[] = [
    { emoji: '🦄', message: 'Magical tracking!' },
    { emoji: '🌟', message: 'You\'re a star!' },
    { emoji: '🎉', message: 'Way to go!' },
    { emoji: '🌈', message: 'Rainbow power!' },
    { emoji: '⚡', message: 'Lightning tracker!' },
    { emoji: '🔥', message: 'On fire!' },
    { emoji: '💫', message: 'Stellar job!' },
    { emoji: '🏆', message: 'Champion logger!' }
  ]

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    if (text.length <= MAX_NOTE_LENGTH) {
      setNote(text)
      setNoteLength(text.length)
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

    try {
      if (isAuthenticated && user) {
        // Save to Supabase for authenticated users
        const supabase = createClient()
        const { error } = await supabase
          .from('tea_logs')
          .insert({
            user_id: user.id,
            timestamp: newLog.timestamp,
            energy: newLog.energy,
            attention: newLog.attention,
            note: newLog.note,
            image_url: newLog.imagePreview
          })

        if (error) {
          console.error('Error saving to Supabase:', error)
          // Fallback to localStorage
          const updatedLogs = [newLog, ...logs]
          setLogs(updatedLogs)
          localStorage.setItem('tea-logs', JSON.stringify(updatedLogs))
        } else {
          // Successfully saved to Supabase, add to local state
          const updatedLogs = [newLog, ...logs]
          setLogs(updatedLogs)
        }
      } else {
        // Save to localStorage for non-authenticated users
        const updatedLogs = [newLog, ...logs]
        setLogs(updatedLogs)
        localStorage.setItem('tea-logs', JSON.stringify(updatedLogs))
      }

      // Reset to first page when new entry is added
      setCurrentPage(1)

      setIsSubmitting(false)
      setShowSuccess(true)

      // Show random celebration
      const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)]
      setCelebration(randomCelebration)

      // Reset form (but keep defaults)
      setEnergy(3)
      setAttention('focused')
      setNote('')
      setNoteLength(0)
      setImage(null)
      setImagePreview(null)

      // Hide success message after animation
      setTimeout(() => {
        setShowSuccess(false)
        setCelebration(null)
      }, 3000)
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      setIsSubmitting(false)
      alert('Error saving entry. Please try again.')
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setShowMenu(false)
    router.push('/')
  }

  const handleSignUpClick = () => {
    router.push('/auth/sign-up')
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-safe">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main Tracker Card */}
        <div className="w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6 space-y-4 sm:space-y-6 relative">
          {/* Header */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Track
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Time · Energy · Attention
            </p>
          </div>

          {/* Three dots menu for logged in users */}
          {isAuthenticated && (
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
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
          )}

          {/* Energy Level */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
              <Zap className="w-3 sm:w-4 h-3 sm:h-4" />
              Energy Level
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
            <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700">
              <Target className="w-3 sm:w-4 h-3 sm:h-4" />
              Attention Quality
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

          {/* Optional Context */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs sm:text-sm font-medium text-gray-700">
              <span>Context (optional)</span>
              <span className="text-[10px] text-gray-400">{noteLength}/{MAX_NOTE_LENGTH}</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={handleNoteChange}
              placeholder="What were you just doing?"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900 dark:bg-white dark:text-gray-900"
            />
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
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover rounded"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded">
                        <span className="text-white text-sm">Tap to change</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-5 sm:w-6 h-5 sm:h-6 text-gray-400" />
                    <span className="text-[10px] text-gray-400 mt-1 group-hover:text-gray-600">Screenshot (optional)</span>
                  </div>
                )}
              </label>
            </div>
          </div>

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
                Track TEA
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

        {/* Recent Logs - New Layout */}
        {logs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">TEA Tracks</h2>
            <div className="space-y-2">
              {currentLogs.map((log) => {
                const logEnergy = energyLevels.find(l => l.value === log.energy)
                const logAttention = attentionStates.find(a => a.value === log.attention)
                return (
                  <div key={log.id} className="bg-white rounded-lg shadow-sm p-3 flex gap-3 min-h-[100px]">
                    {/* Left side - Text content stacked vertically */}
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] text-gray-400">{formatTimestamp(log.timestamp)}</span>
                      <div className="text-sm">
                        <span>{logEnergy?.icon} {logEnergy?.label}</span>
                      </div>
                      <div className="text-sm">
                        <span>{logAttention?.emoji} {logAttention?.label}</span>
                      </div>
                      {log.note && (
                        <p className="text-xs text-gray-600">{log.note}</p>
                      )}
                    </div>
                    
                    {/* Right side - Image if exists */}
                    {log.imagePreview && (
                      <div 
                        className="w-16 h-16 relative rounded cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setExpandedImage(log.imagePreview)}
                      >
                        <Image
                          src={log.imagePreview}
                          alt="Log screenshot"
                          fill
                          className="object-cover rounded"
                        />
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

            {/* Auth CTA - Only for non-authenticated users */}
            {!isAuthenticated && logs.length > 0 && (
              <div className="text-center py-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-3">
                  {logs.length > ITEMS_PER_PAGE 
                    ? `Sign up to view all ${logs.length} tracks and unlock full history browsing`
                    : "Sign up to save your logs permanently and unlock analytics (soon™)"
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={handleSignUpClick}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all font-medium"
                  >
                    Sign Up
                  </button>
                  <button 
                    onClick={() => router.push('/auth/login')}
                    className="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 shadow-md hover:shadow-lg transform hover:scale-105 transition-all font-medium"
                  >
                    Log In
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
              <Image
                src={expandedImage}
                alt="Expanded screenshot"
                width={800}
                height={600}
                className="object-contain"
              />
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2"
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
