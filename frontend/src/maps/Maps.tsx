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
import { parkingApi } from '../features/parkings/api/parkingApi'
import { useVehicles } from '../features/vehicles/hooks/useVehicles'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

type ParkingMarkerProps = {
  available: number
  capacity: number
}

export default function ParkingMarker({
  available,
  capacity
}: ParkingMarkerProps) {

  const ratio = available / capacity

  const r = 22
  const cx = 25
  const cy = 25

  const angle = ratio * 360

  const x = cx + r * Math.sin(angle * Math.PI / 180)
  const y = cy - r * Math.cos(angle * Math.PI / 180)

  const largeArc = angle > 180 ? 1 : 0

  const greenArc = `
    M ${cx} ${cy}
    L ${cx} ${cy-r}
    A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}
    Z
  `

  return (
    <div>
      <svg width="50" height="60" viewBox="0 0 50 60">

        {/* ピン先端 */}
        <path
          d="M25 58 L15 42 L35 42 Z"
          fill="black"
        />

        {/* 使用中(赤) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="#ff2d2d"
          stroke="black"
          strokeWidth="2"
        />

        {/* 空き(緑) */}
        <path
          d={greenArc}
          fill="#b7df2d"
        />
      </svg>
    </div>
  )
}

export const Maps = () => {
  const [apiLoaded, setApiLoaded] = useState(false)
  const [searchCenter, setSearchCenter] = useState<Position | null>(null)
  const [selected, setSelected] = useState<ParkingWithDistance | null>(null)
  const [routeTarget, setRouteTarget] = useState<Position | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('distance')
  const [filterText, setFilterText] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceParkings, setPriceParkings] = useState<ParkingWithDistance[]>([])

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { selectedVehicle } = useVehicles()

  const userPos = useGeolocation()
  const { parkings, loading: parkingsLoading, error: parkingsError } = useParkings()
  const origin = searchCenter ?? userPos
  const { sortedParkings, distanceLoading, resetCache } =
    useDistanceMatrix(origin, parkings, apiLoaded)

  const handlePlaceSelect = (pos: Position) => {
    setSearchCenter(pos)
    resetCache()
    setPriceParkings([])
  }

  const handlePriceSearch = async () => {
    if (!startTime || !endTime) {
      alert('開始日時と終了日時を入力してください')
      return
    }

    setPriceLoading(true)

    try {
      const data = await parkingApi.searchByPrice({
        start: `${startTime}:00+09:00`,
        end: `${endTime}:00+09:00`,
        vehicleHeight: selectedVehicle?.height,
        vehicleWidth: selectedVehicle?.width,
        vehicleLength: selectedVehicle?.length,
        groundClearance: selectedVehicle?.groundClearance,
      })

      const nearbyById = new globalThis.Map(sortedParkings.map(parking => [parking.id, parking]))
      const merged = data.flatMap((p: ParkingWithDistance & { total_fee?: number }) => {
        const original = nearbyById.get(p.id)
        if (!original) return []

        return [{
          ...original,
          ...p,
          price: p.total_fee,
          distanceText: original.distanceText,
          distanceValue: original.distanceValue,
          durationText: original.durationText,
        } as ParkingWithDistance]
      })

      setPriceParkings(merged)
    } catch (err) {
      console.error(err)
      alert('料金検索に失敗しました')
    } finally {
      setPriceLoading(false)
    }
  }

  const handleSortModeChange = (mode: SortMode) => {
    setSortMode(mode)

    if (mode === 'distance') {
      setPriceParkings([])
    }
  }

  const displayedParkings = useMemo(() => {
    const baseParkings =
      sortMode === 'price' && priceParkings.length > 0
        ? priceParkings
        : sortedParkings

    const vehicleFiltered = selectedVehicle
      ? baseParkings.filter(p =>
          (p.max_height == null || selectedVehicle.height <= p.max_height) &&
          (p.max_width == null || selectedVehicle.width <= p.max_width) &&
          (p.max_length == null || selectedVehicle.length <= p.max_length) &&
          (p.min_ground_clearance == null || selectedVehicle.groundClearance >= p.min_ground_clearance)
        )
      : baseParkings

    const filtered = filterText
      ? vehicleFiltered.filter(p => p.name.toLowerCase().includes(filterText.toLowerCase()))
      : vehicleFiltered

    if (sortMode === 'price') {
      return [...filtered].sort(
        (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)
      )
    }

    return filtered
  }, [sortedParkings, priceParkings, filterText, sortMode, selectedVehicle])

  if (!userPos) {
    return <Box p={8} textAlign="center">位置情報取得中...</Box>
  }

  if (parkingsError) {
    console.error(parkingsError)
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
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  fill="#1976D2"
                  stroke="white"
                  strokeWidth="2"
                />
              </svg>
            </AdvancedMarker>

            {displayedParkings.map(parking => (
              <AdvancedMarker
                key={parking.id}
                position={{ lat: parking.lat, lng: parking.lng }}
                onClick={() => setSelected(parking)}
              >
            <ParkingMarker
              available={parking.available ?? 0}
              capacity={parking.capacity ?? 1}
            />
              </AdvancedMarker>
            ))}

            {selected && (
              <ParkingInfoWindow
                parking={selected}
                onClose={() => {
                  setSelected(null)
                  setRouteTarget(null)
                }}
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
            {distanceLoading || priceLoading || parkingsLoading
              ? '計算中...'
              : `${displayedParkings.length}件の駐車場`}
          </Button>
        </Box>

        <BottomSheet
          isOpen={isOpen}
          onClose={onClose}
          parkings={displayedParkings}
          selected={selected}
          onSelect={setSelected}
          sortMode={sortMode}
          onSortModeChange={handleSortModeChange}
          filterText={filterText}
          onFilterChange={setFilterText}
          loading={distanceLoading || priceLoading || parkingsLoading}
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onPriceSearch={handlePriceSearch}
        />
      </APIProvider>
    </>
  )
}