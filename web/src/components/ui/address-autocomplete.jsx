'use client'

import * as React from "react"
import { useLoadScript, Autocomplete } from "@react-google-maps/api"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPinIcon } from "lucide-react"

const libraries = ["places"]

export function AddressAutocomplete({ value, onChange, label, placeholder = "Enter an address..." }) {
  const [autocomplete, setAutocomplete] = React.useState(null)
  const [inputValue, setInputValue] = React.useState(value || "")
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  })

  React.useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "")
    }
  }, [value])

  const onLoad = (autocompleteObj) => {
    setAutocomplete(autocompleteObj)
  }

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace()
      
      if (place.formatted_address) {
        setInputValue(place.formatted_address)
        onChange(place.formatted_address)
      } else if (place.name) {
        setInputValue(place.name)
        onChange(place.name)
      }
    }
  }

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
  }

  // Fallback if Google Maps doesn't load
  if (loadError) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
        />
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Autocomplete
          onLoad={onLoad}
          onPlaceChanged={onPlaceChanged}
          options={{
            fields: ["formatted_address", "name", "place_id"],
          }}
        >
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pl-9"
          />
        </Autocomplete>
      </div>
    </div>
  )
}
