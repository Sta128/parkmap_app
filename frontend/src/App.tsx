import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Maps } from './maps/Maps.tsx'
import { ChakraProvider } from '@chakra-ui/react'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider>
      <Maps/>
    </ChakraProvider>
  </StrictMode>,
)