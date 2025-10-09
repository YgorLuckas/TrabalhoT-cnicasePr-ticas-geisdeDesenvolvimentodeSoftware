const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const dbFile = process.env.DATABASE_FILE || path.join(__dirname, "../data/database.sqlite");
const dataDir = path.dirname(dbFile);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbFile);

function init() {
  const initSQL = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");
  db.exec(initSQL);
  console.log("📦 Banco inicializado com sucesso!");
}

init();
module.exports = db;
