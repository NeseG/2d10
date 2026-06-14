// ── ARCHÉTYPES D&D 5e ────────────────────────────────────────────────────────

const DND_5E_ARCHETYPES: Record<string, string[]> = {
  barbare: [
    'Voie du Berserker',
    'Voie du Guerrier Totem',
    'Voie de la Magie Sauvage',
    'Voie de la Bête',
    'Voie des Tempêtes',
    'Voie des Zéalotes',
    'Voie du Ravageur',
  ],
  barde: [
    'Collège du Savoir',
    'Collège de la Vaillance',
    'Collège de la Création',
    'Collège de l\'Éloquence',
    'Collège du Glamour',
    'Collège des Murmures',
    'Collège de l\'Épée',
  ],
  clerc: [
    'Domaine de la Vie',
    'Domaine de la Lumière',
    'Domaine de la Guerre',
    'Domaine des Tempêtes',
    'Domaine des Tromperies',
    'Domaine de la Connaissance',
    'Domaine de la Nature',
    'Domaine de la Mort',
    'Domaine de la Forge',
    'Domaine de la Tombe',
    'Domaine de l\'Ordre',
    'Domaine de la Paix',
    'Domaine du Crépuscule',
    'Domaine Arcanique',
  ],
  druide: [
    'Cercle de la Lune',
    'Cercle de la Terre',
    'Cercle des Rêves',
    'Cercle du Berger',
    'Cercle des Spores',
    'Cercle des Étoiles',
    'Cercle des Feux Follets',
  ],
  guerrier: [
    'Champion',
    'Maître des Combats',
    'Chevalier Eldritch',
    'Sorcelame',
    'Archer Arcanique',
    'Cavalier',
    'Samouraï',
    'Guerrier Psy',
    'Chevalier Runique',
    'Chevalier du Dragon Pourpre',
  ],
  moine: [
    'Voie de la Main Ouverte',
    'Voie des Ombres',
    'Voie des Quatre Éléments',
    'Voie du Soleil',
    'Voie du Kensai',
    'Voie de la Miséricorde',
    'Voie de l\'Esprit Astral',
    'Voie de l\'Ivrogne',
  ],
  paladin: [
    'Serment de Dévotion',
    'Serment des Anciens',
    'Serment de Vengeance',
    'Serment de Conquête',
    'Serment de Rédemption',
    'Serment de Gloire',
    'Serment du Gardien',
    'Paladin Sans Serment',
  ],
  rodeur: [
    'Chasseur',
    'Maître des Bêtes',
    'Traqueur des Ombres',
    'Marcheur des Horizons',
    'Pourfendeur de Monstres',
    'Essaimeur',
    'Vagabond des Fées',
  ],
  roublard: [
    'Escroc',
    'Assassin',
    'Trickster Arcanique',
    'Bretteur',
    'Inquisiteur',
    'Fantôme',
    'Éclaireur',
    'Lame-Âme',
  ],
  ensorceleur: [
    'Origine Draconique',
    'Magie Sauvage',
    'Âme Divine',
    'Magie des Ombres',
    'Magie des Tempêtes',
    'Âme Aberrante',
    'Âme Mécanique',
  ],
  sorcier: [
    'Le Fieffé',
    'Le Grand Ancien',
    'L\'Archifée',
    'La Lame Maudite',
    'La Céleste',
    'Le Génie',
    'L\'Être des Abysses',
  ],
  magicien: [
    'École d\'Abjuration',
    'École de Conjuration',
    'École de Divination',
    'École d\'Enchantement',
    'École d\'Évocation',
    'École d\'Illusion',
    'École de Nécromancie',
    'École de Transmutation',
    'Lame Chantante',
    'Ordre des Scribes',
    'Chronurgie',
    'Graviturgie',
  ],
}

function classToArchetypeKey(className: string): string {
  const c = (className ?? '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (c.includes('barbar')) return 'barbare'
  if (c.includes('barde') || c.startsWith('bard')) return 'barde'
  if (c.includes('clerc') || c.includes('cleric')) return 'clerc'
  if (c.includes('druide') || c.includes('druid')) return 'druide'
  if (c.includes('guerrier') || c.includes('fighter')) return 'guerrier'
  if (c.includes('moine') || c.includes('monk')) return 'moine'
  if (c.includes('paladin')) return 'paladin'
  if (c.includes('rodeur') || c.includes('ranger') || c.includes('rôdeur')) return 'rodeur'
  if (c.includes('roublard') || c.includes('rogue')) return 'roublard'
  if (c.includes('ensorcel') || c.includes('sorcer')) return 'ensorceleur'
  if (c.includes('sorcier') || c.includes('warlock')) return 'sorcier'
  if (c.includes('magicien') || c.includes('wizard')) return 'magicien'
  return ''
}

// ─────────────────────────────────────────────────────────────────────────────

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
              onChange={(e) => setForm((p) => ({ ...p, class: e.target.value, archetype: '' }))}
            />
          </div>

          <div>
            <label htmlFor="char-archetype">Archétype</label>
            <input
              id="char-archetype"
              type="text"
              list="dnd-archetypes"
              value={form.archetype}
              onChange={(e) => setForm((p) => ({ ...p, archetype: e.target.value }))}
            />
            <datalist id="dnd-archetypes">
              {(DND_5E_ARCHETYPES[classToArchetypeKey(form.class)] ?? []).map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
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

