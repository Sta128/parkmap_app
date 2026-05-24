import { Maps } from './Maps.tsx'
import { CarSetting } from './CarSetting'
import { ChakraProvider } from '@chakra-ui/react'
import './App.css'

function App() {
  return (
    <>
      
      <ChakraProvider>
        <CarSetting/>
      </ChakraProvider>
    </>
  )
}

export default App
