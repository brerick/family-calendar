'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EventsList({ events: initialEvents, calendars }) {
  const [events, setEvents] = useState(initialEvents);
  const router = useRouter();

  const handleDelete = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete event');
      }

      setEvents(events.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  const formatDate = (dateString, allDay) => {
    const date = new Date(dateString);
    if (allDay) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  const groupEventsByDate = () => {
    const grouped = {};
    events.forEach(event => {
      const date = new Date(event.start_time).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    return grouped;
  };

  const groupedEvents = groupEventsByDate();
  const sortedDates = Object.keys(groupedEvents).sort((a, b) => 
    new Date(a) - new Date(b)
  );

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No events yet</p>
        <p className="text-sm mt-2">Create an event from a calendar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map(dateStr => {
        const date = new Date(dateStr);
        const isToday = date.toDateString() === new Date().toDateString();
        
        return (
          <div key={dateStr}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {isToday ? 'Today' : date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>
            <div className="space-y-2">
              {groupedEvents[dateStr].map(event => (
                <div
                  key={event.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: event.calendar?.color || '#3b82f6' }}
                        />
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(event.start_time, event.all_day)}
                        {event.end_time && event.end_time !== event.start_time && (
                          <> - {formatDate(event.end_time, event.all_day)}</>
                        )}
                      </p>
                      
                      {event.location && (
                        <p className="text-sm text-gray-500 mt-1">📍 {event.location}</p>
                      )}
                      
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                      )}
                      
                      <p className="text-xs text-gray-400 mt-2">
                        {event.calendar?.name}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                      title="Delete event"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
