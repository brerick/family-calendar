'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewEventPage({ params }) {
  const router = useRouter();
  const [calendarId, setCalendarId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    location: '',
  });

  // Unwrap params
  useState(() => {
    params.then(p => setCalendarId(p.id));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Format dates for Supabase
      const eventData = {
        calendar_id: calendarId,
        title: formData.title,
        description: formData.description,
        start_time: formData.all_day 
          ? new Date(formData.start_time + 'T00:00:00').toISOString()
          : new Date(formData.start_time).toISOString(),
        end_time: formData.end_time
          ? (formData.all_day 
              ? new Date(formData.end_time + 'T23:59:59').toISOString()
              : new Date(formData.end_time).toISOString())
          : (formData.all_day 
              ? new Date(formData.start_time + 'T23:59:59').toISOString()
              : new Date(formData.start_time).toISOString()),
        all_day: formData.all_day,
        location: formData.location,
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create event');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!calendarId) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Create New Event</h1>
            <Link 
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Team Meeting"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Meeting agenda and notes..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="all_day"
                checked={formData.all_day}
                onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="all_day" className="ml-2 text-sm text-gray-700">
                All-day event
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start {formData.all_day ? 'Date' : 'Date & Time'} *
                </label>
                <input
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End {formData.all_day ? 'Date' : 'Date & Time'}
                </label>
                <input
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Conference Room A"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
