'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, User, Users, Baby, UserPlus, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'

const EMPTY_FORM = { name: '', birth_date: '', relationship: '', color: '#3B82F6' }

export default function HouseholdProfilesManager({ onUpdate }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

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

  const handleSubmitProfile = async (e) => {
    e.preventDefault()
    try {
      let response
      if (editingProfile) {
        response = await fetch(`/api/household/profiles/${editingProfile.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      } else {
        response = await fetch('/api/household/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
      }

      if (response.ok) {
        setIsModalOpen(false)
        setEditingProfile(null)
        resetForm()
        await fetchProfiles()
        onUpdate?.()
        toast.success(editingProfile ? 'Profile updated' : 'Member added')
      } else {
        const err = await response.json()
        toast.error(err.error || 'Failed to save profile')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile')
    }
  }

  const handleDeleteProfile = (id, name) => {
    toast(`Remove "${name}" from your household?`, {
      action: { label: 'Remove', onClick: () => confirmDeleteProfile(id) },
      cancel: { label: 'Cancel' },
    })
  }

  const confirmDeleteProfile = async (id) => {
    try {
      const response = await fetch(`/api/household/profiles/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchProfiles()
        onUpdate?.()
        toast.success('Member removed')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete profile')
      }
    } catch (error) {
      console.error('Error deleting profile:', error)
      toast.error('Failed to delete profile')
    }
  }

  const resetForm = () => setFormData(EMPTY_FORM)

  const openCreateModal = () => {
    setEditingProfile(null)
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (profile) => {
    setEditingProfile(profile)
    setFormData({
      name: profile.name || '',
      birth_date: profile.birth_date || '',
      relationship: profile.relationship || '',
      color: profile.color || '#3B82F6',
    })
    setIsModalOpen(true)
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
            onClick={openCreateModal}
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
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Has Account
                      </span>
                      <button
                        onClick={() => openEditModal(profile)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit profile"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
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
                      onClick={() => openEditModal(profile)}
                      className="text-gray-400 hover:text-blue-600"
                      title="Edit profile"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProfile(profile.id, profile.name)}
                      className="text-gray-400 hover:text-red-600"
                      title="Remove member"
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

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{editingProfile ? 'Edit Member' : 'Add Household Member'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitProfile} className="space-y-4">
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
                  {editingProfile ? 'Save Changes' : 'Add Member'}
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
