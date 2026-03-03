'use client';

import { useEffect, useRef, useState } from 'react';
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
import { CalendarIcon, MapPinIcon, Trash2Icon, PencilIcon } from 'lucide-react';

export default function CalendarView({ events, calendars }) {
  const calendarRef = useRef(null);
  const router = useRouter();
  const [view, setView] = useState('dayGridMonth');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Transform events for FullCalendar
  const calendarEvents = events.map(event => ({
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
    }
  }));

  const handleEventClick = (info) => {
    const event = info.event;
    const props = event.extendedProps;
    
    // Set selected event and open modal
    setSelectedEvent({
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
    });
    setIsModalOpen(true);
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
    // When clicking on a date, could open create event modal
    console.log('Date clicked:', info.dateStr);
  };

  return (
    <>
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
          .fc-daygrid-day-number {
            padding: 4px !important;
          }
          .fc-event {
            cursor: pointer;
          }
          .fc-event-title {
            font-weight: 500;
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
          events={calendarEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          editable={false}
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
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          
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
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
            >
              Close
            </Button>
            <Button 
              variant="default"
              onClick={() => {
                router.push(`/events/${selectedEvent.id}/edit`);
              }}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
