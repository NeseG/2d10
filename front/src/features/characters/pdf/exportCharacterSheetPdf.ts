import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { apiGet } from '../../../shared/api/client'
import {
  CharacterSheetPdfLayout,
  type CharacterSheetPdfData,
  type PdfAbilityKey,
  type PdfFeature,
  type PdfGrimoireEntry,
  type PdfInventoryItem,
  type PdfPurse,
} from './CharacterSheetPdfLayout'

type CharacterApiDetail = {
  name: string
  race?: string | null
  class?: string | null
  archetype?: string | null
  level?: number | null
  background?: string | null
  alignment?: string | null
  experiencePoints?: number | null
  hitPointsMax?: number | null
  currentHitPoints?: number | null
  hitDice?: string | null
  hitDiceRemaining?: number | null
  armorClass?: number | null
  speed?: number | null
  strength?: number | null
  dexterity?: number | null
  constitution?: number | null
  intelligence?: number | null
  wisdom?: number | null
  charisma?: number | null
  description?: string | null
  notes?: string | null
  destiny?: number | null
  classResources?: Record<string, number> | null
  skills?: Array<{ skill: string; mastery: 'NOT_PROFICIENT' | 'PROFICIENT' | 'EXPERTISE' }>
  savingThrows?: Array<{ ability: string; proficient: boolean }>
  spellSlots?: Array<{ level: number; slotsMax: number }>
  spellcastingAbility?: string | null
  spellcasting_ability?: string | null
}

const SPELLCASTING_ABILITY_TO_KEY: Record<string, PdfAbilityKey> = {
  STRENGTH: 'strength',
  DEXTERITY: 'dexterity',
  CONSTITUTION: 'constitution',
  INTELLIGENCE: 'intelligence',
  WISDOM: 'wisdom',
  CHARISMA: 'charisma',
}

function sanitizeFileNamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function waitForRender(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/** Rendu au format A4 avec `html2canvas` : sans découpage, une page coupe le contenu à intervalles fixes,
 * sans tenir compte des lignes/mots. Cette échelle doit matcher celle passée à `html2canvas`. */
const RENDER_SCALE = 2

/** Sélecteur des blocs « atomiques » du gabarit (voir CharacterSheetPdfLayout.tsx) qui ne doivent jamais être coupés entre deux pages. */
const ATOMIC_SELECTOR =
  'h1, h2, h3, .pdf-ability-grid, .pdf-list-row, .pdf-combat-row, .pdf-feature, .pdf-table tr, .pdf-purse-row, .pdf-spellcasting-line, .pdf-freetext, .pdf-identity-line'

const HEADING_TAGS = new Set(['H1', 'H2', 'H3'])

/** Un titre (h1-h3) ou une ligne d'en-tête de tableau (<thead> tr) : ne doit jamais rester seul en bas de page,
 * sans le premier bloc de contenu (resp. la première ligne de données) qui le suit. */
function isHeadingLike(el: HTMLElement): boolean {
  if (HEADING_TAGS.has(el.tagName)) return true
  return el.tagName === 'TR' && el.closest('thead') != null
}

type Rect = { top: number; bottom: number }

/** Regroupe chaque titre/en-tête avec le(s) titre(s) suivant(s) et le premier bloc de contenu, pour éviter un titre orphelin en bas de page. */
function collectAtomicRects(root: HTMLElement): Rect[] {
  const rootTop = root.getBoundingClientRect().top
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(ATOMIC_SELECTOR))
  const rects = nodes.map((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top - rootTop, bottom: r.bottom - rootTop, headingLike: isHeadingLike(el) }
  })

  const merged: Rect[] = []
  let i = 0
  while (i < rects.length) {
    let top = rects[i].top
    let bottom = rects[i].bottom
    let j = i
    while (rects[j].headingLike && j + 1 < rects.length) {
      j += 1
      top = Math.min(top, rects[j].top)
      bottom = Math.max(bottom, rects[j].bottom)
      if (!rects[j].headingLike) break
    }
    merged.push({ top, bottom })
    i = j + 1
  }
  return merged.sort((a, b) => a.top - b.top)
}

/** Calcule les positions de coupure (en px, relatif au conteneur) qui évitent de traverser un bloc atomique. */
function computeSafeBreaks(atoms: Rect[], pageHeight: number, totalHeight: number): number[] {
  const breaks: number[] = []
  let cursor = 0
  const maxAdjustments = 200

  while (totalHeight - cursor > pageHeight + 1) {
    let boundary = cursor + pageHeight
    for (let adjust = 0; adjust < maxAdjustments; adjust += 1) {
      const straddler = atoms.find((a) => a.top >= cursor && a.top < boundary && a.bottom > boundary)
      if (!straddler) break
      if (straddler.top <= cursor) break
      boundary = straddler.top
    }
    breaks.push(boundary)
    cursor = boundary
  }
  return breaks
}

export async function exportCharacterSheetPdf(characterId: string, token: string): Promise<void> {
  const [characterRes, purseRes, inventoryRes, grimoireRes, featuresRes] = await Promise.all([
    apiGet<{ success: boolean; character: CharacterApiDetail }>(`/api/characters/${characterId}`, token),
    apiGet<{ success: boolean; purse: PdfPurse; total_gold_value: number }>(`/api/purse/${characterId}`, token).catch(
      () => null,
    ),
    apiGet<{ inventory: PdfInventoryItem[]; total_weight: number; total_items: number }>(
      `/api/inventory/${characterId}`,
      token,
    ).catch(() => null),
    apiGet<{ success: boolean; grimoire: PdfGrimoireEntry[] }>(`/api/grimoire/${characterId}`, token).catch(() => null),
    apiGet<{ success: boolean; features: PdfFeature[] }>(`/api/characters/${characterId}/features`, token).catch(
      () => null,
    ),
  ])

  const character = characterRes.character
  const spellcastingAbilityRaw = character.spellcastingAbility ?? character.spellcasting_ability ?? null
  const spellcastingAbility = spellcastingAbilityRaw ? SPELLCASTING_ABILITY_TO_KEY[spellcastingAbilityRaw] ?? null : null

  const data: CharacterSheetPdfData = {
    name: character.name,
    race: character.race ?? null,
    class: character.class ?? null,
    archetype: character.archetype ?? null,
    level: character.level ?? null,
    background: character.background ?? null,
    alignment: character.alignment ?? null,
    experiencePoints: character.experiencePoints ?? null,
    hitPointsMax: character.hitPointsMax ?? null,
    currentHitPoints: character.currentHitPoints ?? null,
    hitDice: character.hitDice ?? null,
    hitDiceRemaining: character.hitDiceRemaining ?? null,
    armorClass: character.armorClass ?? null,
    speed: character.speed ?? null,
    strength: character.strength ?? null,
    dexterity: character.dexterity ?? null,
    constitution: character.constitution ?? null,
    intelligence: character.intelligence ?? null,
    wisdom: character.wisdom ?? null,
    charisma: character.charisma ?? null,
    description: character.description ?? null,
    notes: character.notes ?? null,
    destiny: character.destiny ?? null,
    classResources: character.classResources ?? null,
    skills: character.skills ?? [],
    savingThrows: character.savingThrows ?? [],
    spellSlots: character.spellSlots ?? [],
    spellcastingAbility,
    features: featuresRes?.features ?? [],
    inventory: inventoryRes?.inventory ?? [],
    purse: purseRes?.purse ?? null,
    totalWeight: inventoryRes?.total_weight ?? null,
    grimoire: grimoireRes?.grimoire ?? [],
  }

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '-99999px'
  document.body.appendChild(container)

  const root = createRoot(container)
  try {
    root.render(createElement(CharacterSheetPdfLayout, { data }))
    await waitForRender()
    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const target = container.querySelector('.pdf-sheet') as HTMLElement | null
    if (!target) throw new Error('Mise en page de la fiche introuvable')

    // Chaque segment (voir CharacterSheetPdfLayout.tsx) est capturé et paginé séparément : Traits & capacités,
    // Inventaire et Grimoire démarrent ainsi toujours sur une page neuve, sans dépendre d'un calcul de coupure
    // partagé avec le reste du document (source des coupures imprécises rencontrées avec un unique gros rendu).
    const segments = Array.from(target.querySelectorAll<HTMLElement>(':scope > .pdf-segment'))
    if (segments.length === 0) throw new Error('Mise en page de la fiche introuvable')

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidthMm = pdf.internal.pageSize.getWidth()
    const pageHeightMm = pdf.internal.pageSize.getHeight()

    const sliceCanvas = document.createElement('canvas')
    const sliceCtx = sliceCanvas.getContext('2d')
    if (!sliceCtx) throw new Error('Impossible de préparer le rendu du PDF')

    let isFirstPage = true
    for (const segment of segments) {
      const rootWidthPx = segment.getBoundingClientRect().width
      const atoms = collectAtomicRects(segment)
      const canvas = await html2canvas(segment, { scale: RENDER_SCALE, backgroundColor: '#ffffff', useCORS: true })

      // Hauteur d'une page A4 convertie en px DOM : canvas.width = rootWidthPx * RENDER_SCALE et
      // pageHeightPx(canvas) = canvas.width * (pageHeightMm / pageWidthMm), donc en divisant par RENDER_SCALE
      // le facteur d'échelle s'annule et il ne reste que le ratio A4 appliqué à la largeur DOM.
      const domPageHeightPx = rootWidthPx * (pageHeightMm / pageWidthMm)
      const domTotalHeightPx = canvas.height / RENDER_SCALE
      const domBreaks = computeSafeBreaks(atoms, domPageHeightPx, domTotalHeightPx)

      const canvasBreaks = [0, ...domBreaks.map((b) => Math.round(b * RENDER_SCALE)), canvas.height]
      sliceCanvas.width = canvas.width

      for (let pageIndex = 0; pageIndex < canvasBreaks.length - 1; pageIndex += 1) {
        const sliceTop = canvasBreaks[pageIndex]
        const sliceBottom = canvasBreaks[pageIndex + 1]
        const sliceHeightPx = sliceBottom - sliceTop
        if (sliceHeightPx <= 0) continue

        sliceCanvas.height = sliceHeightPx
        sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceHeightPx)
        sliceCtx.drawImage(canvas, 0, sliceTop, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)

        const sliceImgHeightMm = (sliceHeightPx * pageWidthMm) / canvas.width
        const sliceData = sliceCanvas.toDataURL('image/png')

        if (!isFirstPage) pdf.addPage()
        isFirstPage = false
        pdf.addImage(sliceData, 'PNG', 0, 0, pageWidthMm, sliceImgHeightMm)
      }
    }

    const fileName = `Fiche-${sanitizeFileNamePart(character.name || `personnage-${characterId}`)}.pdf`
    pdf.save(fileName)
  } finally {
    root.unmount()
    container.remove()
  }
}
