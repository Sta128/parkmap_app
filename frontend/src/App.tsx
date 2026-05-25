import { Maps } from './Maps.tsx'
import { CarSetting } from './CarSetting.tsx'
import { ChakraProvider } from '@chakra-ui/react'
import './App.css'

function App() {
  return (
    <>
      <Maps/>
      <ChakraProvider>
        <CarSetting/>
      </ChakraProvider>
    </>
  )
}

export default App
