import sqlite3 from "sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

sqlite3.verbose();
const dbFile = join(process.cwd(), "server", "therapeutic_ai.sqlite3");
const db = new sqlite3.Database(dbFile);

// run schema once
const schema = readFileSync(join(process.cwd(), "server", "schema.sql"), "utf8");
db.exec(schema);

export default {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
  }
};
