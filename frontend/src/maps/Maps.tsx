import { useMemo, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
} from '@vis.gl/react-google-maps'
import { Box, Button, useDisclosure } from '@chakra-ui/react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useParkings } from '../hooks/useParkings'
import { useDistanceMatrix } from '../hooks/useDistanceMatrix'
import {
  AutocompleteInput,
  BottomSheet,
  CarSetting,
  DirectionsLayer,
  MapController,
  ParkingInfoWindow,
  SearchRadiusCircle,
} from '../components'
import type { ParkingWithDistance, Position, SortMode } from '../types/parkings'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export const Maps = () => {
  const [apiLoaded, setApiLoaded] = useState(false)
  const [searchCenter, setSearchCenter] = useState<Position | null>(null)
  const [selected, setSelected] = useState<ParkingWithDistance | null>(null)
  const [routeTarget, setRouteTarget] = useState<Position | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('distance')
  const [filterText, setFilterText] = useState('')
  const { isOpen, onOpen, onClose } = useDisclosure()

  const userPos = useGeolocation()
  const parkings = useParkings()
  const origin = searchCenter ?? userPos
  const { sortedParkings, distanceLoading, resetCache } = useDistanceMatrix(origin, parkings, apiLoaded)

  const handlePlaceSelect = (pos: Position) => {
    setSearchCenter(pos)
    resetCache()
  }

  const displayedParkings = useMemo(() => {
    const filtered = filterText
      ? sortedParkings.filter(p => p.name.includes(filterText))
      : sortedParkings
    if (sortMode === 'price') {
      return [...filtered].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    }
    return filtered
  }, [sortedParkings, filterText, sortMode])

  if (!userPos) {
    return <Box p={8} textAlign="center">位置情報取得中...</Box>
  }

  return (
    <>
      <CarSetting />
      <APIProvider
        apiKey={GOOGLE_MAPS_API_KEY}
        libraries={['geometry']}
        onLoad={() => setApiLoaded(true)}
      >
        <Box position="relative" width="100%" height="100dvh">
          <Map
            style={{ width: '100%', height: '100%' }}
            defaultZoom={13}
            defaultCenter={userPos}
            gestureHandling="greedy"
            mapId="map_id"
            disableDefaultUI
            keyboardShortcuts={false}
            reuseMaps
          >
            <MapController center={searchCenter} />
            <DirectionsLayer origin={userPos} destination={routeTarget} />
            {origin && <SearchRadiusCircle center={origin} />}

            <AdvancedMarker position={userPos}>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="7" fill="#1976D2" stroke="white" strokeWidth="2" />
              </svg>
            </AdvancedMarker>

            {sortedParkings.map(parking => (
              <AdvancedMarker
                key={parking.id}
                position={{ lat: parking.lat, lng: parking.lng }}
                onClick={() => setSelected(parking)}
              />
            ))}

            {selected && (
              <ParkingInfoWindow
                parking={selected}
                onClose={() => { setSelected(null); setRouteTarget(null) }}
                onRouteRequest={setRouteTarget}
              />
            )}
          </Map>

          <Box
            position="absolute"
            top="12px"
            left="12px"
            right="72px"
            zIndex={10}
            bg="white"
            borderRadius="xl"
            boxShadow="md"
            px={2}
            py={1}
          >
            <AutocompleteInput onPlaceSelect={handlePlaceSelect} />
          </Box>

          <Button
            position="absolute"
            bottom="32px"
            left="50%"
            transform="translateX(-50%)"
            onClick={onOpen}
            colorScheme="blue"
            borderRadius="full"
            boxShadow="lg"
            zIndex={10}
            size="lg"
            px={8}
          >
            {distanceLoading ? '計算中...' : `${displayedParkings.length}件の駐車場`}
          </Button>
        </Box>

        <BottomSheet
          isOpen={isOpen}
          onClose={onClose}
          parkings={displayedParkings}
          selected={selected}
          onSelect={setSelected}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          filterText={filterText}
          onFilterChange={setFilterText}
          loading={distanceLoading}
        />
      </APIProvider>
    </>
  )
}
