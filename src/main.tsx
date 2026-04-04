import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/inter/latin-300.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/cormorant-garamond/latin-300.css'
import '@fontsource/cormorant-garamond/latin-300-italic.css'
import '@fontsource/cormorant-garamond/latin-400.css'
import '@fontsource/cormorant-garamond/latin-400-italic.css'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/bodoni-moda/latin-400.css'
import '@fontsource/bodoni-moda/latin-400-italic.css'
import '@fontsource/bodoni-moda/latin-500.css'
import '@fontsource/bodoni-moda/latin-600.css'
import '@fontsource/gloock/latin-400.css'
import '@fontsource/roboto/latin-100.css'
import '@fontsource/roboto/latin-100-italic.css'
import '@fontsource/roboto/latin-300.css'
import '@fontsource/roboto/latin-300-italic.css'
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-400-italic.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-500-italic.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/roboto/latin-700-italic.css'
import '@fontsource/roboto/latin-900.css'
import '@fontsource/roboto/latin-900-italic.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
