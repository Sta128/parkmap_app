import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Position } from '../types/parkings'

type Props = {
  onPlaceSelect: (position: Position) => void
}

export const AutocompleteInput = ({ onPlaceSelect }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const placesLib = useMapsLibrary('places')

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.geometry?.location) {
        onPlaceSelect({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        })
      }
    })

    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete)
    }
  }, [placesLib, onPlaceSelect])

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="エリアを検索（例：渋谷、新宿駅）"
      style={{
        width: '100%',
        padding: '8px 12px',
        fontSize: '13px',
        border: 'none',
        outline: 'none',
        borderRadius: '8px',
        background: 'transparent',
      }}
    />
  )
}
