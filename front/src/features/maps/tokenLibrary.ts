// Bibliothèque de jetons commune (back/routes/token-library.js).

export type TokenSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'
export type LibraryToken = { id: number; name: string; category: string | null; size: TokenSize; scale: number; url: string; source_path: string }

/** Emprise au sol en cases (règles 5e). */
export const SIZE_CELLS: Record<TokenSize, number> = { tiny: 0.5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 }
const SIZES = Object.keys(SIZE_CELLS) as TokenSize[]

/**
 * Nom, catégorie et taille tirés du chemin d'un fichier.
 * Format Forgotten Adventures : `FA_Tokens/Creatures/Monstrosity/Brown_Scavver_A1_Large_Scale120_Monstrosity_01.png`
 * → « Brown Scavver », « Creatures · Monstrosity », large, illustration à 1,2 × l'emprise. Tout autre nom → nom du fichier, taille moyenne.
 */
export function parseTokenPath(path: string): { name: string; category: string | null; size: TokenSize; scale: number } {
  const parts = path.split('/').filter(Boolean)
  const file = (parts.pop() ?? '').replace(/\.[^.]+$/, '')
  const folders = parts[0] === 'FA_Tokens' ? parts.slice(1) : parts.slice(-2)
  const words = file.split('_')
  const variant = words.findIndex((w) => /^[A-Z]\d+$/.test(w))
  const size = words.map((w) => w.toLowerCase()).find((w): w is TokenSize => (SIZES as string[]).includes(w)) ?? 'medium'
  const scaleWord = words.find((w) => /^Scale\d+$/.test(w))
  const scale = scaleWord ? Number.parseInt(scaleWord.slice(5), 10) / 100 : 1
  const name = (variant > 0 ? words.slice(0, variant) : words).join(' ').trim() || file
  return { name, category: folders.length ? folders.join(' · ') : null, size, scale: scale > 0 ? scale : 1 }
}

/** Réduit une image (côté le plus long) et la réencode en WebP, ou PNG si le navigateur ne sait pas (Safari). */
export async function shrinkImage(file: Blob, maxSide: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bmp.width * k))
  canvas.height = Math.max(1, Math.round(bmp.height * k))
  canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  if (!blob) throw new Error('Conversion impossible')
  return blob
}
