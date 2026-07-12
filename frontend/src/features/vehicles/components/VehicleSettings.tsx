import { DeleteIcon, EditIcon, SettingsIcon } from '@chakra-ui/icons'
import {
  Badge, Box, Button, Drawer, DrawerBody, DrawerCloseButton, DrawerContent,
  DrawerHeader, DrawerOverlay, FormControl, FormLabel, HStack, IconButton,
  Input, SimpleGrid, Stack, Text, useDisclosure, useToast,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useVehicles } from '../hooks/useVehicles'
import type { Vehicle, VehicleInput } from '../../../types/cars'

const emptyVehicle: VehicleInput = { name: '', height: 0, width: 0, length: 0, groundClearance: 0 }
const fields = [
  ['height', '全高'], ['width', '車幅'], ['length', '全長'], ['groundClearance', '最低地上高'],
] as const

type Props = { onSelectionChange?: (vehicle: Vehicle | null) => void }

export const VehicleSettings = ({ onSelectionChange }: Props) => {
  const drawer = useDisclosure()
  const toast = useToast()
  const { vehicles, selectedVehicle, addVehicle, updateVehicle, deleteVehicle, selectVehicle, maxVehicles } = useVehicles()
  const [draft, setDraft] = useState<VehicleInput>(emptyVehicle)
  const [editing, setEditing] = useState<Vehicle | null>(null)

  const choose = async (vehicle: Vehicle | null) => {
    await selectVehicle(vehicle?.id ?? null)
    onSelectionChange?.(vehicle)
  }

  const register = async () => {
    if (!draft.name.trim()) return
    try {
      await addVehicle({ ...draft, name: draft.name.trim() })
      setDraft(emptyVehicle)
    } catch (error) {
      toast({ status: 'error', description: error instanceof Error ? error.message : '登録に失敗しました' })
    }
  }

  return <>
    <IconButton aria-label="車両設定" icon={<SettingsIcon />} position="fixed" top="20px" right="20px" zIndex={1000} borderRadius="full" colorScheme="blue" onClick={drawer.onOpen} />
    <Drawer isOpen={drawer.isOpen} placement="right" size="md" onClose={drawer.onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>この端末の車両</DrawerHeader>
        <DrawerBody>
          <Text fontSize="sm" color="gray.600" mb={4}>車両情報はSupabaseへ送信せず、このブラウザのIndexedDBにのみ保存されます。</Text>
          <Stack spacing={3} mb={6}>
            <Button variant={!selectedVehicle ? 'solid' : 'outline'} onClick={() => void choose(null)}>車両指定なし</Button>
            {vehicles.map(vehicle => <Box key={vehicle.id} borderWidth="1px" borderRadius="lg" p={3} bg={selectedVehicle?.id === vehicle.id ? 'blue.50' : 'white'}>
              <HStack justify="space-between">
                <Box flex="1" cursor="pointer" onClick={() => void choose(vehicle)}>
                  <HStack><Text fontWeight="bold">{vehicle.name}</Text>{selectedVehicle?.id === vehicle.id && <Badge colorScheme="blue">選択中</Badge>}</HStack>
                  <Text fontSize="xs" color="gray.600">全高 {vehicle.height}cm / 車幅 {vehicle.width}cm / 全長 {vehicle.length}cm</Text>
                </Box>
                <IconButton aria-label="編集" size="sm" icon={<EditIcon />} onClick={() => setEditing(vehicle)} />
                <IconButton aria-label="削除" size="sm" colorScheme="red" variant="ghost" icon={<DeleteIcon />} onClick={() => vehicle.id && void deleteVehicle(vehicle.id)} />
              </HStack>
            </Box>)}
          </Stack>

          <Text fontWeight="bold" mb={2}>{editing ? '車両を編集' : `新しい車両（${vehicles.length}/${maxVehicles}）`}</Text>
          <Stack spacing={3}>
            <FormControl><FormLabel>車両名</FormLabel><Input value={editing?.name ?? draft.name} onChange={e => editing ? setEditing({ ...editing, name: e.target.value }) : setDraft({ ...draft, name: e.target.value })} /></FormControl>
            <SimpleGrid columns={2} spacing={3}>{fields.map(([key, label]) => <FormControl key={key}><FormLabel>{label} (cm)</FormLabel><Input type="number" min={0} value={editing?.[key] ?? draft[key]} onChange={e => {
                  const value = Number(e.target.value)
                  if (editing) setEditing({ ...editing, [key]: value })
                  else setDraft({ ...draft, [key]: value })
                }} /></FormControl>)}</SimpleGrid>
            {editing ? <HStack><Button colorScheme="blue" onClick={async () => { await updateVehicle(editing); setEditing(null) }}>保存</Button><Button onClick={() => setEditing(null)}>キャンセル</Button></HStack> : <Button colorScheme="blue" isDisabled={vehicles.length >= maxVehicles || !draft.name.trim()} onClick={() => void register()}>登録</Button>}
          </Stack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  </>
}
