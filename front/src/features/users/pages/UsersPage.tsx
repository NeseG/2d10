import { Card } from '../../../shared/components/Card'
import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPut } from '../../../shared/api/client'
import { useAuth } from '../../../app/hooks/useAuth'
import { useSnackbar } from '../../../app/hooks/useSnackbar'

type AdminUser = {
  id: number
  username: string
  email: string
  role_name: string
  is_active?: boolean
}

export function UsersPage() {
  const { token } = useAuth()
  const { showSnackbar } = useSnackbar()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editUserId, setEditUserId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: 'user',
    is_active: true,
  })

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await apiGet<{ users: AdminUser[] }>('/api/admin/users', token)
        setUsers(response.users)
      } catch (err) {
        showSnackbar({
          message: err instanceof Error ? err.message : 'Erreur de chargement',
          severity: 'error',
        })
      }
    }

    void loadUsers()
  }, [token, showSnackbar])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const haystack = [u.username, u.email, u.role_name, u.is_active ? 'active' : 'inactive']
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [search, users])

  async function openEditModal(userId: number) {
    setIsEditModalOpen(true)
    setEditLoading(true)
    setEditSaving(false)
    setEditUserId(userId)
    try {
      const response = await apiGet<{ user: AdminUser }>(`/api/admin/users/${userId}`, token)
      const u = response.user
      setEditForm({
        username: u.username ?? '',
        email: u.email ?? '',
        role: u.role_name ?? 'user',
        is_active: Boolean(u.is_active),
      })
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur de chargement utilisateur',
        severity: 'error',
      })
    } finally {
      setEditLoading(false)
    }
  }

  async function handleSaveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editUserId == null) return
    setEditSaving(true)
    try {
      await apiPut(
        `/api/admin/users/${editUserId}`,
        {
          username: editForm.username.trim(),
          email: editForm.email.trim(),
          role: editForm.role,
          is_active: Boolean(editForm.is_active),
        },
        token,
      )

      showSnackbar({ message: 'Utilisateur mis à jour.', severity: 'success' })
      setIsEditModalOpen(false)
      setEditUserId(null)

      // refresh list
      const response = await apiGet<{ users: AdminUser[] }>('/api/admin/users', token)
      setUsers(response.users)
    } catch (err) {
      showSnackbar({
        message: err instanceof Error ? err.message : 'Erreur sauvegarde utilisateur',
        severity: 'error',
      })
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <Card title="Gestion des utilisateurs">
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
        <div className="login-form" style={{ marginTop: 0, minWidth: 260, flex: '1 1 260px' }}>
          <span className="create-item-kind-label">Rechercher</span>
          <input
            id="admin-users-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Username, email, rôle…"
          />
        </div>
      </div>

      <div className="table-wrap">
        <table className="table responsive-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td data-label="Username">{user.username}</td>
                <td data-label="Email">{user.email}</td>
                <td data-label="Rôle">{user.role_name}</td>
                <td data-label="Actions">
                  <button className="btn btn-small" type="button" onClick={() => void openEditModal(user.id)}>
                    Éditer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!editSaving) {
              setIsEditModalOpen(false)
              setEditUserId(null)
            }
          }}
        >
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Éditer l’utilisateur</h3>
            {editLoading ? <p>Chargement…</p> : null}

            <form className="login-form" onSubmit={handleSaveUser}>
              <label htmlFor="edit-user-username">Username</label>
              <input
                id="edit-user-username"
                type="text"
                required
                disabled={editLoading || editSaving}
                value={editForm.username}
                onChange={(event) => setEditForm((p) => ({ ...p, username: event.target.value }))}
              />

              <label htmlFor="edit-user-email">Email</label>
              <input
                id="edit-user-email"
                type="email"
                required
                disabled={editLoading || editSaving}
                value={editForm.email}
                onChange={(event) => setEditForm((p) => ({ ...p, email: event.target.value }))}
              />

              <label htmlFor="edit-user-role">Rôle</label>
              <select
                id="edit-user-role"
                disabled={editLoading || editSaving}
                value={editForm.role}
                onChange={(event) => setEditForm((p) => ({ ...p, role: event.target.value }))}
              >
                <option value="user">user</option>
                <option value="gm">gm</option>
                <option value="admin">admin</option>
              </select>

              <label className="skill-check">
                <input
                  type="checkbox"
                  disabled={editLoading || editSaving}
                  checked={editForm.is_active}
                  onChange={(event) => setEditForm((p) => ({ ...p, is_active: event.target.checked }))}
                />
                Actif
              </label>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="btn" type="submit" disabled={editLoading || editSaving}>
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={editLoading || editSaving}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
