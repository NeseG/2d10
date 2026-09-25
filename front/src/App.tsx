import './index.css'
import './app/theme/initTheme'
import { AppRouter } from './app/router'
import { AuthProvider } from './app/providers/AuthProvider'
import { SnackbarProvider } from './app/providers/SnackbarProvider'
import { LanguageProvider } from './app/providers/LanguageProvider'

function App() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <LanguageProvider>
          <AppRouter />
        </LanguageProvider>
      </SnackbarProvider>
    </AuthProvider>
  )
}

export default App
