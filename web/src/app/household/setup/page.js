'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HouseholdSetupPage() {
  const [mode, setMode] = useState('create') // 'create' or 'join'
  const [householdName, setHouseholdName] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
      const response = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join household')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set up your household
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create a new household or join an existing one
          </p>
        </div>

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

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
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
