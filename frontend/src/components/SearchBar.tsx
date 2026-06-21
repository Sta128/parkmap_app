import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Position } from '../types/types'

type Props = {
  onPlaceSelect: (position: Position) => void
  filterText: string
  onFilterChange: (text: string) => void
}

export const SearchBar = ({ onPlaceSelect, filterText, onFilterChange }: Props) => {
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
    <div style={{
      padding: '10px 12px',
      borderBottom: '1px solid #eee',
      background: '#f9f9f9',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <input
        ref={inputRef}
        type="text"
        placeholder="エリアを検索（例：渋谷、新宿駅）"
        style={{
          width: '100%',
          padding: '8px 10px',
          fontSize: '13px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxSizing: 'border-box',
        }}
      />
      <input
        type="text"
        placeholder="名前・住所で絞り込む"
        value={filterText}
        onChange={e => onFilterChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          fontSize: '13px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
