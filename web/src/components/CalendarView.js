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
import { CalendarIcon, MapPinIcon, Trash2Icon, PencilIcon, SaveIcon, XIcon, RepeatIcon } from 'lucide-react';
import SearchBar from '@/components/SearchBar';

export default function CalendarView({ events, calendars }) {
  const calendarRef = useRef(null);
  const router = useRouter();
  const [view, setView] = useState('dayGridMonth');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Quick create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createDate, setCreateDate] = useState(null);
  
  // Search/filter state
  const [filters, setFilters] = useState({ searchQuery: '', selectedCalendarIds: [] });
  
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

  // Filter events based on search and calendar filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Filter by calendar
      if (filters.selectedCalendarIds.length > 0 && 
          !filters.selectedCalendarIds.includes(event.calendar_id)) {
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
  }, [events, filters]);

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
    }
  }));

  const handleEventClick = (info) => {
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
    setIsEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm.title || !editStartDate) {
      alert('Please fill in required fields');
      return;
    }

    // Validate end time is not before start time
    if (editEndDate && editEndDate < editStartDate) {
      alert('End time cannot be before start time');
      return;
    }

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
      };

      const res = await fetch(`/api/events/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        throw new Error('Failed to update event');
      }

      setIsModalOpen(false);
      setIsEditMode(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event');
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

      router.refresh();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
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
    // Handle drag and drop rescheduling
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
        info.revert(); // Revert the drag if save fails
        throw new Error('Failed to update event');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to reschedule event');
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
        calendars={calendars} 
        onFilterChange={setFilters}
      />
      
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
            .fc-toolbar-title {
              font-size: 1.1rem !important;
            }
            .fc-button {
              padding: 0.3rem 0.5rem !important;
              font-size: 0.85rem !important;
            }
            .fc-toolbar-chunk {
              display: flex;
              gap: 0.25rem;
            }
            .fc-header-toolbar {
              margin-bottom: 0.5rem !important;
            }
            .fc-daygrid-day-number {
              font-size: 0.85rem !important;
            }
            .fc-event {
              font-size: 0.75rem !important;
              cursor: pointer;
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
            right: 'dayGridMonth,timeGridWeek'
          }}
          views={{
            dayGridMonth: {
              titleFormat: { year: 'numeric', month: 'short' }
            },
            timeGridWeek: {
              titleFormat: { year: 'numeric', month: 'short', day: 'numeric' }
            }
          }}
          events={calendarEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
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
          eventClassNames="cursor-move"
          contentHeight="auto"
          handleWindowResize={true}
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) setIsEditMode(false);
      }}>
        <DialogContent className={isEditMode ? "sm:max-w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto" : "sm:max-w-[500px] max-w-[95vw] max-h-[85vh] overflow-y-auto"}>
          <DialogHeader>
            <DialogTitle className="text-xl">
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
                    if (confirm('Are you sure you want to delete this event?')) {
                      handleDeleteEvent(selectedEvent.id);
                      setIsModalOpen(false);
                    }
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

      {/* Quick Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-xl">Quick Create Event</DialogTitle>
            <DialogDescription>
              {createDate && `Creating event for ${createDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const title = formData.get('title');
            
            if (!title || !createDate) {
              alert('Please enter an event title');
              return;
            }

            // Get the first visible calendar
            const targetCalendar = calendars?.find(c => c.visible !== false);
            if (!targetCalendar) {
              alert('No calendar available');
              return;
            }

            setSaving(true);
            try {
              const eventData = {
                calendar_id: targetCalendar.id,
                title,
                description: '',
                start_time: createDate.toISOString(),
                end_time: new Date(createDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour later
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

              setIsCreateModalOpen(false);
              router.refresh();
            } catch (error) {
              console.error('Error creating event:', error);
              alert('Failed to create event');
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
