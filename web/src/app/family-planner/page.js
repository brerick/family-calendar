'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Utensils, Calendar, Users } from 'lucide-react'
import AvailabilityView from '@/components/AvailabilityView'
import TemplateManager from '@/components/TemplateManager'
import MealPlanner from '@/components/MealPlanner'
import ChoreTracker from '@/components/ChoreTracker'
import HouseholdProfilesManager from '@/components/HouseholdProfilesManager'

export default function FamilyPlannerPage() {
  const [activeTab, setActiveTab] = useState('availability')
  const [householdProfiles, setHouseholdProfiles] = useState([])

  useEffect(() => {
    fetchHouseholdProfiles()
  }, [])

  const fetchHouseholdProfiles = async () => {
    try {
      const response = await fetch('/api/household/profiles')
      if (response.ok) {
        const data = await response.json()
        setHouseholdProfiles(data.profiles || [])
      }
    } catch (error) {
      console.error('Error fetching household profiles:', error)
    }
  }

  const tabs = [
    { id: 'members', label: 'Members', icon: Users },
    { id: 'availability', label: 'Availability', icon: Calendar },
    { id: 'templates', label: 'Templates', icon: Calendar },
    { id: 'meals', label: 'Meal Planner', icon: Utensils },
    { id: 'chores', label: 'Chores', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Family Planner</h1>
            <p className="text-sm text-gray-600 mt-1">
              Coordinate schedules, plan meals, and manage household tasks
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'members' && (
            <HouseholdProfilesManager onUpdate={fetchHouseholdProfiles} />
          )}
          {activeTab === 'availability' && (
            <AvailabilityView householdProfiles={householdProfiles} />
          )}
          {activeTab === 'templates' && (
            <TemplateManager />
          )}
          {activeTab === 'meals' && (
            <MealPlanner householdProfiles={householdProfiles} />
          )}
          {activeTab === 'chores' && (
            <ChoreTracker householdProfiles={householdProfiles} />
          )}
        </div>
      </div>
    </div>
  )
}
