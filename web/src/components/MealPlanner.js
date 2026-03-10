'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Utensils, ChefHat, Clock, User } from 'lucide-react'

export default function MealPlanner({ householdProfiles = [] }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    date: '',
    meal_type: 'dinner',
    title: '',
    description: '',
    assigned_to_profile_id: null
  })

  useEffect(() => {
    fetchMeals()
  }, [selectedWeek])

  const fetchMeals = async () => {
    setLoading(true)
    try {
      const startDate = getWeekStart(selectedWeek)
      const endDate = getWeekEnd(selectedWeek)
      
      const response = await fetch(
        `/api/meals?start=${startDate.toISOString().split('T')[0]}&end=${endDate.toISOString().split('T')[0]}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setMeals(data.meals || [])
      }
    } catch (error) {
      console.error('Error fetching meals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMeal = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsModalOpen(false)
        resetForm()
        fetchMeals()
      }
    } catch (error) {
      console.error('Error creating meal:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      date: '',
      meal_type: 'dinner',
      title: '',
      description: '',
      assigned_to_profile_id: null
    })
  }

  const getWeekStart = (date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  const getWeekEnd = (date) => {
    const start = getWeekStart(date)
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
  }

  const getWeekDates = () => {
    const start = getWeekStart(selectedWeek)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return date
    })
  }

  const getMealsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return meals.filter(m => m.date === dateStr)
  }

  const getMealTypeLabel = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getProfileName = (profileId) => {
    if (!profileId) return 'Unassigned'
    const profile = householdProfiles.find(p => p.id === profileId)
    return profile?.name || 'Unknown'
  }

  const weekDates = getWeekDates()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Meal Planner</h2>
          </div>
          <button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Meal
          </button>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => {
              const newDate = new Date(selectedWeek)
              newDate.setDate(newDate.getDate() - 7)
              setSelectedWeek(newDate)
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Previous Week
          </button>
          <span className="font-medium">
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
            {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={() => {
              const newDate = new Date(selectedWeek)
              newDate.setDate(newDate.getDate() + 7)
              setSelectedWeek(newDate)
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Next Week →
          </button>
        </div>
      </div>

      {/* Meal Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDates.map((date) => {
            const dayMeals = getMealsForDay(date)
            const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
            
            return (
              <div
                key={date.toISOString()}
                className={`bg-white rounded-lg shadow p-4 ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="text-center mb-3">
                  <div className="text-sm font-medium text-gray-600">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : ''}`}>
                    {date.getDate()}
                  </div>
                </div>

                <div className="space-y-2">
                  {dayMeals.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-4">
                      No meals planned
                    </div>
                  ) : (
                    dayMeals.map((meal) => (
                      <div
                        key={meal.id}
                        className="p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                      >
                        <div className="font-medium text-gray-700 mb-1">{meal.title}</div>
                        <div className="flex items-center gap-1 text-gray-500">
                          <ChefHat className="h-3 w-3" />
                          {getMealTypeLabel(meal.meal_type)}
                        </div>
                        {meal.assigned_to_profile_id && (
                          <div className="flex items-center gap-1 text-gray-500 mt-1">
                            <User className="h-3 w-3" />
                            {getProfileName(meal.assigned_to_profile_id)}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Meal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Meal</h3>
            <form onSubmit={handleCreateMeal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Meal Type *</label>
                <select
                  value={formData.meal_type}
                  onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Meal Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Spaghetti & Meatballs"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  placeholder="Optional notes about the meal..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Meal
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
