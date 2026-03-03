'use client'

import * as React from "react"
import { Label } from "@/components/ui/label"
import { MapPinIcon } from "lucide-react"

export function AddressAutocomplete({ value, onChange, label, placeholder = "Enter an address..." }) {
  const [inputValue, setInputValue] = React.useState(value || "")
  const autocompleteElementRef = React.useRef(null)
  const containerRef = React.useRef(null)
  
  React.useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "")
    }
  }, [value])

  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    
    if (!apiKey || !containerRef.current) {
      console.log('Google Maps API key missing or container not ready')
      return
    }

    // Check if script is already loading or loaded
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`)
    
    if (!window.google?.maps && !existingScript) {
      // Load Google Maps script with Places API (New)
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`
      script.async = true
      script.defer = true
      script.id = 'google-maps-script'
      
      script.onload = () => {
        initAutocomplete()
      }
      
      document.head.appendChild(script)
    } else if (window.google?.maps) {
      // Already loaded, initialize directly
      initAutocomplete()
    }

    function initAutocomplete() {
      if (!containerRef.current || !window.google?.maps?.places?.PlaceAutocompleteElement) {
        console.log('Google Maps Places API (New) not available')
        return
      }
      
      try {
        // Use new PlaceAutocompleteElement (recommended)
        const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
          componentRestrictions: { country: [] },
        })
        
        // Set initial value if exists
        if (inputValue) {
          autocompleteElement.value = inputValue
        }
        
        // Listen for place selection
        autocompleteElement.addEventListener('gmp-placeselect', async ({ place }) => {
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress'],
          })
          
          const address = place.formattedAddress || place.displayName
          if (address) {
            setInputValue(address)
            onChange(address)
          }
        })
        
        // Replace the placeholder div with the autocomplete element
        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(autocompleteElement)
        autocompleteElementRef.current = autocompleteElement
        
        console.log('Google Places Autocomplete (New API) initialized')
      } catch (error) {
        console.error('Error initializing autocomplete:', error)
      }
    }

    return () => {
      // Cleanup
      if (autocompleteElementRef.current) {
        autocompleteElementRef.current.remove()
      }
    }
  }, [])

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <div 
          ref={containerRef}
          className="w-full"
          style={{
            '--gmp-autocomplete-padding-inline-start': '2.25rem',
            '--gmp-autocomplete-padding-inline-end': '0.75rem',
            '--gmp-autocomplete-padding-block': '0.25rem',
            '--gmp-autocomplete-border-color': 'hsl(var(--input))',
            '--gmp-autocomplete-border-radius': 'calc(var(--radius) - 2px)',
            '--gmp-autocomplete-font-size': '0.875rem',
            '--gmp-autocomplete-background': 'transparent',
          }}
        />
      </div>
    </div>
  )
}
