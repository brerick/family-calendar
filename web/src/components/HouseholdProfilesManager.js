'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, User, Users, Baby, UserPlus } from 'lucide-react'

export default function HouseholdProfilesManager({ onUpdate }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    relationship: '',
    color: '#3B82F6'
  })

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/household/profiles')
      if (response.ok) {
        const data = await response.json()
        setProfiles(data.profiles || [])
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProfile = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/household/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsModalOpen(false)
        resetForm()
        await fetchProfiles()
        onUpdate?.() // Notify parent to refresh
      }
    } catch (error) {
      console.error('Error creating profile:', error)
    }
  }

  const handleDeleteProfile = async (id) => {
    if (!confirm('Are you sure you want to remove this household member?')) return

    try {
      const response = await fetch(`/api/household/profiles/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchProfiles()
        onUpdate?.() // Notify parent to refresh
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete profile')
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      birth_date: '',
      relationship: '',
      color: '#3B82F6'
    })
  }

  const getRelationshipIcon = (relationship) => {
    switch (relationship) {
      case 'child':
        return <Baby className="h-5 w-5" />
      case 'parent':
      case 'spouse':
        return <User className="h-5 w-5" />
      default:
        return <UserPlus className="h-5 w-5" />
    }
  }

  const getAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const authProfiles = profiles.filter(p => p.is_auth_user)
  const nonAuthProfiles = profiles.filter(p => !p.is_auth_user)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Household Members</h2>
            <p className="text-sm text-gray-600">Manage who's in your household</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Authenticated Members (with accounts) */}
          {authProfiles.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Account Holders
              </h3>
              <div className="space-y-3">
                {authProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: profile.color || '#3B82F6' }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{profile.name}</h4>
                      <p className="text-sm text-gray-600">
                        {profile.relationship || 'Member'}
                        {profile.birth_date && ` • ${getAge(profile.birth_date)} years old`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Has Account
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-Authenticated Members (kids, etc.) */}
          {nonAuthProfiles.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Baby className="h-5 w-5 text-purple-600" />
                Other Household Members
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {nonAuthProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: profile.color || '#8B5CF6' }}
                    >
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{profile.name}</h4>
                      <p className="text-sm text-gray-600">
                        {profile.relationship || 'Member'}
                        {profile.birth_date && ` • ${getAge(profile.birth_date)} years old`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteProfile(profile.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nonAuthProfiles.length === 0 && authProfiles.length > 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Baby className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Add family members without accounts (like children) to assign them events, chores, and meals
              </p>
              <button
                onClick={() => {
                  resetForm()
                  setIsModalOpen(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add First Member
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Household Member</h3>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Emma Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Relationship</label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select...</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="spouse">Spouse/Partner</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Birth Date</label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <div className="flex gap-2">
                  {['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Member
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
