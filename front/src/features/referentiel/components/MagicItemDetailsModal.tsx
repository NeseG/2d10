import { useLanguage } from '../../../app/hooks/useLanguage'
import { MarkdownContent } from '../../../shared/components/MarkdownContent'
import { pickLang } from '../../../shared/utils/pickLang'

export type MagicItemDetail = {
  id: number
  index: string
  name: string
  categoryIndex?: string | null
  categoryName?: string | null
  rarity?: string | null
  description?: string | null
  variant?: boolean | null
  raw?: unknown
  // Traduction FR du référentiel importé
  nameFr?: string | null
  categoryNameFr?: string | null
  rarityFr?: string | null
  descriptionFr?: string | null
}

export function MagicItemDetailsModal(props: {
  open: boolean
  loading: boolean
  magicItemDetails: MagicItemDetail | null
  onClose: () => void
  showDeleteFromImportedCatalog?: boolean
  onDeleteFromImportedCatalog?: () => void
  deleteFromImportedCatalogSaving?: boolean
}) {
  const {
    open,
    loading,
    magicItemDetails,
    onClose,
    showDeleteFromImportedCatalog = false,
    onDeleteFromImportedCatalog,
    deleteFromImportedCatalogSaving = false,
  } = props
  const { language } = useLanguage()
  if (!open) return null

  const busy = loading || deleteFromImportedCatalogSaving
  const displayName = magicItemDetails ? pickLang(language, magicItemDetails.nameFr, magicItemDetails.name) : null
  const displayCategory = magicItemDetails
    ? pickLang(language, magicItemDetails.categoryNameFr, magicItemDetails.categoryName)
    : null
  const displayRarity = magicItemDetails ? pickLang(language, magicItemDetails.rarityFr, magicItemDetails.rarity) : null
  const displayDescription = magicItemDetails
    ? pickLang(language, magicItemDetails.descriptionFr, magicItemDetails.description)
    : null

  return (
    <div className="modal-backdrop" onClick={() => (!busy ? onClose() : null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        {loading ? <p>Chargement…</p> : null}
        {!loading && magicItemDetails ? (
          <>
            <div className="item-details-header">
              <div>
                <div className="item-details-header-name" style={{ fontSize: '1.12rem' }}>
                  {displayName ?? magicItemDetails.name}
                  {magicItemDetails.variant ? <span className="badge-homebrew">Variante</span> : null}
                </div>
                <div className="item-details-header-submeta">{displayCategory || '—'}</div>
              </div>
              <div className="item-details-header-meta">
                <span className="item-details-header-type">{displayRarity || '—'}</span>
              </div>
            </div>

            <hr
              style={{
                border: 0,
                borderTop: '1px solid var(--border)',
                opacity: 0.7,
                margin: '0.75rem 0',
              }}
            />

            <div className="item-details">
              <MarkdownContent content={displayDescription} />
            </div>
          </>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {showDeleteFromImportedCatalog && onDeleteFromImportedCatalog ? (
            <button
              className="btn btn-secondary"
              type="button"
              disabled={busy}
              onClick={() => onDeleteFromImportedCatalog()}
            >
              {deleteFromImportedCatalogSaving ? 'Suppression…' : 'Supprimer du catalogue importé'}
            </button>
          ) : null}
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export function RemoveImportedCatalogMagicItemConfirmModal(props: {
  open: boolean
  removing: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { open, removing, onClose, onConfirm } = props
  if (!open) return null

  return (
    <div className="modal-backdrop modal-backdrop-stacked-deep" onClick={() => (!removing ? onClose() : null)}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Retirer du catalogue importé</h3>
        <p>Retirer cet objet magique du catalogue importé ?</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button className="btn" type="button" disabled={removing} onClick={onConfirm}>
            {removing ? 'Suppression…' : 'Oui, supprimer'}
          </button>
          <button className="btn btn-secondary" type="button" disabled={removing} onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
