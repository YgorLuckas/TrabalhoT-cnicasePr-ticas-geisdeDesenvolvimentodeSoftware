-- Ativa foreign keys para relacionamentos
PRAGMA foreign_keys = ON;

-- Tabela de usuários (já OK, com name opcional)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT 'Usuário',  -- Default para evitar NULL issues
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de viagens (simples, ligada ao user)
CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ✅ Tabela de despesas (corrigida: trip_id opcional para despesas pessoais ou ligadas a trips)
-- Adicionei amount_brl e currency para conversão (como no código monolítico)
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  trip_id INTEGER,  -- ✅ Opcional (NULL para despesas não ligadas a trip)
  name TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'BRL',
  amount_brl REAL NOT NULL,  -- Valor convertido para BRL
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL  -- Se trip deletada, vira pessoal
);

-- ✅ Tabela para participantes de trips (CORRIGIDA: adicionadas share e created_at)
CREATE TABLE IF NOT EXISTS trip_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  share REAL DEFAULT 1.0 CHECK (share > 0 AND share <= 1),  -- Porcentagem de divisão (ex: 0.5 = metade)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Data de adição
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(trip_id, user_id)  -- Um user por trip
);