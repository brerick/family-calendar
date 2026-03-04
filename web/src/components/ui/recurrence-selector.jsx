'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-time-picker';

export default function RecurrenceSelector({ value, onChange, startDate }) {
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState('weekly');
  const [interval, setInterval] = useState(1);
  const [endType, setEndType] = useState('never'); // 'never', 'until', 'count'
  const [endDate, setEndDate] = useState(null);
  const [count, setCount] = useState(10);
  const [byweekday, setByweekday] = useState([]);

  // Parse existing value
  useEffect(() => {
    if (value) {
      try {
        const rule = JSON.parse(value);
        setEnabled(true);
        setFrequency(rule.frequency || 'weekly');
        setInterval(rule.interval || 1);
        setByweekday(rule.byweekday || []);
        
        if (rule.until) {
          setEndType('until');
          setEndDate(new Date(rule.until));
        } else if (rule.count) {
          setEndType('count');
          setCount(rule.count);
        } else {
          setEndType('never');
        }
      } catch (e) {
        console.error('Failed to parse recurrence rule:', e);
      }
    }
  }, [value]);

  // Update parent when values change
  useEffect(() => {
    if (!enabled) {
      onChange(null);
      return;
    }

    const rule = {
      frequency,
      interval: parseInt(interval) || 1,
    };

    if (frequency === 'weekly' && byweekday.length > 0) {
      rule.byweekday = byweekday;
    }

    if (endType === 'until' && endDate) {
      rule.until = endDate.toISOString();
    } else if (endType === 'count' && count) {
      rule.count = parseInt(count) || 10;
    }

    onChange(JSON.stringify(rule));
  }, [enabled, frequency, interval, endType, endDate, count, byweekday, onChange]);

  const toggleWeekday = (day) => {
    setByweekday(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const weekdays = [
    { value: 0, label: 'Su' },
    { value: 1, label: 'Mo' },
    { value: 2, label: 'Tu' },
    { value: 3, label: 'We' },
    { value: 4, label: 'Th' },
    { value: 5, label: 'Fr' },
    { value: 6, label: 'Sa' },
  ];

  const getFrequencyLabel = () => {
    const labels = {
      daily: 'day(s)',
      weekly: 'week(s)',
      monthly: 'month(s)',
      yearly: 'year(s)',
    };
    return labels[frequency] || 'occurrence(s)';
  };

  const getSummary = () => {
    if (!enabled) return 'Does not repeat';

    let summary = `Repeats every ${interval > 1 ? interval + ' ' : ''}`;
    
    switch (frequency) {
      case 'daily':
        summary += interval === 1 ? 'day' : 'days';
        break;
      case 'weekly':
        summary += interval === 1 ? 'week' : 'weeks';
        if (byweekday.length > 0) {
          const dayNames = byweekday.map(d => weekdays.find(w => w.value === d)?.label).join(', ');
          summary += ` on ${dayNames}`;
        }
        break;
      case 'monthly':
        summary += interval === 1 ? 'month' : 'months';
        break;
      case 'yearly':
        summary += interval === 1 ? 'year' : 'years';
        break;
    }

    if (endType === 'until' && endDate) {
      summary += `, until ${endDate.toLocaleDateString()}`;
    } else if (endType === 'count') {
      summary += `, ${count} times`;
    }

    return summary;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Repeat</Label>
        <Button
          type="button"
          variant={enabled ? "default" : "outline"}
          size="sm"
          onClick={() => setEnabled(!enabled)}
        >
          {enabled ? 'Repeating' : 'Does not repeat'}
        </Button>
      </div>

      {enabled && (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
          {/* Frequency Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="frequency" className="text-xs">Frequency</Label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval" className="text-xs">Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  max="99"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="text-sm"
                />
                <span className="text-xs text-gray-600 whitespace-nowrap">{getFrequencyLabel()}</span>
              </div>
            </div>
          </div>

          {/* Weekly: Day Selection */}
          {frequency === 'weekly' && (
            <div className="space-y-2">
              <Label className="text-xs">Repeat on</Label>
              <div className="flex gap-1">
                {weekdays.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                      byweekday.includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End Condition */}
          <div className="space-y-2">
            <Label className="text-xs">Ends</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  value="never"
                  checked={endType === 'never'}
                  onChange={(e) => setEndType(e.target.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm">Never</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  value="until"
                  checked={endType === 'until'}
                  onChange={(e) => setEndType(e.target.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm">On</span>
                {endType === 'until' && (
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    className="flex-1"
                  />
                )}
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endType"
                  value="count"
                  checked={endType === 'count'}
                  onChange={(e) => setEndType(e.target.value)}
                  className="h-4 w-4"
                />
                <span className="text-sm">After</span>
                {endType === 'count' && (
                  <Input
                    type="number"
                    min="1"
                    max="999"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="w-20 text-sm"
                  />
                )}
                {endType === 'count' && <span className="text-sm text-gray-600">occurrences</span>}
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-3 border-t">
            <p className="text-sm font-medium text-gray-700">{getSummary()}</p>
          </div>
        </div>
      )}

      {!enabled && (
        <p className="text-sm text-gray-500">{getSummary()}</p>
      )}
    </div>
  );
}
