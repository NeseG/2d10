/**
 * Importe un personnage décrit en JSON (saisi à partir d’une feuille Excel ou équivalent).
 *
 * Usage local :
 *   cd back
 *   CHARACTER_USER_ID=1 node scripts/import-excel-character.js [chemin/vers/fichier.json]
 *
 * Import à distance (HTTPS, compte **admin**) :
 *   POST /api/admin/characters/import
 *   Authorization: Bearer <token_admin>
 *   Body : JSON identique au fichier (inclure "userId" du propriétaire).
 *
 * Sans argument fichier : scripts/examples/revan-feuille-excel.json
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { importCharacterFromJson } = require('../lib/import-character-from-json');

const prisma = new PrismaClient();

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function parseUserId(data) {
  const fromEnv = process.env.CHARACTER_USER_ID;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    const n = Number.parseInt(String(fromEnv).trim(), 10);
    if (Number.isFinite(n) && n > 0) return n;
    throw new Error('CHARACTER_USER_ID invalide');
  }
  if (data.userId != null) {
    const n = Number.parseInt(String(data.userId), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  throw new Error(
    'Indiquez le propriétaire : variable CHARACTER_USER_ID=<id> ou champ numérique "userId" dans le JSON.',
  );
}

async function main() {
  const defaultExample = path.join(__dirname, 'examples', 'revan-feuille-excel.json');
  const jsonPath = path.resolve(process.cwd(), process.argv[2] || defaultExample);
  if (!fs.existsSync(jsonPath)) {
    console.error('Fichier introuvable :', jsonPath);
    process.exit(1);
  }

  const data = loadJson(jsonPath);
  const userId = parseUserId(data);

  const user = await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true } });
  if (!user) {
    console.error(`Utilisateur id=${userId} introuvable ou inactif.`);
    process.exit(1);
  }

  const character = await importCharacterFromJson(prisma, userId, data);
  console.log('Personnage créé :', { id: character.id, name: character.name, userId });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
