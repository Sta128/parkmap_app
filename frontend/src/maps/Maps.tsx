import { useCallback, useMemo, useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
} from '@vis.gl/react-google-maps'
import {
  Box,
  Button,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useParkings } from '../hooks/useParkings'
import { useDistanceMatrix } from '../hooks/useDistanceMatrix'
import {
  AutocompleteInput,
  BottomSheet,
  DirectionsLayer,
  MapController,
  ParkingInfoWindow,
  SearchRadiusCircle,
} from '../components'
import type { ParkingWithDistance, Position, SortMode } from '../types/parkings'
import { parkingApi } from '../features/parkings/api/parkingApi'
import { VehicleSettings } from '../features/vehicles/components/VehicleSettings'
import { useVehicles } from '../features/vehicles/hooks/useVehicles'
import { matchesJapaneseText } from '../lib/searchNormalization'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const SEARCH_RADIUS_OPTIONS = [0.5, 1, 2, 3, 5, 10, 20, 30, 50, 100, 200] as const

const padDatePart = (value: number) => String(value).padStart(2, '0')

const toLocalDateTimeValue = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`

const roundUpToQuarterHour = (date: Date) => {
  const next = new Date(date)
  next.setSeconds(0, 0)
  const remainder = next.getMinutes() % 15
  if (remainder !== 0) next.setMinutes(next.getMinutes() + (15 - remainder))
  return next
}

const addYears = (date: Date, years: number) => {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

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

        {/* 中央に空車台数 */}
        <text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          stroke="black"
          strokeWidth="1.0"
          paintOrder="stroke"
          fontSize={available >= 100 ? 12 : 15}
          fontWeight="700"
        >
          {Math.max(0, available)}
        </text>
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
  const [dateTimeBounds] = useState(() => {
    const min = roundUpToQuarterHour(new Date())
    return { min, max: addYears(min, 3) }
  })
  const [startTime, setStartTime] = useState(() => toLocalDateTimeValue(dateTimeBounds.min))
  const [endTime, setEndTime] = useState(() => {
    const end = new Date(dateTimeBounds.min)
    end.setHours(end.getHours() + 1)
    return toLocalDateTimeValue(end)
  })
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceParkings, setPriceParkings] = useState<ParkingWithDistance[]>([])
  const [searchRadiusKm, setSearchRadiusKm] = useState(5)

  const { isOpen, onOpen, onClose } = useDisclosure()
  const { selectedVehicle } = useVehicles()

  const userPos = useGeolocation()
  const { parkings, loading: parkingsLoading, error: parkingsError } = useParkings()
  const origin = searchCenter ?? userPos
  const { sortedParkings, distanceLoading, resetCache } =
    useDistanceMatrix(origin, parkings, apiLoaded, searchRadiusKm * 1000)

  const handlePlaceSelect = useCallback((pos: Position) => {
    setSearchCenter(pos)
    resetCache()
    setPriceParkings([])
  }, [resetCache])

  const radiusDialIndex = SEARCH_RADIUS_OPTIONS.findIndex(radius => radius === searchRadiusKm)

  const handleRadiusDialChange = (index: number) => {
    const nextRadius = SEARCH_RADIUS_OPTIONS[index] ?? 5
    setSearchRadiusKm(nextRadius)
    setPriceParkings([])
    resetCache()
  }

  const handleStartTimeChange = (value: string) => {
    setStartTime(value)

    const nextStart = new Date(value)
    const currentEnd = new Date(endTime)
    if (!Number.isNaN(nextStart.getTime()) && (Number.isNaN(currentEnd.getTime()) || currentEnd <= nextStart)) {
      const nextEnd = new Date(nextStart)
      nextEnd.setHours(nextEnd.getHours() + 1)
      if (nextEnd > dateTimeBounds.max) nextEnd.setTime(dateTimeBounds.max.getTime())
      setEndTime(toLocalDateTimeValue(nextEnd))
    }
  }

  const handleEndTimeChange = (value: string) => {
    const nextEnd = new Date(value)
    const currentStart = new Date(startTime)
    if (nextEnd <= currentStart) {
      const adjusted = new Date(currentStart)
      adjusted.setMinutes(adjusted.getMinutes() + 15)
      if (adjusted > dateTimeBounds.max) adjusted.setTime(dateTimeBounds.max.getTime())
      setEndTime(toLocalDateTimeValue(adjusted))
      return
    }
    setEndTime(value)
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
        vehicleWeight: selectedVehicle?.weight,
        groundClearance: selectedVehicle?.groundClearance,
        requiresEv: selectedVehicle?.isEv,
        requiresCashless: selectedVehicle?.requiresCashless,
        lightVehicle: selectedVehicle?.isLightVehicle,
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
          (p.min_ground_clearance == null || selectedVehicle.groundClearance >= p.min_ground_clearance) &&
          (!p.is_light_only || selectedVehicle.isLightVehicle) &&
          (!selectedVehicle.isEv || p.is_ev_available) &&
          (!selectedVehicle.requiresCashless || p.is_cashless)
        )
      : baseParkings

    const filtered = filterText
      ? vehicleFiltered.filter(p => matchesJapaneseText(`${p.name} ${p.address ?? ''}`, filterText))
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
      <VehicleSettings />

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
            {origin && <SearchRadiusCircle center={origin} radiusM={searchRadiusKm * 1000} />}

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
                navigationOrigin={userPos}
              />
            )}
          </Map>

          <Box
            position="absolute"
            top="12px"
            left="12px"
            right="72px"
            zIndex={10}
            display="flex"
            alignItems="center"
            gap={1}
            bg="white"
            borderRadius="xl"
            boxShadow="md"
            px={2}
            py={1}
          >
            <Box flex="1" minW={0}>
              <AutocompleteInput onPlaceSelect={handlePlaceSelect} />
            </Box>
            <Popover placement="bottom-end" closeOnBlur>
              <PopoverTrigger>
                <Button
                  aria-label={`検索範囲 ${searchRadiusKm}km`}
                  size="sm"
                  minW="66px"
                  flexShrink={0}
                  borderRadius="full"
                  variant="ghost"
                  borderLeft="1px solid"
                  borderColor="gray.200"
                  fontWeight="700"
                >
                  {searchRadiusKm} km
                </Button>
              </PopoverTrigger>
              <PopoverContent width="260px" mr={2}>
                <PopoverArrow />
                <PopoverBody px={4} py={3}>
                  <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={3}>
                    <Text fontSize="sm" fontWeight="700">検索範囲</Text>
                    <Text fontSize="lg" fontWeight="800">{searchRadiusKm} km</Text>
                  </Box>
                  <Slider
                    aria-label="検索範囲ダイヤル"
                    min={0}
                    max={SEARCH_RADIUS_OPTIONS.length - 1}
                    step={1}
                    value={radiusDialIndex >= 0 ? radiusDialIndex : 4}
                    onChange={handleRadiusDialChange}
                    focusThumbOnChange={false}
                  >
                    <SliderTrack height="8px" borderRadius="full">
                      <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb boxSize="22px" boxShadow="md" />
                  </Slider>
                  <Box display="flex" justifyContent="space-between" mt={2}>
                    <Text fontSize="xs" color="gray.500">0.5 km</Text>
                    <Text fontSize="xs" color="gray.500">200 km</Text>
                  </Box>
                </PopoverBody>
              </PopoverContent>
            </Popover>
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
          onStartTimeChange={handleStartTimeChange}
          onEndTimeChange={handleEndTimeChange}
          onPriceSearch={handlePriceSearch}
          minDateTime={dateTimeBounds.min}
          maxDateTime={dateTimeBounds.max}
        />
      </APIProvider>
    </>
  )
}