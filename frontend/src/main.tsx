import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'

import dayjs from 'dayjs'
import 'dayjs/locale/es' // Import Spanish locale

dayjs.locale('es') // Set the locale to Spanish

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(<App />)
