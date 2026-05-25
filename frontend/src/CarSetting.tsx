import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  IconButton,
  Input,
  Stack,
  Text,
  useDisclosure,
  VStack,
  HStack,
} from '@chakra-ui/react'

import { SettingsIcon, DeleteIcon } from '@chakra-ui/icons'

import { useEffect, useState } from 'react'

type Car = {
  id: number
  name: string
  height: number
  width: number
  length: number
  ground_clearance: number
}

export const CarSetting = () => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  const [cars, setCars] = useState<Car[]>([])

  const [editingId, setEditingId] = useState<number | null>(
    null
  )

  const [newCar, setNewCar] = useState({
    name: '',
    height: 0,
    width: 0,
    length: 0,
    ground_clearance: 0,
  })

  const [selectedCarId, setSelectedCarId] = useState<number | null>(null)

  const fetchCars = async () => {
    const res = await fetch('http://localhost:3000/cars')

    const data = await res.json()

    setCars(data)
  }

  useEffect(() => {
    fetchCars()
  }, [])

  /**
   * 新規登録
   */
  const handleRegister = async () => {
    await fetch('http://localhost:3000/cars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newCar),
    })

    setNewCar({
      name: '',
      height: 0,
      width: 0,
      length: 0,
      ground_clearance: 0,
    })

    fetchCars()
  }

  /**
   * 更新
   */
  const handleUpdate = async (car: Car) => {
    await fetch(
      `http://localhost:3000/cars/${car.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(car),
      }
    )

    setEditingId(null)

    fetchCars()
  }

  /**
   * 削除
   */
  const handleDelete = async (id: number) => {
    await fetch(
      `http://localhost:3000/cars/${id}`,
      {
        method: 'DELETE',
      }
    )

    fetchCars()
  }

  return (
    <>
      <IconButton
        aria-label='setting'
        icon={<SettingsIcon />}
        position='fixed'
        top='20px'
        left='20px'
        borderRadius='full'
        zIndex={1000}
        colorScheme='blue'
        onClick={onOpen}
      />

      <Drawer
        isOpen={isOpen}
        placement='bottom'
        onClose={onClose}
        size={'xl'}
      >
        <DrawerOverlay />

        <DrawerContent
          borderTopRadius='20px'
          //maxH='80vh'
        >
          <DrawerHeader>
            設定
          </DrawerHeader>

          <DrawerBody>
            <Accordion allowToggle>
              <AccordionItem>
                <AccordionButton>
                  <Box flex='1' textAlign='left'>
                    車両情報
                  </Box>

                  <AccordionIcon />
                </AccordionButton>

                <AccordionPanel>
                  <Accordion allowToggle>

                    {/* 登録済み */}
                    <AccordionItem>
                      <AccordionButton>
                        <Box flex='1' textAlign='left'>
                          登録されている車両情報
                        </Box>

                        <AccordionIcon />
                      </AccordionButton>

                      <AccordionPanel>

                        <Accordion allowToggle>
                          {cars.map((car) => (
                            <AccordionItem>
                              <AccordionButton 
                                bg={
                                  selectedCarId === car.id
                                    ? 'teal.100'
                                    : 'white'
                                }
                                _hover={{
                                  bg:
                                    selectedCarId === car.id
                                      ? 'teal.200'
                                      : 'gray.100'
                                }}
                              >
                                <Box flex='1' textAlign='left' fontWeight={'bold'}>
                                  {car.name}
                                </Box>
                                <AccordionIcon/>
                              </AccordionButton>

                              <AccordionPanel>
                                <Box
                                key={car.id}
                                w='100%'
                                p={4}
                                borderWidth='2px'
                                borderRadius='lg'
                            >
                                <Stack spacing={1}>
                                  {[
                                    {
                                      key: 'height',
                                      label: '全高'
                                    },
                                    {
                                      key: 'width',
                                      label: '車幅'
                                    },
                                    {
                                      key: 'length',
                                      label: '全長'
                                    },
                                    {
                                      key: 'ground_clearance',
                                      label: '地上高'
                                    }
                                  ].map((field) => (
                                    <FormControl
                                      key={field.key}
                                    >
                                      <FormLabel>
                                        {field.label}(cm)
                                      </FormLabel>

                                      <Input
                                        type='number'
                                        value={
                                          car[
                                            field.key as keyof Car
                                          ] as number
                                        }
                                        isDisabled={
                                          editingId !== car.id
                                        }
                                        onChange={(e) => {
                                          setCars((prev) =>
                                            prev.map((c) =>
                                              c.id === car.id
                                                ? {
                                                    ...c,
                                                    [field.key]:
                                                      Number(
                                                        e.target
                                                          .value
                                                      )
                                                  }
                                                : c
                                            )
                                          )
                                        }}
                                      />
                                    </FormControl>
                                  ))}
                                </Stack>

                                <HStack mt={4}>
                                  {editingId === car.id ? (
                                    <Button
                                      colorScheme='green'
                                      onClick={() =>
                                        handleUpdate(car)
                                      }
                                    >
                                      適用する
                                    </Button>
                                  ) : (
                                    <Button
                                      colorScheme='blue'
                                      onClick={() =>
                                        setEditingId(car.id)
                                      }
                                    >
                                      変更する
                                    </Button>
                                  )}

                                  <IconButton
                                    aria-label='delete'
                                    icon={<DeleteIcon />}
                                    colorScheme='red'
                                    onClick={() =>
                                      handleDelete(car.id)
                                    }
                                  />
                                  <Button
                                    colorScheme={
                                      selectedCarId === car.id
                                        ? 'teal'
                                        : 'gray'
                                    }
                                    onClick={() =>
                                      setSelectedCarId(car.id)
                                    }
                                  >
                                    {selectedCarId === car.id
                                      ? '選択中'
                                      : '決定'}
                                  </Button>
                                </HStack>
                                </Box>
                              </AccordionPanel>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </AccordionPanel>
                    </AccordionItem>

                    {/* 新規登録 */}
                    <AccordionItem>
                      <AccordionButton>
                        <Box flex='1' textAlign='left'>
                          新しく登録する
                        </Box>

                        <AccordionIcon />
                      </AccordionButton>

                      <AccordionPanel>
                        <VStack spacing={1}>
                          <FormControl>
                            <FormLabel>
                              登録名
                            </FormLabel>

                            <Input
                              value={newCar.name}
                              onChange={(e) =>
                                setNewCar({
                                  ...newCar,
                                  name:
                                    e.target.value
                                })
                              }
                            />
                          </FormControl>

                          {[
                            {
                              key: 'height',
                              label: '全高'
                            },
                            {
                              key: 'width',
                              label: '車幅'
                            },
                            {
                              key: 'length',
                              label: '全長'
                            },
                            {
                              key:
                                'ground_clearance',
                              label: '地上高'
                            }
                          ].map((field) => (
                            <FormControl
                              key={field.key}
                            >
                              <FormLabel>
                                {field.label}(cm)
                              </FormLabel>

                              <Input
                                type='number'
                                onChange={(e) =>
                                  setNewCar({
                                    ...newCar,
                                    [field.key]:
                                      Number(
                                        e.target.value
                                      )
                                  })
                                }
                              />
                            </FormControl>
                          ))}

                          <Button
                            colorScheme='teal'
                            w='100%'
                            onClick={
                              handleRegister
                            }
                            isDisabled={
                              cars.length >= 5
                            }
                          >
                            登録する
                          </Button>

                          {cars.length >= 5 && (
                            <Text color='red.500'>
                              最大5台まで登録できます
                            </Text>
                          )}
                        </VStack>
                      </AccordionPanel>
                    </AccordionItem>

                  </Accordion>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}