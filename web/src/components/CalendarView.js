'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DateTimePicker, DatePicker } from "@/components/ui/date-time-picker"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import RecurrenceSelector from "@/components/ui/recurrence-selector"
import { CalendarIcon, MapPinIcon, Trash2Icon, PencilIcon, SaveIcon, XIcon, RepeatIcon, Utensils, ClipboardList, Users, ExternalLink } from 'lucide-react';
import { Calendar as CalendarIconView, List, Clock, Settings as SettingsIcon } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import { toast } from 'sonner';

export default function CalendarView({ events, calendars, householdProfiles = [] }) {
  const calendarRef = useRef(null);
  const router = useRouter();
  const [view, setView] = useState('dayGridMonth');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // View mode state (calendar vs list)
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [listTimeRange, setListTimeRange] = useState('week'); // 'day', 'week', 'month'
  
  // Time range for calendar view (for tablet display)
  const [calendarStartHour, setCalendarStartHour] = useState(6);
  const [calendarEndHour, setCalendarEndHour] = useState(22);
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  
  // Quick create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDate, setCreateDate] = useState(null);
  const [createCalendarId, setCreateCalendarId] = useState('');

  // Drag-drop pending confirmation state
  const [pendingDrop, setPendingDrop] = useState(null); // { info }
  const [isDropConfirmOpen, setIsDropConfirmOpen] = useState(false);

  // Recurring edit scope prompt state
  const [isRecurringPromptOpen, setIsRecurringPromptOpen] = useState(false);
  
  // Search filter state
  const [filters, setFilters] = useState({ searchQuery: '' });

  // Meal & chore overlay
  const [showMeals, setShowMeals] = useState(true)
  const [showChores, setShowChores] = useState(true)
  const [meals, setMeals] = useState([])
  const [chores, setChores] = useState([])
  // Seed with the current month range so the meals fetch doesn't wait on FullCalendar's datesSet
  const [calDateRange, setCalDateRange] = useState(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    return { start, end }
  })

  useEffect(() => {
    if (!showMeals) { setMeals([]); return }
    const start = calDateRange.start.toISOString().split('T')[0]
    const end = calDateRange.end.toISOString().split('T')[0]
    fetch(`/api/meals?start=${start}&end=${end}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.meals) setMeals(data.meals) })
      .catch(console.error)
  }, [showMeals, calDateRange])

  useEffect(() => {
    if (!showChores) { setChores([]); return }
    fetch('/api/chores?completed=false')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.chores) setChores(data.chores) })
      .catch(console.error)
  }, [showChores])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        if (isEditMode) {
          handleCancelEdit();
        } else if (isModalOpen) {
          setIsModalOpen(false);
        } else if (isCreateModalOpen) {
          setIsCreateModalOpen(false);
        }
      }

      // N or C to create new event (with today's date)
      if ((e.key === 'n' || e.key === 'c') && !isModalOpen && !isCreateModalOpen) {
        const today = new Date();
        today.setHours(9, 0, 0, 0);
        setCreateDate(today);
        setIsCreateModalOpen(true);
      }

      // T to go to today
      if (e.key === 't' && !isModalOpen && !isCreateModalOpen) {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          calendarApi.today();
        }
      }

      // Arrow keys to navigate
      if (!isModalOpen && !isCreateModalOpen) {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
          if (e.key === 'ArrowLeft') {
            calendarApi.prev();
          } else if (e.key === 'ArrowRight') {
            calendarApi.next();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isCreateModalOpen, isEditMode]);

  // Close time settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showTimeSettings && !e.target.closest('.time-settings-container')) {
        setShowTimeSettings(false);
      }
    };

    if (showTimeSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTimeSettings]);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    location: '',
  });
  const [editStartDate, setEditStartDate] = useState(null);
  const [editEndDate, setEditEndDate] = useState(null);
  const [editIsAllDay, setEditIsAllDay] = useState(false);
  const [editRecurrenceRule, setEditRecurrenceRule] = useState(null);
  const [editAttendees, setEditAttendees] = useState([]); // profile IDs

  // Filter events based on search and visible calendars
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Find the calendar for this event
      const calendar = calendars.find(cal => cal.id === event.calendar_id);
      
      // Filter out events from hidden calendars
      if (calendar && calendar.visible === false) {
        return false;
      }
      
      // Filter by search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = event.title?.toLowerCase().includes(query);
        const matchesDescription = event.description?.toLowerCase().includes(query);
        const matchesLocation = event.location?.toLowerCase().includes(query);
        
        if (!matchesTitle && !matchesDescription && !matchesLocation) {
          return false;
        }
      }
      
      return true;
    });
  }, [events, calendars, filters]);

  // Filter events for list view based on time range
  const listFilteredEvents = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    let startDate, endDate;
    
    if (listTimeRange === 'day') {
      startDate = startOfDay;
      endDate = endOfDay;
    } else if (listTimeRange === 'week') {
      // Get start of week (Sunday)
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
      startDate.setHours(0, 0, 0, 0);
      
      // Get end of week (Saturday)
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59);
    } else if (listTimeRange === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }
    
    return filteredEvents.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time || event.start_time);
      
      // Event overlaps with the selected time range
      return eventStart <= endDate && eventEnd >= startDate;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [filteredEvents, listTimeRange]);

  // Transform filtered events for FullCalendar
  const calendarEvents = filteredEvents.map(event => ({
    id: event.id,
    title: event.title,
    start: event.start_time,
    end: event.end_time,
    allDay: event.all_day,
    backgroundColor: event.calendar?.color || '#3b82f6',
    borderColor: event.calendar?.color || '#3b82f6',
    extendedProps: {
      description: event.description,
      location: event.location,
      calendarName: event.calendar?.name,
      calendarId: event.calendar_id,
      recurrenceRule: event.recurrence_rule,
      attendees: event.attendees || [],
      recurringEventId: event.recurring_event_id || null,
      externalEventId: event.external_event_id || null,
    }
  }))

  const MEAL_COLORS = { breakfast: '#f59e0b', lunch: '#10b981', dinner: '#f97316', snack: '#ec4899' }
  const mealEvents = meals.map(meal => ({
    id: `meal-${meal.id}`,
    title: `🍽 ${meal.title}`,
    start: meal.date,
    allDay: true,
    backgroundColor: MEAL_COLORS[meal.meal_type] || '#f97316',
    borderColor: MEAL_COLORS[meal.meal_type] || '#f97316',
    textColor: '#fff',
    extendedProps: { type: 'meal', tab: 'meals' },
    editable: false,
  }))

  const choreEvents = chores
    .filter(c => c.due_date)
    .map(chore => ({
      id: `chore-${chore.id}`,
      title: `☑ ${chore.title}`,
      start: chore.due_date,
      allDay: true,
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
      textColor: '#fff',
      extendedProps: { type: 'chore', tab: 'chores' },
      editable: false,
    }))

  const allCalendarEvents = [...calendarEvents, ...mealEvents, ...choreEvents]

  const handleEventClick = (info) => {
    // Meals and chores navigate to family planner
    if (info.event.extendedProps.type === 'meal' || info.event.extendedProps.type === 'chore') {
      router.push(`/family-planner?tab=${info.event.extendedProps.tab}`)
      return
    }
    const event = info.event;
    const props = event.extendedProps;

    // Set selected event and open modal
    const eventData = {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      description: props.description,
      location: props.location,
      calendarName: props.calendarName,
      calendarId: props.calendarId,
      color: event.backgroundColor,
      recurrenceRule: props.recurrenceRule,
      attendees: props.attendees || [],
      recurringEventId: props.recurringEventId || null,
      externalEventId: props.externalEventId || null,
    };
    
    setSelectedEvent(eventData);
    setIsEditMode(false);
    
    // Initialize edit form with current values
    setEditForm({
      title: event.title || '',
      description: props.description || '',
      location: props.location || '',
    });
    setEditStartDate(event.start ? new Date(event.start) : null);
    setEditEndDate(event.end ? new Date(event.end) : null);
    setEditIsAllDay(event.allDay || false);
    setEditRecurrenceRule(props.recurrenceRule || null);
    setEditAttendees((props.attendees || []).map(a => a.profile_id).filter(Boolean));
    
    setIsModalOpen(true);
  };

  const handleEnterEditMode = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    // Reset edit form to original values
    setEditForm({
      title: selectedEvent.title || '',
      description: selectedEvent.description || '',
      location: selectedEvent.location || '',
    });
    setEditStartDate(selectedEvent.start ? new Date(selectedEvent.start) : null);
    setEditEndDate(selectedEvent.end ? new Date(selectedEvent.end) : null);
    setEditIsAllDay(selectedEvent.allDay || false);
    setEditRecurrenceRule(selectedEvent.recurrenceRule || null);
    setEditAttendees((selectedEvent.attendees || []).map(a => a.profile_id).filter(Boolean));
    setIsEditMode(false);
  };

  const handleSaveEdit = async (editScope = 'this') => {
    if (!editForm.title || !editStartDate) {
      toast.error('Please fill in required fields');
      return;
    }

    if (editEndDate && editEndDate < editStartDate) {
      toast.error('End time cannot be before start time');
      return;
    }

    // For recurring Google events, prompt for scope before saving
    if (
      editScope === 'this' &&
      selectedEvent?.recurringEventId &&
      selectedEvent?.externalEventId &&
      !isRecurringPromptOpen
    ) {
      setIsRecurringPromptOpen(true);
      return;
    }

    setIsRecurringPromptOpen(false);
    setSaving(true);

    try {
      const eventData = {
        title: editForm.title,
        description: editForm.description,
        start_time: editStartDate.toISOString(),
        end_time: editEndDate ? editEndDate.toISOString() : editStartDate.toISOString(),
        all_day: editIsAllDay,
        location: editForm.location,
        recurrence_rule: editRecurrenceRule,
        attendee_profile_ids: editAttendees,
        edit_scope: editScope,
      };

      const res = await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        throw new Error('Failed to update event');
      }

      const data = await res.json();
      setIsModalOpen(false);
      setIsEditMode(false);
      if (data.googleSyncWarning === 'reconnect') {
        toast.warning('Event saved, but Google Calendar sync failed — please reconnect Google Calendar in your settings.', { duration: 8000 });
      } else if (data.googleSyncWarning === 'error') {
        toast.warning('Event saved locally, but failed to update in Google Calendar.');
      } else {
        toast.success('Event updated');
      }
      router.refresh();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete event');
      }

      toast.success('Event deleted');
      router.refresh();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleDateClick = (info) => {
    // Open quick create modal with selected date
    const clickedDate = new Date(info.dateStr);
    clickedDate.setHours(9, 0, 0, 0); // Default to 9 AM
    setCreateDate(clickedDate);
    setIsCreateModalOpen(true);
  };

  const handleEventDrop = async (info) => {
    // Show confirmation before saving the drop
    setPendingDrop({ info });
    setIsDropConfirmOpen(true);
  };

  const commitEventDrop = async () => {
    const { info } = pendingDrop;
    setIsDropConfirmOpen(false);
    setPendingDrop(null);
    try {
      const eventData = {
        title: info.event.title,
        description: info.event.extendedProps.description,
        start_time: info.event.start.toISOString(),
        end_time: info.event.end ? info.event.end.toISOString() : info.event.start.toISOString(),
        all_day: info.event.allDay,
        location: info.event.extendedProps.location,
      };

      const res = await fetch(`/api/events/${info.event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        info.revert();
        throw new Error('Failed to update event');
      }

      const data = await res.json();
      if (data.googleSyncWarning === 'reconnect') {
        toast.warning('Event rescheduled, but Google Calendar sync failed — please reconnect Google Calendar.', { duration: 8000 });
      } else if (data.googleSyncWarning === 'error') {
        toast.warning('Event rescheduled locally, but failed to update in Google Calendar.');
      } else {
        toast.success('Event rescheduled');
      }
      router.refresh();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to reschedule event');
    }
  };

  // Helper function to format recurrence rule for display
  const formatRecurrence = (recurrenceRule) => {
    if (!recurrenceRule) return null;
    
    try {
      const rule = JSON.parse(recurrenceRule);
      let text = `Repeats every ${rule.interval > 1 ? rule.interval + ' ' : ''}`;
      
      switch (rule.frequency) {
        case 'daily':
          text += rule.interval === 1 ? 'day' : 'days';
          break;
        case 'weekly':
          text += rule.interval === 1 ? 'week' : 'weeks';
          if (rule.byweekday && rule.byweekday.length > 0) {
            const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
            const dayNames = rule.byweekday.map(d => days[d]).join(', ');
            text += ` on ${dayNames}`;
          }
          break;
        case 'monthly':
          text += rule.interval === 1 ? 'month' : 'months';
          break;
        case 'yearly':
          text += rule.interval === 1 ? 'year' : 'years';
          break;
      }

      if (rule.until) {
        text += `, until ${new Date(rule.until).toLocaleDateString()}`;
      } else if (rule.count) {
        text += `, ${rule.count} times`;
      }

      return text;
    } catch (e) {
      console.error('Failed to parse recurrence rule:', e);
      return null;
    }
  };

  return (
    <>
      <SearchBar 
        onFilterChange={setFilters}
      />
      
      {/* View Mode Controls */}
      <div className="bg-white rounded-lg shadow p-3 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: view toggle + meal/chore overlays */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarIconView className="h-4 w-4" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
              <span>Events</span>
            </button>
          </div>

          {/* Meal & Chore Overlay Toggles */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMeals(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                showMeals
                  ? 'bg-orange-100 text-orange-700 border-orange-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
              }`}
              title="Show meals on calendar"
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>Meals</span>
            </button>
            <button
              onClick={() => setShowChores(v => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                showChores
                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
              }`}
              title="Show chores on calendar"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Chores</span>
            </button>
          </div>
        </div>

        {/* List View Time Range Selector */}
        {viewMode === 'list' && (
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setListTimeRange('day')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                listTimeRange === 'day'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setListTimeRange('week')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                listTimeRange === 'week'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setListTimeRange('month')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                listTimeRange === 'month'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              This Month
            </button>
          </div>
        )}

        {/* Calendar View Time Settings */}
        {viewMode === 'calendar' && (view === 'timeGridWeek' || view === 'timeGridDay') && (
          <div className="relative time-settings-container">
            <button
              onClick={() => setShowTimeSettings(!showTimeSettings)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Time Range: </span>
              <span>{calendarStartHour}:00 - {calendarEndHour}:00</span>
              <SettingsIcon className="h-3 w-3" />
            </button>
            
            {showTimeSettings && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-64">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Start Hour: {calendarStartHour}:00
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="23"
                      value={calendarStartHour}
                      onChange={(e) => setCalendarStartHour(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      End Hour: {calendarEndHour}:00
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="23"
                      value={calendarEndHour}
                      onChange={(e) => setCalendarEndHour(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setCalendarStartHour(6);
                      setCalendarEndHour(22);
                    }}
                    className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Reset to Default (6:00 - 22:00)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow p-4">
          {listFilteredEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <List className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No events found</p>
              <p className="text-sm mt-1">
                {listTimeRange === 'day' && 'No events scheduled for today'}
                {listTimeRange === 'week' && 'No events scheduled for this week'}
                {listTimeRange === 'month' && 'No events scheduled for this month'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {listFilteredEvents.map((event) => {
                const calendar = calendars.find(cal => cal.id === event.calendar_id);
                const startDate = new Date(event.start_time);
                const endDate = event.end_time ? new Date(event.end_time) : null;
                const isToday = startDate.toDateString() === new Date().toDateString();
                
                return (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent({
                        id: event.id,
                        title: event.title,
                        start: event.start_time,
                        end: event.end_time,
                        allDay: event.all_day,
                        description: event.description,
                        location: event.location,
                        calendarName: calendar?.name,
                        calendarColor: calendar?.color,
                        calendarId: event.calendar_id,
                        recurrenceRule: event.recurrence_rule,
                      });
                      setIsModalOpen(true);
                    }}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Date indicator */}
                      <div className="flex-shrink-0 text-center">
                        <div className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
                          {startDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                        </div>
                        <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                          {startDate.getDate()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {startDate.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </div>
                      
                      {/* Event details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: calendar?.color || '#3b82f6' }}
                          />
                          <h4 className="font-semibold text-gray-900 truncate">{event.title}</h4>
                        </div>
                        
                        {!event.all_day && (
                          <p className="text-sm text-gray-600 mb-1">
                            {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            {endDate && ` - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                          </p>
                        )}
                        
                        {event.all_day && (
                          <p className="text-sm text-gray-600 mb-1">All day</p>
                        )}
                        
                        {event.location && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPinIcon className="h-3 w-3" />
                            <span className="truncate">{event.location}</span>
                          </p>
                        )}
                        
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-2">{calendar?.name}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="calendar-wrapper">
        <style jsx global>{`
          .fc {
            font-family: inherit;
          }
          .fc-toolbar-title {
            font-size: 1.5rem !important;
            font-weight: 600 !important;
          }
          .fc-button {
            background-color: #3b82f6 !important;
            border-color: #3b82f6 !important;
            text-transform: capitalize !important;
            padding: 0.4rem 0.8rem !important;
          }
          .fc-button:hover {
            background-color: #2563eb !important;
            border-color: #2563eb !important;
          }
          .fc-button-active {
            background-color: #1d4ed8 !important;
            border-color: #1d4ed8 !important;
          }
          .fc-today-button {
            font-weight: 600 !important;
            background-color: #10b981 !important;
            border-color: #10b981 !important;
          }
          .fc-today-button:hover {
            background-color: #059669 !important;
            border-color: #059669 !important;
          }
          .fc-today-button:disabled {
            background-color: #9ca3af !important;
            border-color: #9ca3af !important;
            opacity: 0.5 !important;
          }
          .fc-daygrid-day-number {
            padding: 4px !important;
          }
          .fc-event {
            cursor: move;
            margin-bottom: 2px !important;
          }
          .fc-event-title {
            font-weight: 500;
          }
          .fc-day-today {
            background-color: #dbeafe !important;
          }
          .fc-daygrid-day-events {
            min-height: 20px;
          }
          
          /* Mobile responsive styles */
          @media (max-width: 768px) {
            .fc-toolbar {
              flex-direction: column !important;
              gap: 0.5rem !important;
            }
            .fc-toolbar-chunk {
              display: flex;
              justify-content: center;
              flex-wrap: wrap;
              gap: 0.25rem !important;
            }
            .fc-toolbar-title {
              font-size: 1rem !important;
              text-align: center;
              width: 100%;
            }
            .fc-button {
              padding: 0.35rem 0.6rem !important;
              font-size: 0.8rem !important;
            }
            .fc-header-toolbar {
              margin-bottom: 0.75rem !important;
            }
            .fc-daygrid-day-number {
              font-size: 0.8rem !important;
              padding: 2px !important;
            }
            .fc-col-header-cell-cushion {
              padding: 4px 2px !important;
              font-size: 0.75rem !important;
            }
            .fc-event {
              font-size: 0.7rem !important;
              cursor: pointer;
              padding: 1px 2px !important;
            }
            .fc-event-title {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .fc-daygrid-event-dot {
              display: none !important;
            }
          }
          
          @media (max-width: 480px) {
            .fc-toolbar-title {
              font-size: 0.9rem !important;
            }
            .fc-button {
              padding: 0.3rem 0.5rem !important;
              font-size: 0.75rem !important;
            }
            .fc-daygrid-day-frame {
              min-height: 60px !important;
            }
          }
        `}</style>
        
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          views={{
            dayGridMonth: {
              titleFormat: { year: 'numeric', month: 'short' }
            },
            timeGridWeek: {
              titleFormat: { year: 'numeric', month: 'short', day: 'numeric' }
            },
            timeGridDay: {
              titleFormat: { year: 'numeric', month: 'short', day: 'numeric' }
            }
          }}
          events={allCalendarEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          datesSet={(dateInfo) => {
            if (dateInfo.view.type !== view) {
              setView(dateInfo.view.type);
            }
            setCalDateRange({ start: dateInfo.start, end: dateInfo.end });
          }}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          height="auto"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
          }}
          eventContent={(arg) => {
            const color = arg.event.backgroundColor;
            const isAllDay = arg.event.allDay;
            return (
              <div className="flex items-stretch w-full h-full overflow-hidden rounded-sm cursor-move" style={{ backgroundColor: color }}>
                <div className="w-1 flex-shrink-0 rounded-l-sm" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }} />
                <div className="flex-1 px-1 py-0.5 overflow-hidden">
                  {!isAllDay && arg.timeText && (
                    <div className="text-[10px] leading-tight font-medium opacity-90 truncate">{arg.timeText}</div>
                  )}
                  <div className="text-xs leading-tight font-semibold truncate">{arg.event.title}</div>
                </div>
              </div>
            );
          }}
          eventClassNames="!bg-transparent !border-0 !p-0"
          contentHeight="auto"
          handleWindowResize={true}
          slotMinTime={`${String(calendarStartHour).padStart(2, '0')}:00:00`}
          slotMaxTime={`${String(calendarEndHour).padStart(2, '0')}:00:00`}
        />
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className={isEditMode ? "sm:max-w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6" : "sm:max-w-[500px] max-w-[95vw] max-h-[85vh] overflow-y-auto p-4 sm:p-6"}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {isEditMode ? 'Edit Event' : selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          
          {!isEditMode ? (
            // View Mode
            <div className="space-y-4 py-4">
              {selectedEvent?.calendarName && (
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Calendar</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedEvent.color }}
                      />
                      <p className="text-sm">{selectedEvent.calendarName}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {selectedEvent && (
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-muted-foreground mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Time</p>
                    <p className="text-sm mt-1">
                      {selectedEvent.allDay ? (
                        'All day'
                      ) : (
                        <>
                          {new Date(selectedEvent.start).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                          {selectedEvent.end && (
                            <>
                              {' → '}
                              {new Date(selectedEvent.end).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
              
              {selectedEvent?.location && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-sm mt-1">{selectedEvent.location}</p>
                  </div>
                </div>
              )}
              
              {selectedEvent?.description && (
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-muted-foreground mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                </div>
              )}

              {selectedEvent?.recurrenceRule && (
                <div className="flex items-start gap-3">
                  <RepeatIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Recurrence</p>
                    <p className="text-sm mt-1">{formatRecurrence(selectedEvent.recurrenceRule)}</p>
                  </div>
                </div>
              )}

              {selectedEvent?.attendees?.length > 0 && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Assigned to</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedEvent.attendees.map(a => {
                        const profile = householdProfiles.find(p => p.id === a.profile_id)
                        return profile ? (
                          <span key={a.profile_id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {profile.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">
                  Event Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Team Meeting"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Meeting agenda and notes..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-all-day"
                  checked={editIsAllDay}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditIsAllDay(checked);
                    
                    if (checked && editStartDate) {
                      const newStart = new Date(editStartDate);
                      newStart.setHours(0, 0, 0, 0);
                      setEditStartDate(newStart);
                      
                      if (editEndDate) {
                        const newEnd = new Date(editEndDate);
                        newEnd.setHours(23, 59, 59, 999);
                        setEditEndDate(newEnd);
                      }
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="edit-all-day" className="font-normal cursor-pointer">
                  All-day event
                </Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {editIsAllDay ? (
                  <>
                    <DatePicker
                      date={editStartDate}
                      setDate={setEditStartDate}
                      label="Start Date"
                      required
                    />
                    <DatePicker
                      date={editEndDate}
                      setDate={setEditEndDate}
                      label="End Date"
                    />
                  </>
                ) : (
                  <>
                    <DateTimePicker
                      date={editStartDate}
                      setDate={setEditStartDate}
                      label="Start Date & Time"
                      required
                    />
                    <DateTimePicker
                      date={editEndDate}
                      setDate={setEditEndDate}
                      label="End Date & Time"
                    />
                  </>
                )}
              </div>

              <AddressAutocomplete
                value={editForm.location}
                onChange={(value) => setEditForm({ ...editForm, location: value })}
                label="Location"
                placeholder="Enter address or place name..."
              />

              <RecurrenceSelector
                value={editRecurrenceRule}
                onChange={setEditRecurrenceRule}
                startDate={editStartDate}
              />

              {householdProfiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Assign to</Label>
                  <div className="flex flex-wrap gap-2">
                    {householdProfiles.map(profile => (
                      <label
                        key={profile.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer border transition-colors select-none ${
                          editAttendees.includes(profile.id)
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={editAttendees.includes(profile.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditAttendees(prev => [...prev, profile.id])
                            } else {
                              setEditAttendees(prev => prev.filter(id => id !== profile.id))
                            }
                          }}
                          className="sr-only"
                        />
                        {profile.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {!isEditMode ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </Button>
                <Button 
                  variant="default"
                  onClick={handleEnterEditMode}
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    toast(`Delete "${selectedEvent.title}"?`, {
                      action: {
                        label: 'Delete',
                        onClick: () => {
                          handleDeleteEvent(selectedEvent.id);
                          setIsModalOpen(false);
                        },
                      },
                      cancel: { label: 'Cancel' },
                    });
                  }}
                >
                  <Trash2Icon className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  <XIcon className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  variant="default"
                  onClick={handleSaveEdit}
                  disabled={saving}
                >
                  <SaveIcon className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring event edit scope dialog */}
      <Dialog open={isRecurringPromptOpen} onOpenChange={(open) => {
        if (!open) setIsRecurringPromptOpen(false);
      }}>
        <DialogContent className="sm:max-w-[420px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Edit Recurring Event</DialogTitle>
            <DialogDescription>
              This event is part of a recurring series. Which events do you want to update?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <button
              className="flex flex-col items-start px-4 py-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              onClick={() => handleSaveEdit('this')}
            >
              <span className="font-semibold text-sm">This event</span>
              <span className="text-xs text-gray-500 mt-0.5">Only update this occurrence</span>
            </button>
            <button
              className="flex flex-col items-start px-4 py-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              onClick={() => handleSaveEdit('future')}
            >
              <span className="font-semibold text-sm">This and following events</span>
              <span className="text-xs text-gray-500 mt-0.5">Update this and all future occurrences</span>
            </button>
            <button
              className="flex flex-col items-start px-4 py-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              onClick={() => handleSaveEdit('all')}
            >
              <span className="font-semibold text-sm">All events</span>
              <span className="text-xs text-gray-500 mt-0.5">Update every occurrence in this series</span>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecurringPromptOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drag-drop confirmation dialog */}
      <Dialog open={isDropConfirmOpen} onOpenChange={(open) => {
        if (!open && pendingDrop) {
          pendingDrop.info.revert();
          setPendingDrop(null);
        }
        setIsDropConfirmOpen(open);
      }}>
        <DialogContent className="sm:max-w-[400px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Move Event?</DialogTitle>
            <DialogDescription>
              {pendingDrop && (
                <>Move <strong>{pendingDrop.info.event.title}</strong> to {pendingDrop.info.event.start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              if (pendingDrop) pendingDrop.info.revert();
              setPendingDrop(null);
              setIsDropConfirmOpen(false);
            }}>
              Cancel
            </Button>
            <Button variant="default" onClick={commitEventDrop}>
              Move Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
        setIsCreateModalOpen(open);
        if (open && calendars?.length > 0) {
          setCreateCalendarId(calendars.find(c => c.visible !== false)?.id || calendars[0]?.id || '');
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Quick Create Event</DialogTitle>
            <DialogDescription className="text-sm">
              {createDate && `Creating event for ${createDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const title = formData.get('title');
            
            if (!title || !createDate) {
              toast.error('Please enter an event title');
              return;
            }

            if (!createCalendarId) {
              toast.error('No calendar available');
              return;
            }

            setSaving(true);
            try {
              const eventData = {
                calendar_id: createCalendarId,
                title,
                description: '',
                start_time: createDate.toISOString(),
                end_time: new Date(createDate.getTime() + 60 * 60 * 1000).toISOString(),
                all_day: false,
                location: '',
              };

              const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData),
              });

              if (!res.ok) {
                throw new Error('Failed to create event');
              }

              toast.success('Event created');
              setIsCreateModalOpen(false);
              router.refresh();
            } catch (error) {
              console.error('Error creating event:', error);
              toast.error('Failed to create event');
            } finally {
              setSaving(false);
            }
          }} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-title">
                Event Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quick-title"
                name="title"
                required
                autoFocus
                placeholder="Team Meeting"
              />
            </div>

            {calendars && calendars.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="quick-calendar">Calendar</Label>
                <select
                  id="quick-calendar"
                  value={createCalendarId}
                  onChange={(e) => setCreateCalendarId(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                >
                  {calendars.filter(c => c.visible !== false).map(cal => (
                    <option key={cal.id} value={cal.id}>{cal.name}</option>
                  ))}
                </select>
              </div>
            )}

            {createCalendarId && (
              <p className="text-xs text-gray-500">
                Want to add more details?{' '}
                <a
                  href={`/calendars/${createCalendarId}/events/new`}
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Open full form <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                variant="default"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Creating...' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
