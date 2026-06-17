import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Maps } from './maps/Map.tsx'
import { ChakraProvider } from '@chakra-ui/react'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider>
      <Maps/>
    </ChakraProvider>
  </StrictMode>,
)