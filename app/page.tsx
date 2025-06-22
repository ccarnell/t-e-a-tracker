'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Camera, Brain, Zap, Target, Upload, CheckCircle, /*LogOut, LogIn, UserPlus */ } from 'lucide-react'
// We'll add Supabase integration later
// import { createClient } from '@/utils/supabase/client'

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
  const [energy, setEnergy] = useState(0)
  const [attention, setAttention] = useState('')
  const [note, setNote] = useState('')
  const [, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, setShowSuccess] = useState(false)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const [isAuthenticated] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [noteLength, setNoteLength] = useState(0)

  const MAX_NOTE_LENGTH = 100
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  // Load logs from localStorage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('tea-logs')
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs))
    }
  }, [])

  // Energy levels with icons and colors - Fixed alignment
  const energyLevels = [
    { value: 1, label: 'Exhausted', icon: '🪫', color: '#ef4444' },
    { value: 2, label: 'Low', icon: '☕', color: '#f97316' },
    { value: 3, label: 'Moderate', icon: '🔋', color: '#eab308' },
    { value: 4, label: 'Good', icon: '✨', color: '#84cc16' },
    { value: 5, label: 'Peak', icon: '🚀', color: '#22c55e' }
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
    if (!energy || !attention) {
      alert('Please select both energy level and attention quality')
      return
    }

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

    // Save to localStorage if not authenticated
    if (!isAuthenticated) {
      localStorage.setItem('tea-logs', JSON.stringify(updatedLogs))
    }

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setShowSuccess(true)

      // Show random celebration
      const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)]
      setCelebration(randomCelebration)

      // Reset form
      setEnergy(0)
      setAttention('')
      setNote('')
      setNoteLength(0)
      setImage(null)
      setImagePreview(null)

      // Hide success message after animation
      setTimeout(() => {
        setShowSuccess(false)
        setCelebration(null)
      }, 3000)
    }, 500)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const today = new Date()
    const isToday = date.toDateString() === today.toDateString()

    if (isToday) {
      return `Today at ${date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })}`
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-safe">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main Tracker Card */}
        <div className="w-full bg-white rounded-2xl shadow-lg p-4 sm:p-6 space-y-4 sm:space-y-6 relative">
          {/* Header and Auth in a flex container */}
          <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3 sm:gap-0 mb-6">
            {/* Header */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Brain className="w-5 sm:w-6 h-5 sm:h-6 text-indigo-600" />
                Minimal T.E.A.
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Simply track <span className="font-semibold">T</span>ime, <span className="font-semibold">E</span>nergy and <span className="font-semibold">A</span>ttention patterns
              </p>
            </div>

            {/* Auth Buttons */}
            <div className="flex gap-2 self-end sm:self-start">
              {/* AUTH */}
            </div>
          </div>

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
              {[
                { value: 'scattered', label: 'Scattered', emoji: '🌪️' },
                { value: 'focused', label: 'Focused', emoji: '💡' },
                { value: 'hyperfocus', label: 'Hyperfocus', emoji: '🎯' }
              ].map((option) => (
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

          {/* Optional Note */}
          <div className="space-y-2">
            <label className="flex items-center justify-between text-xs sm:text-sm font-medium text-gray-700">
              <span>Text & Visual Context <em>(Optional)</em></span>
              <span className="text-xs text-gray-400">{noteLength}/{MAX_NOTE_LENGTH}</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={handleNoteChange}
              placeholder="What are you working on?"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900 dark:bg-white dark:text-gray-900"
            />
          </div>

          {/* Image Upload */}
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
                className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
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
                        <Camera className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
                    <span className="text-xs sm:text-sm text-gray-600">Upload screenshot (max 5MB)</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !energy || !attention}
            className={`w-full py-2.5 sm:py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm sm:text-base ${!energy || !attention
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : isSubmitting
                ? 'bg-indigo-400 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 transform hover:scale-105'
              }`}
          >
            {isSubmitting ? (
              <>Processing...</>
            ) : (
              <>
                <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                Log Entry
              </>
            )}
          </button>

          {/* Timestamp - move to bottom and make smaller on mobile */}
          <div className="text-center text-[10px] sm:text-xs text-gray-400 mt-4">
            {formatTimestamp(new Date().toISOString())}
          </div>

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

        {/* Recent Logs */}
        {logs.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Recent Logs</h2>
            <div className="space-y-3">
              {logs.slice(0, 20).map((log) => {
                const logEnergy = energyLevels.find(l => l.value === log.energy)
                return (
                  <div key={log.id} className="bg-white rounded-lg shadow p-3 sm:p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="text-xs sm:text-sm text-gray-500">{formatTimestamp(log.timestamp)}</span>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <span className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm text-gray-600">Energy:</span>
                          <span className="text-xs sm:text-sm font-medium" style={{ color: logEnergy?.color || '#000' }}>
                            {log.energyLabel}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm text-gray-600">Attention:</span>
                          <span className="text-xs sm:text-sm font-medium capitalize">{log.attention}</span>
                        </span>
                      </div>
                    </div>
                    {log.note && (
                      <p className="text-xs sm:text-sm text-gray-700">{log.note}</p>
                    )}
                    {log.imagePreview && (
                      <div className="relative w-full h-24 sm:h-32">
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
            {!isAuthenticated && logs.length > 0 && (
              <div className="text-center py-4">
                <p className="text-xs sm:text-sm text-gray-600 mb-2">Sign up to save your logs permanently. <i>And unlock analytics (soon<sup>TM</sup>)</i></p>
                <button className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all font-medium">
                  Sign Up to Save History
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}