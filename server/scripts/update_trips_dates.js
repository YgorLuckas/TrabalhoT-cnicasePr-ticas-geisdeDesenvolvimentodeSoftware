const Database = require("better-sqlite3");
const path = require("path");

const dbFile = path.join(__dirname, "../data/database.sqlite");
const db = new Database(dbFile);

try {
  db.exec(`
    ALTER TABLE trips ADD COLUMN start_date TEXT;
    ALTER TABLE trips ADD COLUMN end_date TEXT;
  `);

  console.log("🔥 Colunas adicionadas com sucesso!");
} catch (err) {
  console.error("Erro ao alterar tabela:", err);
}
