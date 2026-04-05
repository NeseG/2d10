type CharacterIdentityAccordionProps = {
  form: {
    name: string
    race: string
    class: string
    archetype: string
    level: string
    experiencePoints: string
    destiny: string
    background: string
    description: string
    alignment: string
  }
  setForm: (updater: (prev: CharacterIdentityAccordionProps['form']) => CharacterIdentityAccordionProps['form']) => void
  avatarUrl: string
  avatarUploading: boolean
  onAvatarFileChange: (file: File | null) => void
  canEditOwner: boolean
  ownerUserId: string
  setOwnerUserId: (next: string) => void
  availableUsers: Array<{ id: number; username: string; email: string }>
}

export function CharacterIdentityAccordion(props: CharacterIdentityAccordionProps) {
  const { form, setForm, avatarUrl, avatarUploading, onAvatarFileChange, canEditOwner, ownerUserId, setOwnerUserId, availableUsers } = props

  return (
    <details className="character-skills-accordion" open>
      <summary className="character-skills-accordion-summary">Identité</summary>
      <div className="character-skills-accordion-panel">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem 0.75rem' }}>
          <div style={{ gridColumn: '1 / -1' }} className="character-avatar-upload-row">
            <label className="character-avatar-upload-trigger" htmlFor="char-avatar">
              <div className="character-avatar-upload-preview">
                {avatarUrl ? <img src={avatarUrl} alt={`Avatar de ${form.name || 'ce personnage'}`} /> : <span>?</span>}
              </div>
              <input
                id="char-avatar"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="character-avatar-upload-input"
                disabled={avatarUploading}
                onChange={(e) => onAvatarFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="character-avatar-upload-text">
              <strong>Image de profil</strong>
              <small>{avatarUploading ? 'Envoi en cours...' : 'Cliquer sur l’image pour en choisir une'}</small>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="char-name">Nom</label>
            <input
              id="char-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {canEditOwner ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="char-owner">Propriétaire</label>
              <select id="char-owner" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}>
                <option value="">—</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.username} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label htmlFor="char-race">Race</label>
            <input
              id="char-race"
              type="text"
              list="dnd-races"
              value={form.race}
              onChange={(e) => setForm((p) => ({ ...p, race: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="char-class">Classe</label>
            <input
              id="char-class"
              type="text"
              list="dnd-classes"
              value={form.class}
              onChange={(e) => setForm((p) => ({ ...p, class: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="char-archetype">Archétype</label>
            <input
              id="char-archetype"
              type="text"
              value={form.archetype}
              onChange={(e) => setForm((p) => ({ ...p, archetype: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="char-level">Niveau</label>
            <input
              id="char-level"
              type="number"
              min={1}
              value={form.level}
              onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="char-experience-points">Expérience</label>
            <input
              id="char-experience-points"
              type="number"
              min={0}
              value={form.experiencePoints}
              onChange={(e) => setForm((p) => ({ ...p, experiencePoints: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="char-destiny">Destin</label>
            <input
              id="char-destiny"
              type="number"
              min={0}
              title="Valeur par défaut à la création : 3"
              value={form.destiny}
              onChange={(e) => setForm((p) => ({ ...p, destiny: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="char-alignment">Alignement</label>
            <input
              id="char-alignment"
              type="text"
              value={form.alignment}
              onChange={(e) => setForm((p) => ({ ...p, alignment: e.target.value }))}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="char-background">Background</label>
            <input
              id="char-background"
              type="text"
              value={form.background}
              onChange={(e) => setForm((p) => ({ ...p, background: e.target.value }))}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="char-description">Description</label>
            <textarea
              id="char-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
            />
          </div>
        </div>
      </div>
    </details>
  )
}

