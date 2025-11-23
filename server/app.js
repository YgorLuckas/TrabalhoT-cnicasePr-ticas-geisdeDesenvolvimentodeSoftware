const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const dbFile =
  process.env.DATABASE_FILE || path.join(__dirname, "../data/database.sqlite");
const dataDir = path.dirname(dbFile);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbFile);

try {
  const before = db
    .prepare("SELECT COUNT(*) as count FROM trips WHERE start_date = ''")
    .get().count;
  db.prepare("UPDATE trips SET start_date = NULL WHERE start_date = '';").run();
  db.prepare("UPDATE trips SET end_date = NULL WHERE end_date = '';").run();
  const after = db
    .prepare("SELECT COUNT(*) as count FROM trips WHERE start_date IS NULL")
    .get().count;
  console.log(`Limpeza: ${before} linhas com '' -> ${after} com NULL.`);
} catch (error) {
  console.error("Erro na limpeza:", error);
}

function init() {
  const initSQL = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");
  db.exec(initSQL);
  console.log("📦 Banco inicializado com sucesso!");
}

init();
module.exports = db;
