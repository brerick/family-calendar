'use client'

import * as React from "react"
import { Label } from "@/components/ui/label"
import { MapPinIcon } from "lucide-react"

export function AddressAutocomplete({ value, onChange, label, placeholder = "Enter an address..." }) {
  const [inputValue, setInputValue] = React.useState(value || "")
  const autocompleteRef = React.useRef(null)
  const inputRef = React.useRef(null)
  
  React.useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "")
    }
  }, [value])

  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey || !inputRef.current) {
      console.log('Google Maps API key missing or input not ready')
      return
    }

    // Load Google Maps script if not already loaded
    if (!window.google?.maps) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap&loading=async`
      script.async = true
      script.defer = true
      
      window.initMap = () => {
        initAutocomplete()
      }
      
      document.head.appendChild(script)
    } else {
      initAutocomplete()
    }

    function initAutocomplete() {
      if (!inputRef.current || !window.google?.maps?.places) {
        console.log('Google Maps Places API not available')
        return
      }
      
      try {
        // Use standard Autocomplete API (still fully supported)
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'name', 'geometry'],
          types: ['address', 'establishment'],
        })
        
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          const address = place.formatted_address || place.name
          if (address) {
            setInputValue(address)
            onChange(address)
          }
        })
        
        autocompleteRef.current = autocomplete
        console.log('Google Places Autocomplete initialized')
      } catch (error) {
        console.error('Error initializing autocomplete:', error)
      }
    }

    return () => {
      // Cleanup
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
      </div>
    </div>
  )
}
