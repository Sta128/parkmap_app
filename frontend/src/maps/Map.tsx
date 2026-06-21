import { useState } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
} from '@vis.gl/react-google-maps'
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { CarSetting } from '../components/CarSetting'
import { MapController } from '../components/MapController'
import { DirectionsLayer } from '../components/DirectionsLayer'
import { SearchBar } from '../components/SearchBar'
import { ParkingList } from '../components/ParkingList'
import { ParkingInfoWindow } from '../components/ParkingInfoWindow'
import { useParkingSearch } from '../hooks/useParkingSearch'
import type { ParkingWithDistance } from '../types/types'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export const Maps = () => {
  const [apiLoaded, setApiLoaded] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()

  const {
    userPos,
    sortedParkings,
    displayedParkings,
    selected,
    setSelected,
    routeTarget,
    setRouteTarget,
    distanceLoading,
    filterText,
    setFilterText,
    sortMode,
    setSortMode,
    searchCenter,
    handlePlaceSelect,
  } = useParkingSearch(apiLoaded)

  const handleSelectParking = (parking: ParkingWithDistance) => {
    setSelected(parking)
    onClose()
  }

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

          {/* 地図（フルスクリーン） */}
          <Map
            style={{ width: '100%', height: '100%' }}
            defaultZoom={13}
            defaultCenter={userPos}
            defaultHeading={0}
            defaultTilt={0}
            gestureHandling={'greedy'}
            headingInteractionEnabled={true}
            mapId={'map_id'}
            disableDefaultUI={true}
            keyboardShortcuts={false}
            reuseMaps={true}
          >
            <MapController center={searchCenter} />
            <DirectionsLayer origin={userPos} destination={routeTarget} />

            {/* 現在地マーカー */}
            <AdvancedMarker position={userPos}>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="7" fill="#1976D2" stroke="white" strokeWidth="2" />
              </svg>
            </AdvancedMarker>

            {/* 駐車場マーカー */}
            {sortedParkings.map(parking => (
              <AdvancedMarker
                key={parking.id}
                position={{ lat: parking.lat, lng: parking.lng }}
                onClick={() => setSelected(parking)}
              />
            ))}

            {/* InfoWindow */}
            {selected && (
              <ParkingInfoWindow
                parking={selected}
                onClose={() => { setSelected(null); setRouteTarget(null) }}
                onRouteRequest={setRouteTarget}
              />
            )}
          </Map>

          {/* 検索バー（地図上に浮かせる） */}
          <Box
            position="absolute"
            top="12px"
            left="12px"
            right="12px"
            zIndex={10}
            bg="white"
            borderRadius="xl"
            boxShadow="md"
            overflow="hidden"
          >
            <SearchBar
              onPlaceSelect={handlePlaceSelect}
              filterText={filterText}
              onFilterChange={setFilterText}
            />
          </Box>

          {/* リスト表示ボタン */}
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

        {/* ボトムシート */}
        <Drawer isOpen={isOpen} placement="bottom" onClose={onClose}>
          <DrawerOverlay />
          <DrawerContent borderTopRadius="20px" maxH="70dvh">
            <DrawerCloseButton />
            <DrawerHeader borderBottomWidth="1px" pb={3}>
              <HStack justify="space-between" align="center" pr={6}>
                <Text fontSize="sm" color="gray.500">
                  {distanceLoading ? '計算中...' : `${displayedParkings.length}件`}
                </Text>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    variant={sortMode === 'distance' ? 'solid' : 'outline'}
                    colorScheme="blue"
                    borderRadius="full"
                    onClick={() => setSortMode('distance')}
                  >
                    距離順
                  </Button>
                  <Button
                    size="sm"
                    variant={sortMode === 'price' ? 'solid' : 'outline'}
                    colorScheme="blue"
                    borderRadius="full"
                    onClick={() => setSortMode('price')}
                  >
                    料金順
                  </Button>
                </HStack>
              </HStack>
            </DrawerHeader>
            <DrawerBody p={0} overflowY="auto">
              <ParkingList
                parkings={displayedParkings}
                selected={selected}
                onSelect={handleSelectParking}
              />
            </DrawerBody>
          </DrawerContent>
        </Drawer>

      </APIProvider>
    </>
  )
}
