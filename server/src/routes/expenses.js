const express = require("express");
const db = require("../../app"); // Caminho corrigido para db.js

const router = express.Router(); // ✅ Declaração do router (faltava isso!)

// GET /api/expenses?userId=1 (lista despesas do usuário, opcionalmente filtrado por trip_id)
router.get("/", (req, res) => {
  const userId = req.query.userId;
  const tripId = req.query.tripId; // Opcional: filtro por trip
  if (!userId) {
    return res.status(400).json({ error: "Parâmetro 'userId' é obrigatório!" });
  }

  try {
    console.log(
      `Listando expenses para userId: ${userId}, tripId: ${
        tripId || "qualquer"
      }`
    ); // Log extra

    let query = `
      SELECT id, user_id, trip_id, name, amount, created_at 
      FROM expenses 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (tripId) {
      query += " AND trip_id = ?";
      params.push(tripId);
    }

    query += " ORDER BY created_at DESC";

    const expenses = db.prepare(query).all(...params);
    res.json({ expenses, count: expenses.length });
  } catch (error) {
    console.error("Erro ao listar expenses:", error.message);
    res
      .status(500)
      .json({ error: "Erro interno do servidor: " + error.message });
  }
});

// POST /api/expenses (cria despesa, com trip_id opcional)
router.post("/", (req, res) => {
  const { user_id, name, amount, trip_id } = req.body; // trip_id opcional
  console.log(
    `Tentando criar expense: user_id=${user_id}, name=${name}, amount=${amount}, trip_id=${
      trip_id || "NULL"
    }`
  );

  if (!user_id || !name || amount == null || amount <= 0) {
    return res
      .status(400)
      .json({ error: "user_id, name e amount (positivo) são obrigatórios!" });
  }

  try {
    // Validação: User existe
    const userExists = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(user_id);
    if (!userExists) {
      return res.status(404).json({ error: "Usuário não encontrado!" });
    }
    console.log("User  existe, prosseguindo com INSERT");

    // Validação opcional: Se trip_id fornecido, verifica se trip existe e pertence ao user
    let tripIdParam = null;
    if (trip_id) {
      const tripExists = db
        .prepare(
          `
        SELECT id FROM trips WHERE id = ? AND user_id = ?
      `
        )
        .get(trip_id, user_id);
      if (!tripExists) {
        return res
          .status(404)
          .json({ error: "Trip não encontrada ou não pertence ao usuário!" });
      }
      tripIdParam = trip_id;
      console.log("Trip válida, usando trip_id:", tripIdParam);
    } else {
      console.log("Sem trip_id: despesa pessoal (trip_id = NULL)");
    }

    // INSERT com trip_id (NULL se não fornecido)
    const insert = db.prepare(`
      INSERT INTO expenses (user_id, trip_id, name, amount) 
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(user_id, tripIdParam, name, amount);
    console.log("INSERT sucesso, novo ID:", result.lastInsertRowid);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: "Despesa criada com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao criar expense:", error.message);
    console.error("Stack trace:", error.stack);
    res
      .status(500)
      .json({ error: "Erro interno do servidor: " + error.message });
  }
});

// PUT /api/expenses/:id (atualiza despesa, incluindo trip_id opcional)
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { name, amount, trip_id } = req.body;
  if (!name && amount == null && trip_id == null) {
    return res.status(400).json({
      error:
        "Pelo menos um campo (name, amount ou trip_id) deve ser fornecido!",
    });
  }

  try {
    // Verifica se expense existe e pertence ao user (mas como não tem userId no PUT, assumimos auth futura)
    let query = "UPDATE expenses SET ";
    const params = [];
    if (name !== undefined) {
      query += "name = ?, ";
      params.push(name);
    }
    if (amount !== undefined) {
      query += "amount = ?, ";
      params.push(amount);
    }
    if (trip_id !== undefined) {
      query += "trip_id = ?, ";
      params.push(trip_id || null); // Permite NULL
    }
    query = query.slice(0, -2) + " WHERE id = ?";
    params.push(id);

    console.log("Query UPDATE:", query, "Params:", params);

    const update = db.prepare(query);
    const result = update.run(...params);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Despesa não encontrada!" });
    }
    res.json({ message: "Despesa atualizada!" });
  } catch (error) {
    console.error("Erro ao atualizar expense:", error.message);
    res
      .status(500)
      .json({ error: "Erro interno do servidor: " + error.message });
  }
});

// DELETE /api/expenses/:id
router.delete("/:id", (req, res) => {
  const id = req.params.id;

  try {
    const result = db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Despesa não encontrada!" });
    }
    res.json({ message: "Despesa deletada!" });
  } catch (error) {
    console.error("Erro ao deletar expense:", error.message);
    res
      .status(500)
      .json({ error: "Erro interno do servidor: " + error.message });
  }
});

module.exports = router; // Exporta o router
