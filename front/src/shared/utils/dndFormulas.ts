/** Modificateur de caractéristique D&D 5e. Voir skill 2d10-dnd-rules pour l'inventaire des duplications existantes. */
export function getAbilityModifier(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.floor((score - 10) / 2)
}

/** Bonus de maîtrise D&D 5e basé sur le niveau (personnages uniquement, pas les monstres). */
export function getProficiencyBonus(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 0
  return 2 + Math.floor((level - 1) / 4)
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : String(mod)
}
