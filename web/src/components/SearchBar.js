'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

export default function SearchBar({ onFilterChange }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Notify parent of filter changes
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({ searchQuery });
    }
  }, [searchQuery, onFilterChange]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="bg-white rounded-lg shadow p-3 md:p-4 mb-4">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search events by title, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search hint */}
      {searchQuery && (
        <div className="mt-2 text-xs text-gray-500">
          Searching for "{searchQuery}"
        </div>
      )}
    </div>
  );
}
