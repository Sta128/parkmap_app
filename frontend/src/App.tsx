import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Maps } from './maps/Maps.tsx'
import { ChakraProvider } from '@chakra-ui/react'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider>
      <Maps/>
    </ChakraProvider>
  </StrictMode>,
)