const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = 4000;
const JWT_SECRET = "seu_jwt_secret_aqui_mude_para_prod"; // Troque em produção
const DB_PATH = "./data/database.sqlite";

app.use(express.json());
app.use(cors({ origin: ["http://localhost:5500", "http://127.0.0.1:5500"] }));

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Token não fornecido" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
};

// Inicializa o banco
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT 'Novo Usuário',
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trip_id INTEGER,
    name TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'BRL',
    amount_brl REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE SET NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS trip_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    share REAL DEFAULT 1.0 CHECK (share > 0 AND share <= 1),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, user_id),
    FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS travel_requests (
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
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
});

// Conversão de moeda para BRL
async function convertToBRL(amount, currency) {
  if (currency === "BRL") return amount;
  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${currency}`
    );
    if (!response.ok) throw new Error("API de câmbio indisponível");
    const data = await response.json();
    const rate = data.rates.BRL;
    if (!rate) throw new Error("Taxa de câmbio não encontrada");
    return amount * rate;
  } catch (err) {
    console.error("Erro na conversão de moeda:", err);
    return amount;
  }
}

// ================= ROTAS ================= //

// Registro
app.post("/api/users/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6)
    return res
      .status(400)
      .json({ error: "Email e senha obrigatórios (mín. 6 chars)" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hashed],
      function (err) {
        if (err) return res.status(400).json({ error: "Email já cadastrado" });
        const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, {
          expiresIn: "1h",
        });
        res.json({
          message: "Conta criada!",
          token,
          user: { id: this.lastID, email },
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Login
app.post("/api/users/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email e senha obrigatórios" });

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: "Email ou senha incorretos" });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      message: "Login realizado!",
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  });
});

// Criar viagem
app.post("/api/trips", authMiddleware, (req, res) => {
  const { name, start_date, end_date } = req.body;
  const user_id = req.userId;

  if (!name || !start_date || !end_date)
    return res.status(400).json({ error: "Nome e datas obrigatórios" });

  db.run(
    "INSERT INTO trips (user_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
    [user_id, name, start_date, end_date],
    function (err) {
      if (err) return res.status(500).json({ error: "Erro ao criar viagem" });
      res.status(201).json({ message: "Viagem criada!", id: this.lastID });
    }
  );
});

// Listar viagens
app.get("/api/trips", authMiddleware, (req, res) => {
  const user_id = req.userId;
  db.all(
    "SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC",
    [user_id],
    (err, trips) => {
      if (err) return res.status(500).json({ error: "Erro ao listar viagens" });
      res.json({ trips, count: trips.length });
    }
  );
});

// ====================== NOVA ROTA DELETE ====================== //
app.delete("/api/trips/:id", authMiddleware, (req, res) => {
  const trip_id = parseInt(req.params.id);
  const user_id = req.userId;

  db.run(
    "DELETE FROM trips WHERE id = ? AND user_id = ?",
    [trip_id, user_id],
    function (err) {
      if (err) return res.status(500).json({ error: "Erro ao remover viagem" });
      if (this.changes === 0)
        return res.status(404).json({ error: "Viagem não encontrada" });
      res.json({ message: "Viagem removida com sucesso!" });
    }
  );
});

// Criar despesa
app.post("/api/expenses", authMiddleware, async (req, res) => {
  const { name, amount, trip_id, currency = "BRL" } = req.body;
  const user_id = req.userId;

  if (!name || !amount || amount <= 0)
    return res.status(400).json({ error: "Nome e amount >0 obrigatórios" });

  try {
    const amount_brl = await convertToBRL(amount, currency);

    const insertExpense = () => {
      db.run(
        "INSERT INTO expenses (user_id, trip_id, name, amount, currency, amount_brl) VALUES (?, ?, ?, ?, ?, ?)",
        [user_id, trip_id || null, name, amount, currency, amount_brl],
        function (err) {
          if (err)
            return res.status(500).json({ error: "Erro ao criar despesa" });
          res.status(201).json({ message: "Despesa criada!", id: this.lastID });
        }
      );
    };

    if (trip_id) {
      db.get(
        "SELECT id FROM trips WHERE id = ? AND user_id = ?",
        [trip_id, user_id],
        (err, trip) => {
          if (err || !trip)
            return res.status(404).json({ error: "Viagem inválida" });
          insertExpense();
        }
      );
    } else insertExpense();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar despesas
app.get("/api/expenses", authMiddleware, (req, res) => {
  const user_id = req.userId;
  db.all(
    "SELECT * FROM expenses WHERE user_id = ? ORDER BY created_at DESC",
    [user_id],
    (err, expenses) => {
      if (err)
        return res.status(500).json({ error: "Erro ao listar despesas" });
      res.json({ expenses, count: expenses.length });
    }
  );
});

// Criar solicitação de viagem
app.post("/api/travel-requests", authMiddleware, (req, res) => {
  const {
    destino,
    data_inicio,
    data_fim,
    custo_estimado,
    motivo,
    observacoes,
  } = req.body;
  const user_id = req.userId;

  if (!destino || !data_inicio || !data_fim || !custo_estimado || !motivo)
    return res.status(400).json({ error: "Campos obrigatórios faltando" });

  db.run(
    `INSERT INTO travel_requests (user_id, destino, data_inicio, data_fim, custo_estimado, motivo, observacoes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente')`,
    [
      user_id,
      destino,
      data_inicio,
      data_fim,
      custo_estimado,
      motivo,
      observacoes,
    ],
    function (err) {
      if (err)
        return res.status(500).json({ error: "Erro ao salvar solicitação" });
      res.status(201).json({ message: "Solicitação criada", id: this.lastID });
    }
  );
});

// Listar solicitações
app.get("/api/travel-requests", authMiddleware, (req, res) => {
  const { status } = req.query;
  const user_id = req.userId;
  let query = "SELECT * FROM travel_requests WHERE user_id = ?";
  const params = [user_id];
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  query += " ORDER BY created_at DESC";

  db.all(query, params, (err, requests) => {
    if (err)
      return res.status(500).json({ error: "Erro ao buscar solicitações" });
    res.json({ requests });
  });
});

// Atualizar status de solicitação e criar viagem se aprovado
app.patch("/api/travel-requests/:id", authMiddleware, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user_id = req.userId;

  if (!["pendente", "aprovado", "rejeitado"].includes(status))
    return res.status(400).json({ error: "Status inválido" });

  db.get(
    "SELECT * FROM travel_requests WHERE id = ? AND user_id = ?",
    [id, user_id],
    (err, request) => {
      if (err)
        return res.status(500).json({ error: "Erro ao buscar solicitação" });
      if (!request)
        return res.status(404).json({ error: "Solicitação não encontrada" });

      db.run(
        "UPDATE travel_requests SET status = ? WHERE id = ? AND user_id = ?",
        [status, id, user_id],
        function (err) {
          if (err)
            return res
              .status(500)
              .json({ error: "Erro ao atualizar solicitação" });

          if (status === "aprovado") {
            db.run(
              "INSERT INTO trips (user_id, name, start_date, end_date) VALUES (?, ?, ?, ?)",
              [user_id, request.destino, request.data_inicio, request.data_fim],
              function (err) {
                if (err)
                  return res
                    .status(500)
                    .json({ error: "Erro ao criar viagem" });
                res.json({
                  message: "Solicitação aprovada e viagem criada!",
                  trip_id: this.lastID,
                });
              }
            );
          } else res.json({ message: `Solicitação ${status}!` });
        }
      );
    }
  );
});

// ================= Participantes e split ================= //

// Adicionar participante
app.post("/api/trips/:id/participants", authMiddleware, async (req, res) => {
  const trip_id = parseInt(req.params.id);
  const { email, share = 1.0 } = req.body;
  const owner_id = req.userId;

  if (!email || isNaN(share) || share <= 0 || share > 1)
    return res
      .status(400)
      .json({ error: "Email e share entre 0.01 e 1 obrigatórios" });

  db.get(
    "SELECT id FROM trips WHERE id = ? AND user_id = ?",
    [trip_id, owner_id],
    async (err, trip) => {
      if (err || !trip)
        return res.status(404).json({ error: "Viagem inválida" });

      db.get(
        "SELECT id FROM users WHERE email = ?",
        [email],
        async (err, user) => {
          let user_id;
          if (!user) {
            const hashed = await bcrypt.hash("123456", 10);
            db.run(
              "INSERT INTO users (email, password) VALUES (?, ?)",
              [email, hashed],
              function (err) {
                if (err)
                  return res
                    .status(500)
                    .json({ error: "Erro ao criar participante" });
                user_id = this.lastID;
                insertParticipant(user_id);
              }
            );
          } else {
            user_id = user.id;
            insertParticipant(user_id);
          }

          function insertParticipant(u_id) {
            db.run(
              "INSERT OR IGNORE INTO trip_participants (trip_id, user_id, share) VALUES (?, ?, ?)",
              [trip_id, u_id, share],
              function (err) {
                if (err || this.changes === 0)
                  return res
                    .status(400)
                    .json({ error: "Participante já adicionado ou erro" });
                res.json({
                  message: "Participante adicionado!",
                  user_id: u_id,
                  share,
                });
              }
            );
          }
        }
      );
    }
  );
});

// Listar participantes
app.get("/api/trips/:id/participants", authMiddleware, (req, res) => {
  const trip_id = parseInt(req.params.id);
  const owner_id = req.userId;

  db.get(
    "SELECT id FROM trips WHERE id = ? AND user_id = ?",
    [trip_id, owner_id],
    (err, trip) => {
      if (err)
        return res.status(500).json({ error: "Erro ao verificar viagem" });
      if (!trip)
        return res
          .status(404)
          .json({ error: "Viagem não encontrada ou acesso negado" });

      db.all(
        `SELECT tp.id, tp.share, tp.created_at, u.email 
       FROM trip_participants tp 
       JOIN users u ON tp.user_id = u.id 
       WHERE tp.trip_id = ? 
       ORDER BY tp.created_at ASC`,
        [trip_id],
        (err, participants) => {
          if (err)
            return res
              .status(500)
              .json({ error: "Erro ao listar participantes" });
          res.json({ participants });
        }
      );
    }
  );
});

// Split de despesas
app.get("/api/trips/:id/split", authMiddleware, (req, res) => {
  const trip_id = parseInt(req.params.id);
  const user_id = req.userId;

  db.get(
    "SELECT * FROM trips WHERE id = ? AND user_id = ?",
    [trip_id, user_id],
    (err, trip) => {
      if (err || !trip)
        return res.status(404).json({ error: "Viagem inválida" });

      db.get(
        "SELECT SUM(amount_brl) as total FROM expenses WHERE trip_id = ?",
        [trip_id],
        (err, totalRow) => {
          const total_brl = totalRow ? totalRow.total || 0 : 0;

          db.all(
            "SELECT tp.user_id, tp.share, u.email FROM trip_participants tp JOIN users u ON tp.user_id = u.id WHERE tp.trip_id = ?",
            [trip_id],
            (err, participants) => {
              if (err)
                return res
                  .status(500)
                  .json({ error: "Erro no cálculo de split" });

              const total_shares = participants.reduce(
                (sum, p) => sum + p.share,
                0
              );
              const splits = participants.map((p) => ({
                user_id: p.user_id,
                email: p.email,
                share: p.share,
                deve_pagar:
                  total_shares > 0
                    ? (total_brl * (p.share / total_shares)).toFixed(2)
                    : "0.00",
              }));

              res.json({
                trip_name: trip.name,
                total_brl: total_brl.toFixed(2),
                total_participants: participants.length,
                participants: splits,
              });
            }
          );
        }
      );
    }
  );
});

// ================= Inicia servidor ================= //
app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
);
