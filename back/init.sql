-- Créer la table des rôles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer les rôles par défaut
INSERT INTO roles (name, description) VALUES 
    ('user', 'Utilisateur standard'),
    ('gm', 'Game Master - Gestionnaire de jeu'),
    ('admin', 'Administrateur avec tous les privilèges')
ON CONFLICT (name) DO NOTHING;

-- Créer un utilisateur admin par défaut (mot de passe: admin123)
-- Le mot de passe sera hashé dans l'application
INSERT INTO users (username, email, password_hash, role_id) VALUES 

    ('admin', 'admin@2d10.com', '$2a$10$rQZ8kF5jH9vL2mN3pQ6wOe8xYzA1bC4dE7fG0hI3jK6lM9nP2qR5sT8uV1wX4yZ', 2)
ON CONFLICT (email) DO NOTHING;

-- Créer la table des personnages
CREATE TABLE IF NOT EXISTS characters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    race VARCHAR(50),
    class VARCHAR(50),
    level INTEGER DEFAULT 1,
    background VARCHAR(50),
    alignment VARCHAR(20),
    experience_points INTEGER DEFAULT 0,
    hit_points INTEGER,
    armor_class INTEGER,
    speed INTEGER,
    strength INTEGER DEFAULT 10,
    dexterity INTEGER DEFAULT 10,
    constitution INTEGER DEFAULT 10,
    intelligence INTEGER DEFAULT 10,
    wisdom INTEGER DEFAULT 10,
    charisma INTEGER DEFAULT 10,
    description TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des types d'objets
CREATE TABLE IF NOT EXISTS item_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des objets
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    item_type_id INTEGER REFERENCES item_types(id),
    weight DECIMAL(5,2) DEFAULT 0,
    value_gold DECIMAL(10,2) DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common',
    is_magical BOOLEAN DEFAULT false,
    properties JSONB,
    -- Propriétés spécifiques aux armes
    damage_dice VARCHAR(20), -- ex: "1d8", "2d6"
    damage_type VARCHAR(50), -- ex: "Tranchant", "Perforant", "Contondant"
    weapon_range INTEGER, -- portée en mètres
    weapon_type VARCHAR(50), -- ex: "Mêlée", "Distance", "Lancé"
    -- Propriétés spécifiques aux armures
    armor_class_bonus INTEGER, -- bonus à la CA
    armor_type VARCHAR(50), -- ex: "Légère", "Intermédiaire", "Lourde"
    stealth_disadvantage BOOLEAN DEFAULT false,
    -- Propriétés générales
    requires_attunement BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des slots d'équipement
CREATE TABLE IF NOT EXISTS equipment_slots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    max_items INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table de l'inventaire des personnages
CREATE TABLE IF NOT EXISTS character_inventory (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    is_equipped BOOLEAN DEFAULT false,
    equipment_slot_id INTEGER REFERENCES equipment_slots(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, item_id)
);

-- Créer la table de la bourse des personnages
CREATE TABLE IF NOT EXISTS character_purse (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    copper_pieces INTEGER DEFAULT 0,
    silver_pieces INTEGER DEFAULT 0,
    electrum_pieces INTEGER DEFAULT 0,
    gold_pieces INTEGER DEFAULT 0,
    platinum_pieces INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id)
);

-- Insérer les types d'objets de base
INSERT INTO item_types (name, description) VALUES 
    ('Arme', 'Armes de mêlée et à distance'),
    ('Armure', 'Protection corporelle'),
    ('Bouclier', 'Protection supplémentaire'),
    ('Objet magique', 'Objets dotés de propriétés magiques'),
    ('Potion', 'Consommables magiques'),
    ('Parchemin', 'Sorts sur parchemin'),
    ('Gemme', 'Pierres précieuses et gemmes'),
    ('Outils', 'Outils d''artisanat et de profession'),
    ('Vêtement', 'Vêtements et accessoires'),
    ('Nourriture', 'Nourriture et boissons'),
    ('Autre', 'Autres objets divers')
ON CONFLICT (name) DO NOTHING;

-- Insérer les slots d'équipement
INSERT INTO equipment_slots (name, description, max_items) VALUES 
    ('Main droite', 'Arme principale tenue en main droite', 1),
    ('Main gauche', 'Arme secondaire ou bouclier en main gauche', 1),
    ('Armure', 'Armure corporelle', 1),
    ('Casque', 'Protection de la tête', 1),
    ('Bottes', 'Chaussures et bottes', 1),
    ('Gants', 'Gants et mitaines', 1),
    ('Anneau 1', 'Premier anneau magique', 1),
    ('Anneau 2', 'Deuxième anneau magique', 1),
    ('Amulette', 'Collier et amulette', 1),
    ('Cape', 'Cape et manteau', 1),
    ('Sac', 'Sac à dos et contenants', 1),
    ('Autre', 'Autres emplacements', 10)
ON CONFLICT (name) DO NOTHING;

-- Insérer quelques objets de base
INSERT INTO items (name, description, item_type_id, weight, value_gold, rarity) VALUES 
    ('Épée longue', 'Une épée à une main, arme de mêlée', 1, 3.0, 15.0, 'common'),
    ('Arc long', 'Un arc de guerre, arme à distance', 1, 2.0, 50.0, 'common'),
    ('Armure de cuir', 'Protection légère en cuir', 2, 10.0, 10.0, 'common'),
    ('Bouclier', 'Protection supplémentaire', 3, 6.0, 10.0, 'common'),
    ('Potion de soins', 'Restaure 2d4+2 points de vie', 5, 0.5, 50.0, 'common'),
    ('Sac à dos', 'Contient 30 livres d''équipement', 9, 5.0, 2.0, 'common'),
    ('Torche', 'Source de lumière', 9, 1.0, 0.01, 'common'),
    ('Rations', 'Nourriture pour une journée', 10, 2.0, 0.5, 'common')
ON CONFLICT DO NOTHING;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_name ON characters(name);
CREATE INDEX IF NOT EXISTS idx_characters_class ON characters(class);
CREATE INDEX IF NOT EXISTS idx_characters_level ON characters(level);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type_id);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON items(rarity);
CREATE INDEX IF NOT EXISTS idx_character_inventory_character_id ON character_inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_character_inventory_item_id ON character_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_character_purse_character_id ON character_purse(character_id);

-- Créer la table des parties (campaigns)
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    gm_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    setting VARCHAR(100), -- ex: "Forgotten Realms", "Eberron", "Homebrew"
    max_players INTEGER DEFAULT 6,
    current_players INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, cancelled
    start_date DATE,
    end_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table des sessions de jeu
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    title VARCHAR(100),
    description TEXT,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(100),
    notes TEXT,
    xp_awarded INTEGER DEFAULT 0,
    gold_awarded DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, session_number)
);

-- Créer la table d'association personnages-parties
CREATE TABLE IF NOT EXISTS campaign_characters (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- active, left, kicked
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(campaign_id, character_id)
);

-- Créer la table de présence aux sessions
CREATE TABLE IF NOT EXISTS session_attendance (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT true,
    xp_earned INTEGER DEFAULT 0,
    gold_earned DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, character_id)
);

-- Créer la table du grimoire des personnages
CREATE TABLE IF NOT EXISTS character_grimoire (
    id SERIAL PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
    spell_id INTEGER, -- ID du sort dans la table dnd_spells
    spell_slug VARCHAR(200), -- Slug du sort pour référence
    spell_name VARCHAR(300) NOT NULL, -- Nom du sort (pour éviter les jointures)
    spell_level INTEGER NOT NULL, -- Niveau du sort
    spell_school VARCHAR(100), -- École de magie
    is_prepared BOOLEAN DEFAULT false, -- Sort préparé (pour les classes qui préparent)
    is_known BOOLEAN DEFAULT true, -- Sort connu (pour les classes spontanées)
    times_prepared INTEGER DEFAULT 0, -- Nombre de fois préparé
    times_cast INTEGER DEFAULT 0, -- Nombre de fois lancé
    notes TEXT, -- Notes personnelles sur le sort
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Quand le sort a été appris
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, spell_slug)
);

-- Créer les index pour les nouvelles tables
CREATE INDEX IF NOT EXISTS idx_campaigns_gm_id ON campaigns(gm_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_campaign_id ON game_sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_date ON game_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_campaign_characters_campaign_id ON campaign_characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_characters_character_id ON campaign_characters(character_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_session_id ON session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_character_id ON session_attendance(character_id);
CREATE INDEX IF NOT EXISTS idx_character_grimoire_character_id ON character_grimoire(character_id);
CREATE INDEX IF NOT EXISTS idx_character_grimoire_spell_slug ON character_grimoire(spell_slug);
CREATE INDEX IF NOT EXISTS idx_character_grimoire_level ON character_grimoire(spell_level);
CREATE INDEX IF NOT EXISTS idx_character_grimoire_prepared ON character_grimoire(is_prepared);
