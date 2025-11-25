-- Ativa foreign keys
PRAGMA foreign_keys = ON;

-- ===============================
-- Limpa tabelas existentes
-- ===============================
DROP TABLE IF EXISTS travel_requests;
DROP TABLE IF EXISTS trip_participants;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS users;

-- ===============================
-- Usuários
-- ===============================
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT 'Usuário',
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- Viagens
-- ===============================
CREATE TABLE trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===============================
-- Despesas
-- ===============================
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  trip_id INTEGER,
  name TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'BRL',
  amount_brl REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
);

-- ===============================
-- Participantes
-- ===============================
CREATE TABLE trip_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  share REAL DEFAULT 1.0 CHECK (share > 0 AND share <= 1),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(trip_id, user_id)
);

-- ===============================
-- Solicitações de Viagem
-- ===============================
CREATE TABLE travel_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  destino TEXT NOT NULL,
  data_inicio TEXT NOT NULL,
  data_fim TEXT NOT NULL,
  custo_estimado REAL NOT NULL,
  motivo TEXT NOT NULL,
  observacoes TEXT,
  status TEXT DEFAULT 'pendente',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
