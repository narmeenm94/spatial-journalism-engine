import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Note: StrictMode removed — React 19 StrictMode double-renders trigger
// infinite loops in @react-three/fiber's internal useSyncExternalStore.
createRoot(document.getElementById('root')!).render(<App />)
