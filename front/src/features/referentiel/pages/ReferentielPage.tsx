import { useState } from 'react'
import { BookOpen, Gem, PawPrint } from 'lucide-react'
import { Card } from '../../../shared/components/Card'
import { ReferentielSpellsTab } from '../components/ReferentielSpellsTab'
import { ReferentielMonstersTab } from '../components/ReferentielMonstersTab'
import { ReferentielMagicItemsTab } from '../components/ReferentielMagicItemsTab'

type ReferentielTab = 'spells' | 'monsters' | 'magic-items'

export function ReferentielPage() {
  const [activeTab, setActiveTab] = useState<ReferentielTab>('spells')

  return (
    <Card title="Référentiel">
      <div className="tabs-row">
        <button
          className={`tab-btn ${activeTab === 'spells' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('spells')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <BookOpen size={18} aria-hidden="true" />
            Sorts
          </span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'monsters' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('monsters')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <PawPrint size={18} aria-hidden="true" />
            Monstres
          </span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'magic-items' ? 'active' : ''}`}
          type="button"
          onClick={() => setActiveTab('magic-items')}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Gem size={18} aria-hidden="true" />
            Objets
          </span>
        </button>
      </div>

      {activeTab === 'spells' ? <ReferentielSpellsTab /> : null}
      {activeTab === 'monsters' ? <ReferentielMonstersTab /> : null}
      {activeTab === 'magic-items' ? <ReferentielMagicItemsTab /> : null}
    </Card>
  )
}
