'use client';

import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRouter } from 'next/navigation';

export default function CalendarView({ events, calendars }) {
  const calendarRef = useRef(null);
  const router = useRouter();
  const [view, setView] = useState('dayGridMonth');

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
    
    // Show event details
    const message = [
      event.title,
      props.calendarName && `Calendar: ${props.calendarName}`,
      props.location && `Location: ${props.location}`,
      props.description && `\n${props.description}`,
    ].filter(Boolean).join('\n');
    
    if (confirm(`${message}\n\nDelete this event?`)) {
      handleDeleteEvent(event.id);
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
    // When clicking on a date, could open create event modal
    console.log('Date clicked:', info.dateStr);
  };

  return (
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
  );
}
