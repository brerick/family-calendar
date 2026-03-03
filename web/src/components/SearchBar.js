'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function SearchBar({ calendars, onFilterChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);

  // Initialize with all calendars selected
  useEffect(() => {
    if (calendars && calendars.length > 0) {
      setSelectedCalendarIds(calendars.map(c => c.id));
    }
  }, [calendars]);

  // Notify parent of filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({ searchQuery, selectedCalendarIds });
    }
  }, [searchQuery, selectedCalendarIds, onFilterChange]);

  const handleCalendarToggle = (calendarId) => {
    setSelectedCalendarIds(prev => {
      if (prev.includes(calendarId)) {
        return prev.filter(id => id !== calendarId);
      } else {
        return [...prev, calendarId];
      }
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCalendarIds(calendars?.map(c => c.id) || []);
  };

  const hasActiveFilters = searchQuery !== '' || selectedCalendarIds.length < (calendars?.length || 0);

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-4">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search events by title, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="whitespace-nowrap"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Calendar Filters */}
      {calendars && calendars.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Filter by Calendar</Label>
          <div className="flex flex-wrap gap-3">
            {calendars.map((calendar) => (
              <label
                key={calendar.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCalendarIds.includes(calendar.id)}
                  onChange={() => handleCalendarToggle(calendar.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span className="text-sm text-gray-700">{calendar.name}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Info */}
      {(searchQuery || selectedCalendarIds.length < (calendars?.length || 0)) && (
        <div className="text-xs text-gray-500">
          {searchQuery && `Searching for "${searchQuery}"`}
          {searchQuery && selectedCalendarIds.length < (calendars?.length || 0) && ' • '}
          {selectedCalendarIds.length < (calendars?.length || 0) && 
            `Showing ${selectedCalendarIds.length} of ${calendars?.length} calendars`}
        </div>
      )}
    </div>
  );
}
