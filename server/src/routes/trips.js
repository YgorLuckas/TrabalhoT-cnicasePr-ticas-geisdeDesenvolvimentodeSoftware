const express = require("express");
const db = require("../../app"); // seu db preparado (better-sqlite3)

const router = express.Router();

// =========================================
// GET /api/trips?userId=1  -> Lista viagens
// =========================================
router.get("/", (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ error: "Parâmetro 'userId' é obrigatório!" });
  }

  try {
    const trips = db
      .prepare(
        `
        SELECT 
          id, 
          name, 
          created_at,
          start_date,
          end_date,
          estimated_cost
        FROM trips
        WHERE user_id = ?
        ORDER BY created_at DESC
      `
      )
      .all(userId);

    const tripsFormatted = trips.map((trip) => ({
      ...trip,
      start_date:
        trip.start_date && trip.start_date.trim() !== ""
          ? trip.start_date
          : null,
      end_date:
        trip.end_date && trip.end_date.trim() !== "" ? trip.end_date : null,
      estimated_cost: trip.estimated_cost || 0,
    }));

    res.json({ trips: tripsFormatted, count: trips.length });
  } catch (error) {
    console.error("Erro ao listar trips:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// =========================================
// POST /api/trips  -> Criar nova viagem
// =========================================
router.post("/", (req, res) => {
  const { user_id, name, start_date, end_date, estimated_cost = 0 } = req.body;

  if (!user_id || !name) {
    return res.status(400).json({ error: "user_id e name são obrigatórios!" });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO trips (user_id, name, start_date, end_date, estimated_cost)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      user_id,
      name,
      start_date ? start_date : null,
      end_date ? end_date : null,
      estimated_cost
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      message: "Viagem criada com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao criar trip:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

module.exports = router;
