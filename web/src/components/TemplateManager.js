'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Utensils, ClipboardList, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export default function TemplateManager() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    location: '',
    duration_minutes: 60,
    all_day: false,
    category: 'event',
    color: '#3b82f6',
    icon: ''
  })

  useEffect(() => {
    fetchTemplates()
  }, [categoryFilter])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const url = categoryFilter === 'all' 
        ? '/api/templates'
        : `/api/templates?category=${categoryFilter}`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const method = editingTemplate ? 'PATCH' : 'POST'
      const url = editingTemplate 
        ? `/api/templates/${editingTemplate.id}`
        : '/api/templates'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setIsModalOpen(false)
        resetForm()
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error saving template:', error)
    }
  }

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const response = await fetch(`/api/templates/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleEditTemplate = (template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      title: template.title,
      description: template.description || '',
      location: template.location || '',
      duration_minutes: template.duration_minutes,
      all_day: template.all_day,
      category: template.category,
      color: template.color || '#3b82f6',
      icon: template.icon || ''
    })
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      title: '',
      description: '',
      location: '',
      duration_minutes: 60,
      all_day: false,
      category: 'event',
      color: '#3b82f6',
      icon: ''
    })
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'meal': return <Utensils className="h-4 w-4" />
      case 'chore': return <ClipboardList className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const categories = [
    { value: 'all', label: 'All Templates' },
    { value: 'event', label: 'Events' },
    { value: 'meal', label: 'Meals' },
    { value: 'chore', label: 'Chores' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <div className="space-y-6">
      {/* Header with Filter and Create Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Event Templates</h2>
            <p className="text-sm text-gray-600">Create reusable templates for common events, meals, and chores</p>
          </div>
          <Button
            onClick={() => {
              resetForm()
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No templates yet. Create your first template to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(template.category)}
                  <h3 className="font-semibold">{template.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="p-1 text-gray-600 hover:text-blue-600"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1 text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-2">{template.title}</p>
              {template.description && (
                <p className="text-sm text-gray-500 mb-2">{template.description}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {template.all_day ? (
                  <span className="px-2 py-1 bg-gray-100 rounded">All Day</span>
                ) : (
                  <span className="px-2 py-1 bg-gray-100 rounded">
                    {template.duration_minutes} min
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-100 rounded capitalize">
                  {template.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Soccer Practice"
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="event">Event</option>
                  <option value="meal">Meal</option>
                  <option value="chore">Chore</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Weekly Soccer Practice"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Practice drills and scrimmage"
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Community Field"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="all_day"
                checked={formData.all_day}
                onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="all_day" className="cursor-pointer">
                All-day event
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
