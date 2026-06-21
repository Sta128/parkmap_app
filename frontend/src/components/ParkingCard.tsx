import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react'
import type { ParkingWithDistance } from '../types/parkings'

type Props = {
  parking: ParkingWithDistance
  isSelected: boolean
  onClick: () => void
}

export const ParkingCard = ({ parking, isSelected, onClick }: Props) => (
  <Box
    p={3}
    mb={2}
    borderRadius="lg"
    border="1px solid"
    borderColor={isSelected ? 'blue.400' : 'gray.200'}
    bg={isSelected ? 'blue.50' : 'white'}
    cursor="pointer"
    onClick={onClick}
  >
    <VStack align="start" spacing={1}>
      <HStack justify="space-between" w="full">
        <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
          {parking.name}
        </Text>
        <Badge
          colorScheme={parking.status === '空車' ? 'green' : parking.status === '満車' ? 'red' : 'yellow'}
          fontSize="xs"
        >
          {parking.status}
        </Badge>
      </HStack>
      <HStack spacing={3} color="gray.600" fontSize="xs">
        {parking.distanceText && <Text>{parking.distanceText}</Text>}
        {parking.durationText && <Text>{parking.durationText}</Text>}
        {parking.price != null && <Text>¥{parking.price}/h</Text>}
      </HStack>
      {parking.address && (
        <Text fontSize="xs" color="gray.500" noOfLines={1}>
          {parking.address}
        </Text>
      )}
    </VStack>
  </Box>
)
