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
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { ParkingCard } from './ParkingCard'
import type { ParkingWithDistance, SortMode } from '../types/parkings'

type Props = {
  isOpen: boolean
  onClose: () => void
  parkings: ParkingWithDistance[]
  selected: ParkingWithDistance | null
  onSelect: (parking: ParkingWithDistance) => void
  sortMode: SortMode
  onSortModeChange: (mode: SortMode) => void
  filterText: string
  onFilterChange: (text: string) => void
  loading: boolean

  startTime: string
  endTime: string
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onPriceSearch: () => void
}

export const BottomSheet = ({
  isOpen,
  onClose,
  parkings,
  selected,
  onSelect,
  sortMode,
  onSortModeChange,
  filterText,
  onFilterChange,
  loading,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onPriceSearch,
}: Props) => (
  <Drawer isOpen={isOpen} placement="bottom" onClose={onClose}>
    <DrawerOverlay />
    <DrawerContent maxH="70dvh" borderTopRadius="xl">
      <DrawerCloseButton />

      <DrawerHeader pb={2}>
        <VStack align="stretch" spacing={2}>
          <HStack spacing={2}>
            <Button
              size="sm"
              colorScheme={sortMode === 'distance' ? 'blue' : 'gray'}
              onClick={() => onSortModeChange('distance')}
            >
              距離順
            </Button>

            <Button
              size="sm"
              colorScheme={sortMode === 'price' ? 'blue' : 'gray'}
              onClick={() => onSortModeChange('price')}
            >
              料金順
            </Button>
          </HStack>

          {sortMode === 'price' && (
            <VStack align="stretch" spacing={2}>
              <Text fontSize="sm">利用時間を指定</Text>

              <Input
                type="datetime-local"
                size="sm"
                value={startTime}
                onChange={e => onStartTimeChange(e.target.value)}
              />

              <Input
                type="datetime-local"
                size="sm"
                value={endTime}
                onChange={e => onEndTimeChange(e.target.value)}
              />

              <Button
                size="sm"
                colorScheme="blue"
                onClick={onPriceSearch}
                isLoading={loading}
              >
                料金順で検索
              </Button>
            </VStack>
          )}

          <Input
            placeholder="名前でフィルター..."
            size="sm"
            value={filterText}
            onChange={e => onFilterChange(e.target.value)}
          />
        </VStack>
      </DrawerHeader>

      <DrawerBody overflowY="auto" pt={0}>
        {loading && (
          <Text color="gray.500" textAlign="center" py={4} fontSize="sm">
            検索中...
          </Text>
        )}

        {!loading && parkings.length === 0 && (
          <Text color="gray.500" textAlign="center" py={4} fontSize="sm">
            近くに駐車場が見つかりません
          </Text>
        )}

        {parkings.map(p => (
          <ParkingCard
            key={p.id}
            parking={p}
            isSelected={selected?.id === p.id}
            onClick={() => {
              onSelect(p)
              onClose()
            }}
          />
        ))}

        <Box h={4} />
      </DrawerBody>
    </DrawerContent>
  </Drawer>
)