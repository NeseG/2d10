const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateAdminPassword() {
  try {
    const password = 'admin123';
    const saltRounds = 10;
    
    console.log('Génération du hash pour le mot de passe:', password);
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Hash généré:', hash);
    
    // Mettre à jour le mot de passe admin dans la base de données
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING username, email',
      [hash, 'admin@2d10.com']
    );
    
    if (result.rows.length > 0) {
      console.log('Mot de passe admin mis à jour avec succès pour:', result.rows[0].email);
    } else {
      console.log('Aucun utilisateur admin trouvé');
    }
    
    // Vérifier que le hash fonctionne
    const testResult = await pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      ['admin@2d10.com']
    );
    
    if (testResult.rows.length > 0) {
      const isValid = await bcrypt.compare(password, testResult.rows[0].password_hash);
      console.log('Vérification du hash:', isValid ? 'SUCCÈS' : 'ÉCHEC');
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await pool.end();
  }
}

updateAdminPassword();
