import './index.css'
import './app/theme/initTheme'
import { AppRouter } from './app/router'
import { AuthProvider } from './app/providers/AuthProvider'
import { SnackbarProvider } from './app/providers/SnackbarProvider'

function App() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <AppRouter />
      </SnackbarProvider>
    </AuthProvider>
  )
}

export default App
