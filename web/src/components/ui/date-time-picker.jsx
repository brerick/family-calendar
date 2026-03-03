'use client'

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DateTimePicker({
  date,
  setDate,
  includeTime = true,
  label,
  required = false,
}) {
  const [selectedDate, setSelectedDate] = React.useState(date)
  const [timeValue, setTimeValue] = React.useState(
    date ? format(date, "HH:mm") : "09:00"
  )

  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      setTimeValue(format(date, "HH:mm"))
    }
  }, [date])

  const handleDateSelect = (newDate) => {
    if (!newDate) return
    
    // Preserve the time if we're including time
    if (includeTime && selectedDate) {
      const [hours, minutes] = timeValue.split(':')
      newDate.setHours(parseInt(hours), parseInt(minutes))
    }
    
    setSelectedDate(newDate)
    setDate(newDate)
  }

  const handleTimeChange = (e) => {
    const time = e.target.value
    setTimeValue(time)
    
    if (selectedDate) {
      const [hours, minutes] = time.split(':')
      const newDate = new Date(selectedDate)
      newDate.setHours(parseInt(hours), parseInt(minutes))
      setDate(newDate)
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {includeTime && (
          <Input
            type="time"
            value={timeValue}
            onChange={handleTimeChange}
            className="w-[130px]"
          />
        )}
      </div>
    </div>
  )
}

export function DatePicker({
  date,
  setDate,
  label,
  required = false,
}) {
  return (
    <DateTimePicker
      date={date}
      setDate={setDate}
      label={label}
      required={required}
      includeTime={false}
    />
  )
}
