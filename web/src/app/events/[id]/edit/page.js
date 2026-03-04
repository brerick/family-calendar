'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DateTimePicker, DatePicker } from '@/components/ui/date-time-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import RecurrenceSelector from '@/components/ui/recurrence-selector';

export default function EditEventPage({ params }) {
  const router = useRouter();
  const [eventId, setEventId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    calendar_id: '',
  });
  
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isAllDay, setIsAllDay] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState(null);

  // Unwrap params and fetch event data
  useEffect(() => {
    params.then(async (p) => {
      setEventId(p.id);
      await fetchEvent(p.id);
    });
  }, [params]);

  const fetchEvent = async (id) => {
    try {
      const res = await fetch(`/api/events/${id}`);
      if (!res.ok) throw new Error('Failed to fetch event');
      
      const event = await res.json();
      
      setFormData({
        title: event.title || '',
        description: event.description || '',
        location: event.location || '',
        calendar_id: event.calendar_id,
      });
      
      setStartDate(event.start_time ? new Date(event.start_time) : null);
      setEndDate(event.end_time ? new Date(event.end_time) : null);
      setIsAllDay(event.all_day || false);
      setRecurrenceRule(event.recurrence_rule || null);
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!startDate) {
      setError('Please select a start date');
      return;
    }

    // Validate end time is not before start time
    if (endDate && endDate < startDate) {
      setError('End time cannot be before start time');
      return;
    }
    
    setSaving(true);
    setError('');

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        start_time: startDate.toISOString(),
        end_time: endDate ? endDate.toISOString() : startDate.toISOString(),
        all_day: isAllDay,
        location: formData.location,
        recurrence_rule: recurrenceRule,
      };

      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update event');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Edit Event</h1>
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

            <RecurrenceSelector
              value={recurrenceRule}
              onChange={setRecurrenceRule}
              startDate={startDate}
            />

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                disabled={saving}
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
