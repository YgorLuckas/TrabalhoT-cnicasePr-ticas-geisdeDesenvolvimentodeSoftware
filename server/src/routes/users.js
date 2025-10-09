const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../../app"); // Já corrigido

const router = express.Router();

// POST /api/users/register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios!" });
  }

  try {
    console.log("Tentando register para email:", email); // Log para debug

    // Verifica se email já existe
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email já cadastrado!" });
    }

    // Validação de senha
    if (password.length < 3) {
      return res
        .status(400)
        .json({ error: "Senha deve ter pelo menos 3 caracteres!" });
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(password, 10);

    // ✅ CORREÇÃO: Insere com 'name' default (ex: primeiro parte do email ou 'Usuário')
    const userName =
      email.split("@")[0].charAt(0).toUpperCase() +
        email.split("@")[0].slice(1).split(".")[0] || "Usuário"; // Ex: "Teste" de "teste@example.com"
    const insert = db.prepare(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)"
    );
    const result = insert.run(userName, email, passwordHash);

    console.log("Usuário criado com ID:", result.lastInsertRowid); // Log para debug

    // Gera token JWT
    const token = jwt.sign(
      { userId: result.lastInsertRowid },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res
      .status(201)
      .json({
        message: "Conta criada com sucesso!",
        token,
        user: { id: result.lastInsertRowid, name: userName, email },
      });
  } catch (error) {
    console.error("Erro no register:", error.message); // Log melhor
    res
      .status(500)
      .json({ error: "Erro interno do servidor: " + error.message });
  }
});

// POST /api/users/login (mantido igual)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Credenciais inválidas!" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro no login." });
  }
});

module.exports = router;
