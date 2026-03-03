'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DateTimePicker, DatePicker } from '@/components/ui/date-time-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';

export default function NewEventPage({ params }) {
  const router = useRouter();
  const [calendarId, setCalendarId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
  });
  
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isAllDay, setIsAllDay] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then(p => setCalendarId(p.id));
  }, [params]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!startDate) {
      setError('Please select a start date');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // Format dates for Supabase
      const eventData = {
        calendar_id: calendarId,
        title: formData.title,
        description: formData.description,
        start_time: startDate.toISOString(),
        end_time: endDate ? endDate.toISOString() : startDate.toISOString(),
        all_day: isAllDay,
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Event Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Team Meeting"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                placeholder="Meeting agenda and notes..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="all_day"
                checked={isAllDay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsAllDay(checked);
                  
                  // Reset time to start of day for all-day events
                  if (checked && startDate) {
                    const newStart = new Date(startDate);
                    newStart.setHours(0, 0, 0, 0);
                    setStartDate(newStart);
                    
                    if (endDate) {
                      const newEnd = new Date(endDate);
                      newEnd.setHours(23, 59, 59, 999);
                      setEndDate(newEnd);
                    }
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="all_day" className="font-normal cursor-pointer">
                All-day event
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isAllDay ? (
                <>
                  <DatePicker
                    date={startDate}
                    setDate={setStartDate}
                    label="Start Date"
                    required
                  />
                  <DatePicker
                    date={endDate}
                    setDate={setEndDate}
                    label="End Date"
                  />
                </>
              ) : (
                <>
                  <DateTimePicker
                    date={startDate}
                    setDate={setStartDate}
                    label="Start Date & Time"
                    required
                  />
                  <DateTimePicker
                    date={endDate}
                    setDate={setEndDate}
                    label="End Date & Time"
                  />
                </>
              )}
            </div>

            <AddressAutocomplete
              value={formData.location}
              onChange={(value) => setFormData({ ...formData, location: value })}
              label="Location"
              placeholder="Enter address or place name..."
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
