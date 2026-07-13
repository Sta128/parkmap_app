import {
  Box,
  Button,
  Flex,
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
import { ArrowForwardIcon } from '@chakra-ui/icons'
import { ParkingCard } from './ParkingCard'
import { DateTimeDial } from './DateTimeDial'
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
  minDateTime: Date
  maxDateTime: Date
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
  minDateTime,
  maxDateTime,
}: Props) => (
  <Drawer isOpen={isOpen} placement="bottom" onClose={onClose}>
    <DrawerOverlay />
    <DrawerContent maxH="90dvh" borderTopRadius="xl" overflow="hidden">
      <DrawerCloseButton />

      <DrawerHeader pb={2}>駐車場検索</DrawerHeader>

      <DrawerBody overflowY="auto" overscrollBehavior="contain" pt={0} pb="max(16px, env(safe-area-inset-bottom))">
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

              <Flex
                direction={{ base: 'column', lg: 'row' }}
                align="stretch"
                gap={3}
                width="100%"
              >
                <Box flex="1" minW={0}>
                  <DateTimeDial
                    label="開始日時"
                    value={startTime}
                    min={minDateTime}
                    max={maxDateTime}
                    onChange={onStartTimeChange}
                  />
                </Box>

                <Flex
                  align="center"
                  justify="center"
                  color="blue.500"
                  flexShrink={0}
                  px={{ base: 0, lg: 1 }}
                  py={{ base: 0, lg: 2 }}
                >
                  <ArrowForwardIcon
                    boxSize={6}
                    transform={{ base: 'rotate(90deg)', lg: 'none' }}
                    aria-label="開始日時から終了日時へ"
                  />
                </Flex>

                <Box flex="1" minW={0}>
                  <DateTimeDial
                    label="終了日時"
                    value={endTime}
                    min={startTime ? new Date(startTime) : minDateTime}
                    max={maxDateTime}
                    onChange={onEndTimeChange}
                  />
                </Box>
              </Flex>

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

        <Box h={3} />
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