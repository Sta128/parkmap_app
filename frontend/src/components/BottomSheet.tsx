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
}: Props) => (
  <Drawer isOpen={isOpen} placement="bottom" onClose={onClose}>
    <DrawerOverlay />
    <DrawerContent maxH="70dvh" borderTopRadius="xl">
      <DrawerCloseButton />
      <DrawerHeader pb={2}>
        <HStack spacing={2} mb={2}>
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
        <Input
          placeholder="名前でフィルター..."
          size="sm"
          value={filterText}
          onChange={e => onFilterChange(e.target.value)}
        />
      </DrawerHeader>
      <DrawerBody overflowY="auto" pt={0}>
        {loading && (
          <Text color="gray.500" textAlign="center" py={4} fontSize="sm">
            距離を計算中...
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
            onClick={() => { onSelect(p); onClose() }}
          />
        ))}
        <Box h={4} />
      </DrawerBody>
    </DrawerContent>
  </Drawer>
)
