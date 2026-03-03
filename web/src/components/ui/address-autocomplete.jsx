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

    let initAttempts = 0
    const maxAttempts = 10

    // Check if script is already loading or loaded
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`)
    
    if (!window.google?.maps && !existingScript) {
      // Load Google Maps script with Places library
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
      script.async = true
      script.defer = true
      script.id = 'google-maps-script'
      
      script.onload = () => {
        console.log('Google Maps script loaded')
        waitForPlacesLibrary()
      }
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script')
      }
      
      document.head.appendChild(script)
    } else if (window.google?.maps) {
      // Already loaded, wait for places library
      waitForPlacesLibrary()
    }

    function waitForPlacesLibrary() {
      if (window.google?.maps?.places?.Autocomplete) {
        initAutocomplete()
      } else if (initAttempts < maxAttempts) {
        initAttempts++
        console.log(`Waiting for Places library... attempt ${initAttempts}`)
        setTimeout(waitForPlacesLibrary, 500)
      } else {
        console.error('Places library failed to load after maximum attempts')
      }
    }

    function initAutocomplete() {
      if (!inputRef.current) {
        console.log('Input element not available')
        return
      }
      
      try {
        // Use legacy Autocomplete (free Places API)
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'name', 'address_components'],
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
        console.log('Google Places Autocomplete initialized successfully!')
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
