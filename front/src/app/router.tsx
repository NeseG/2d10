import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { CharactersPage } from '../features/characters/pages/CharactersPage'
import { CharacterEditPage } from '../features/characters/pages/CharacterEditPage'
import { UsersPage } from '../features/users/pages/UsersPage'
import { CampaignsPage } from '../features/campaigns/pages/CampaignsPage'
import { CampaignMapEditorPage } from '../features/campaigns/pages/CampaignMapEditorPage'
import { SessionsPage } from '../features/sessions/pages/SessionsPage'
import { LiveSessionPage } from '../features/sessions/pages/LiveSessionPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/session-live" element={<LiveSessionPage />} />

            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['admin', 'gm']} />}>
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:campaignId/maps/:mapId/edit" element={<CampaignMapEditorPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
