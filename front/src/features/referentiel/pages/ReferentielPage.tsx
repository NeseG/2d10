import { useState } from 'react'
import { BookOpen, PawPrint } from 'lucide-react'
import { Card } from '../../../shared/components/Card'
import { ReferentielSpellsTab } from '../components/ReferentielSpellsTab'
import { ReferentielMonstersTab } from '../components/ReferentielMonstersTab'

type ReferentielTab = 'spells' | 'monsters'

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
      </div>

      {activeTab === 'spells' ? <ReferentielSpellsTab /> : <ReferentielMonstersTab />}
    </Card>
  )
}
