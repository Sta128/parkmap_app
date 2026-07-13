import { Box, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'

const MINUTE_OPTIONS = [0, 15, 30, 45]
const pad = (value: number) => String(value).padStart(2, '0')

const toLocalValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)

const daysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate()

const range = (start: number, end: number) =>
  Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)

type WheelColumnProps = {
  label: string
  values: number[]
  value: number
  formatter?: (value: number) => string
  onChange: (value: number) => void
}

const WheelColumn = ({ label, values, value, formatter = String, onChange }: WheelColumnProps) => {
  const selectedIndex = Math.max(0, values.indexOf(value))
  const previous = values[selectedIndex - 1]
  const next = values[selectedIndex + 1]

  const move = (direction: -1 | 1) => {
    const nextIndex = Math.min(values.length - 1, Math.max(0, selectedIndex + direction))
    onChange(values[nextIndex])
  }

  return (
    <VStack spacing={1} minW={{ base: '54px', sm: '64px' }}>
      <Text fontSize="10px" color="gray.500">{label}</Text>
      <IconButton
        aria-label={`${label}を増やす`}
        icon={<Text fontSize="sm">▲</Text>}
        size="xs"
        variant="ghost"
        isDisabled={next === undefined}
        onClick={() => move(1)}
      />
      <VStack
        spacing={0}
        w="full"
        borderWidth="1px"
        borderRadius="md"
        overflow="hidden"
        onWheel={(event) => {
          event.preventDefault()
          move(event.deltaY > 0 ? 1 : -1)
        }}
      >
        <Box
          h="26px"
          w="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="gray.400"
          fontSize="xs"
          cursor={previous === undefined ? 'default' : 'pointer'}
          onClick={() => previous !== undefined && onChange(previous)}
        >
          {previous === undefined ? '—' : formatter(previous)}
        </Box>
        <Box
          h="34px"
          w="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="blue.500"
          color="white"
          fontWeight="bold"
          fontSize="sm"
          boxShadow="inset 0 1px 0 rgba(255,255,255,.25), inset 0 -1px 0 rgba(0,0,0,.08)"
        >
          {formatter(value)}
        </Box>
        <Box
          h="26px"
          w="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="gray.400"
          fontSize="xs"
          cursor={next === undefined ? 'default' : 'pointer'}
          onClick={() => next !== undefined && onChange(next)}
        >
          {next === undefined ? '—' : formatter(next)}
        </Box>
      </VStack>
      <IconButton
        aria-label={`${label}を減らす`}
        icon={<Text fontSize="sm">▼</Text>}
        size="xs"
        variant="ghost"
        isDisabled={previous === undefined}
        onClick={() => move(-1)}
      />
    </VStack>
  )
}

type Props = {
  label: string
  value: string
  min: Date
  max: Date
  onChange: (value: string) => void
}

export const DateTimeDial = ({ label, value, min, max, onChange }: Props) => {
  const parsed = value ? new Date(value) : min
  const current = Number.isNaN(parsed.getTime()) ? min : parsed

  const years = useMemo(
    () => range(min.getFullYear(), max.getFullYear()),
    [min, max],
  )
  const months = range(1, 12)
  const days = range(1, daysInMonth(current.getFullYear(), current.getMonth() + 1))
  const hours = range(0, 23)

  const emitParts = (parts: Partial<{
    year: number
    month: number
    day: number
    hour: number
    minute: number
  }>) => {
    const year = parts.year ?? current.getFullYear()
    const month = parts.month ?? current.getMonth() + 1
    const maxDay = daysInMonth(year, month)
    const day = Math.min(parts.day ?? current.getDate(), maxDay)
    const hour = parts.hour ?? current.getHours()
    const minute = parts.minute ?? current.getMinutes()

    let next = new Date(year, month - 1, day, hour, minute, 0, 0)
    if (next < min) next = new Date(min)
    if (next > max) next = new Date(max)
    onChange(toLocalValue(next))
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" px={3} py={2} bg="gray.50">
      <HStack justify="space-between" mb={2} align="start">
        <Text fontSize="sm" fontWeight="bold">{label}</Text>
        <Text fontSize="xs" color="blue.600" fontWeight="semibold" textAlign="right">
          {formatDateTime(current)}
        </Text>
      </HStack>

      <Box overflowX="auto" pb={1}>
        <HStack spacing={2} align="center" minW="max-content" justify="center">
          <WheelColumn
            label="年"
            values={years}
            value={current.getFullYear()}
            formatter={(v) => `${v}`}
            onChange={(year) => emitParts({ year })}
          />
          <WheelColumn
            label="月"
            values={months}
            value={current.getMonth() + 1}
            formatter={(v) => `${v}`}
            onChange={(month) => emitParts({ month })}
          />
          <WheelColumn
            label="日"
            values={days}
            value={current.getDate()}
            formatter={(v) => `${v}`}
            onChange={(day) => emitParts({ day })}
          />
          <Text color="gray.400" pt={4}>／</Text>
          <WheelColumn
            label="時"
            values={hours}
            value={current.getHours()}
            formatter={(v) => pad(v)}
            onChange={(hour) => emitParts({ hour })}
          />
          <WheelColumn
            label="分"
            values={MINUTE_OPTIONS}
            value={MINUTE_OPTIONS.includes(current.getMinutes()) ? current.getMinutes() : 0}
            formatter={(v) => pad(v)}
            onChange={(minute) => emitParts({ minute })}
          />
        </HStack>
      </Box>

      <Text fontSize="10px" color="gray.500" textAlign="center" mt={1}>
        ▲▼、前後の値、またはマウスホイールで変更できます
      </Text>
    </Box>
  )
}
