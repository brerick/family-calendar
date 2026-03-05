'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function HouseholdSetupForm() {
  const searchParams = useSearchParams()
  const inviteParam = searchParams.get('invite')
  
  const [mode, setMode] = useState(inviteParam ? 'join' : 'create') // 'create' or 'join'
  const [householdName, setHouseholdName] = useState('')
  const [inviteToken, setInviteToken] = useState(inviteParam || '')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [autoJoining, setAutoJoining] = useState(false)
  const router = useRouter()

  // Check if user is authenticated when arriving with invite link
  useEffect(() => {
    const checkAuth = async () => {
      if (inviteParam) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          // Redirect to signup with invite token preserved
          router.push(`/auth/signup?invite=${inviteParam}`)
          return
        } else {
          // User is authenticated with invite - auto-attempt to join
          setAutoJoining(true)
          await attemptAutoJoin(inviteParam)
          setAutoJoining(false)
        }
      }
      setCheckingAuth(false)
    }
    
    checkAuth()
  }, [inviteParam, router])

  const attemptAutoJoin = async (token) => {
    try {
      console.log('Auto-joining with token:', token)
      
      const response = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()
      console.log('Auto-join response:', { status: response.status, data })

      if (response.ok) {
        // Success! Redirect to dashboard
        router.push('/dashboard')
        router.refresh()
      } else {
        // Failed - let user try manually or see error
        setError(data.error || 'Could not automatically join. Please try again.')
      }
    } catch (err) {
      console.error('Auto-join error:', err)
      setError('Could not automatically join. Please try again.')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create household')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log('Attempting to join with token:', inviteToken)
      
      const response = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken }),
      })

      const data = await response.json()
      
      console.log('Join response:', { status: response.status, data })

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join household')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Join error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  if (checkingAuth || autoJoining) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">
            {autoJoining ? 'Joining household...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {inviteParam ? 'Join household' : 'Set up your household'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {inviteParam 
              ? 'You\'ve been invited to join a household' 
              : 'Create a new household or join an existing one'
            }
          </p>
        </div>

        {!inviteParam && (
          <div className="flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 px-4 py-2 text-sm font-medium border ${
                mode === 'create'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-l-lg`}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className={`flex-1 px-4 py-2 text-sm font-medium border ${
                mode === 'join'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-r-lg`}
            >
              Join
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">{error}</p>
                {inviteParam && error.includes('expired') && (
                  <p className="mt-2 text-xs text-yellow-700">
                    The invitation link may have expired. Please ask the household owner to send a new invitation.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {inviteParam && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  {error 
                    ? 'If the automatic join failed, click the button below to try again.' 
                    : 'Ready to join! Click the button below to accept the invitation.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
          </div>
        )}

        {mode === 'create' ? (
          <form className="mt-8 space-y-6" onSubmit={handleCreate}>
            <div>
              <label htmlFor="household-name" className="block text-sm font-medium text-gray-700">
                Household name
              </label>
              <input
                id="household-name"
                name="household-name"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., The Smith Family"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Household'}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleJoin}>
            <div>
              <label htmlFor="invite-token" className="block text-sm font-medium text-gray-700">
                Invite code
              </label>
              <input
                id="invite-token"
                name="invite-token"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter the invite code"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Household'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function HouseholdSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <HouseholdSetupForm />
    </Suspense>
  )
}
