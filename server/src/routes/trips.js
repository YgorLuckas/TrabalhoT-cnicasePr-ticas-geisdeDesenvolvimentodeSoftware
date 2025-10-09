const express = require("express");
const db = require("../../app"); // ✅ Corrigido: ../../ sobe para a raiz

const router = express.Router();

// GET /api/trips?userId=1 (lista viagens de um usuário)
router.get("/", (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "Parâmetro 'userId' é obrigatório!" });
  }

  try {
    const trips = db
      .prepare(
        `
      SELECT id, name, created_at 
      FROM trips 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `
      )
      .all(userId);
    res.json({ trips, count: trips.length });
  } catch (error) {
    console.error("Erro ao listar trips:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// POST /api/trips (cria uma nova viagem)
router.post("/", (req, res) => {
  const { user_id, name } = req.body; // Adicione mais campos se precisar (ex: destination, date)
  if (!user_id || !name) {
    return res.status(400).json({ error: "user_id e name são obrigatórios!" });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO trips (user_id, name) 
      VALUES (?, ?)
    `);
    const result = insert.run(user_id, name);
    res.status(201).json({
      id: result.lastInsertRowid,
      message: "Viagem criada com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao criar trip:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Adicione PUT/DELETE similar ao expenses se precisar...

module.exports = router;
