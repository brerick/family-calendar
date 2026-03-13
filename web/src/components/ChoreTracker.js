'use client'

import { useState, useEffect } from 'react'
import { Plus, CheckCircle, Circle, Trash2, User, Calendar, Award, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const EMPTY_FORM = {
  title: '',
  description: '',
  assigned_to_profile_id: '',
  due_date: '',
  category: 'cleaning',
  points: 0
}

export default function ChoreTracker({ householdProfiles = [] }) {
  const [chores, setChores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('incomplete')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingChore, setEditingChore] = useState(null) // null = create, object = edit
  const [formData, setFormData] = useState(EMPTY_FORM)

  useEffect(() => {
    fetchChores()
  }, [filter])

  const fetchChores = async () => {
    setLoading(true)
    try {
      const completedParam = filter === 'incomplete' ? 'false' : filter === 'complete' ? 'true' : ''
      const url = completedParam ? `/api/chores?completed=${completedParam}` : '/api/chores'
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setChores(data.chores || [])
      }
    } catch (error) {
      console.error('Error fetching chores:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateChore = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsModalOpen(false)
        resetForm()
        fetchChores()
        toast.success('Chore added')
      } else {
        toast.error('Failed to add chore')
      }
    } catch (error) {
      console.error('Error creating chore:', error)
      toast.error('Failed to add chore')
    }
  }

  const handleEditChore = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/chores/${editingChore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsModalOpen(false)
        setEditingChore(null)
        resetForm()
        fetchChores()
        toast.success('Chore updated')
      } else {
        toast.error('Failed to update chore')
      }
    } catch (error) {
      console.error('Error updating chore:', error)
      toast.error('Failed to update chore')
    }
  }

  const handleToggleComplete = async (chore) => {
    try {
      const response = await fetch(`/api/chores/${chore.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !chore.completed })
      })

      if (response.ok) {
        fetchChores()
        toast.success(chore.completed ? 'Marked incomplete' : 'Chore completed! 🎉')
      }
    } catch (error) {
      console.error('Error updating chore:', error)
      toast.error('Failed to update chore')
    }
  }

  const handleDeleteChore = async (id, title) => {
    toast(`Delete "${title}"?`, {
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            const response = await fetch(`/api/chores/${id}`, { method: 'DELETE' })
            if (response.ok) {
              fetchChores()
              toast.success('Chore deleted')
            } else {
              toast.error('Failed to delete chore')
            }
          } catch (error) {
            console.error('Error deleting chore:', error)
            toast.error('Failed to delete chore')
          }
        },
      },
      cancel: { label: 'Cancel' },
    })
  }

  const resetForm = () => {
    setFormData(EMPTY_FORM)
  }

  const openCreateModal = () => {
    setEditingChore(null)
    resetForm()
    setIsModalOpen(true)
  }

  const openEditModal = (chore) => {
    setEditingChore(chore)
    setFormData({
      title: chore.title || '',
      description: chore.description || '',
      assigned_to_profile_id: chore.assigned_to_profile_id || '',
      due_date: chore.due_date || '',
      category: chore.category || 'cleaning',
      points: chore.points || 0,
    })
    setIsModalOpen(true)
  }

  const getProfileName = (profileId) => {
    if (!profileId) return 'Unassigned'
    const profile = householdProfiles.find(p => p.id === profileId)
    return profile?.name || 'Unknown'
  }

  const getCategoryColor = (category) => {
    const colors = {
      cleaning: 'bg-blue-100 text-blue-700',
      dishes: 'bg-green-100 text-green-700',
      laundry: 'bg-purple-100 text-purple-700',
      yard: 'bg-yellow-100 text-yellow-700',
      pets: 'bg-pink-100 text-pink-700',
      other: 'bg-gray-100 text-gray-700'
    }
    return colors[category] || colors.other
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() && !chores.find(c => c.due_date === dueDate)?.completed
  }

  const getTotalPoints = (profileId) => {
    return chores
      .filter(c => c.assigned_to_profile_id === profileId && c.completed)
      .reduce((sum, c) => sum + (c.points || 0), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Chore Tracker</h2>
            <p className="text-sm text-gray-600">Assign and track household chores</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Chore
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('incomplete')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'incomplete'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            To Do
          </button>
          <button
            onClick={() => setFilter('complete')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'complete'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Leaderboard (if points system enabled) */}
      {householdProfiles.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Points Leaderboard</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {householdProfiles
              .sort((a, b) => getTotalPoints(b.id) - getTotalPoints(a.id))
              .map((profile) => (
                <div key={profile.id} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-700">{profile.name}</div>
                  <div className="text-2xl font-bold text-blue-600">{getTotalPoints(profile.id)}</div>
                  <div className="text-xs text-gray-500">points</div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Chores List */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : chores.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Circle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {filter === 'complete' ? 'No completed chores yet' : 'No chores to do!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {chores.map((chore) => (
            <div
              key={chore.id}
              className={`bg-white rounded-lg shadow p-4 flex items-center gap-4 ${
                chore.completed ? 'opacity-60' : ''
              } ${isOverdue(chore.due_date) ? 'border-l-4 border-red-500' : ''}`}
            >
              <button
                onClick={() => handleToggleComplete(chore)}
                className="flex-shrink-0"
              >
                {chore.completed ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-400 hover:text-blue-600" />
                )}
              </button>

              <div className="flex-1">
                <h3 className={`font-semibold ${chore.completed ? 'line-through text-gray-500' : ''}`}>
                  {chore.title}
                </h3>
                {chore.description && (
                  <p className="text-sm text-gray-600 mt-1">{chore.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {getProfileName(chore.assigned_to_profile_id)}
                  </div>
                  {chore.due_date && (
                    <div className={`flex items-center gap-1 ${isOverdue(chore.due_date) ? 'text-red-600 font-medium' : ''}`}>
                      <Calendar className="h-4 w-4" />
                      {new Date(chore.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {chore.category && (
                    <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(chore.category)}`}>
                      {chore.category}
                    </span>
                  )}
                  {chore.points > 0 && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Award className="h-4 w-4" />
                      {chore.points}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => openEditModal(chore)}
                className="flex-shrink-0 text-gray-400 hover:text-blue-600"
                title="Edit chore"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteChore(chore.id, chore.title)}
                className="flex-shrink-0 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Chore Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{editingChore ? 'Edit Chore' : 'Add Chore'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={editingChore ? handleEditChore : handleCreateChore} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chore Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Wash dishes"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  placeholder="Optional details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Assign To *</label>
                <select
                  value={formData.assigned_to_profile_id}
                  onChange={(e) => setFormData({ ...formData, assigned_to_profile_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select person...</option>
                  {householdProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-md"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="cleaning">Cleaning</option>
                  <option value="dishes">Dishes</option>
                  <option value="laundry">Laundry</option>
                  <option value="yard">Yard Work</option>
                  <option value="pets">Pet Care</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingChore ? 'Save Changes' : 'Add Chore'}
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
