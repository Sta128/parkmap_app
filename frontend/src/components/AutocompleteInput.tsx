import { useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { Position } from '../types/parkings'

type Props = {
  onPlaceSelect: (position: Position) => void
}

const removeAutocompleteContainers = () => {
  document.querySelectorAll<HTMLElement>('.pac-container').forEach(container => {
    container.remove()
  })
}

export const AutocompleteInput = ({ onPlaceSelect }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  const placesLib = useMapsLibrary('places')

  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect
  }, [onPlaceSelect])

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    // Google Placesは生成のたびにbody直下へ候補要素を追加するため、
    // HMRや再マウントで残った古い候補を先に破棄する。
    removeAutocompleteContainers()

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry'],
    })

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.geometry?.location) {
        onPlaceSelectRef.current({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        })
        inputRef.current?.blur()
      }
    })

    return () => {
      listener.remove()
      window.google.maps.event.clearInstanceListeners(autocomplete)
      removeAutocompleteContainers()
    }
  }, [placesLib])

  return (
    <input
      ref={inputRef}
      type="text"
      autoComplete="off"
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
