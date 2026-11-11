import fs from "node:fs";
import { nanoid } from "nanoid";
import { openDatabase } from "@/db/connection";
import { migrate } from "@/db/migrate";

const DB_PATH = process.env.DATABASE_PATH ?? "data/app.db";

for (const suffix of ["", "-shm", "-wal"]) {
  fs.rmSync(DB_PATH + suffix, { force: true });
}

const db = openDatabase(DB_PATH);
migrate(db);

const groupId = nanoid(12);

db.transaction(() => {
  db.prepare("INSERT INTO groups (id, name, currency) VALUES (?, ?, ?)").run(
    groupId,
    "Housemates",
    "JPY",
  );

  const addMember = (name: string): number =>
    Number(
      db
        .prepare("INSERT INTO members (group_id, name) VALUES (?, ?)")
        .run(groupId, name).lastInsertRowid,
    );

  const addExpense = (
    paidBy: number,
    amount: number,
    note: string,
    date: string,
    shares: [memberId: number, share: number][],
  ) => {
    const id = Number(
      db
        .prepare(
          `INSERT INTO expenses (group_id, paid_by, amount_minor, note, spent_on)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(groupId, paidBy, amount, note, date).lastInsertRowid,
    );
    const insertSplit = db.prepare(
      "INSERT INTO splits (expense_id, member_id, share_minor) VALUES (?, ?, ?)",
    );
    for (const [memberId, share] of shares)
      insertSplit.run(id, memberId, share);
  };

  const alice = addMember("Alice");
  const bob = addMember("Bob");
  const carol = addMember("Carol");

  addExpense(alice, 3000, "Groceries", "2026-10-28", [
    [alice, 1000],
    [bob, 1000],
    [carol, 1000],
  ]);
  addExpense(bob, 9100, "Electricity", "2026-11-03", [
    [alice, 3034],
    [bob, 3033],
    [carol, 3033],
  ]);
  addExpense(carol, 2000, "Takeout (Bob skipped)", "2026-11-08", [
    [alice, 1000],
    [carol, 1000],
  ]);

  db.prepare(
    `INSERT INTO settlements (group_id, from_member, to_member, amount_minor)
     VALUES (?, ?, ?, ?)`,
  ).run(groupId, alice, bob, 2000);
})();

console.log(`Seeded group: ${groupId}\n`);
console.table(
  db
    .prepare(
      "SELECT name, balance_minor FROM member_balances WHERE group_id = ? ORDER BY member_id",
    )
    .all(groupId),
);
const sum = db
  .prepare(
    "SELECT SUM(balance_minor) AS total FROM member_balances WHERE group_id = ?",
  )
  .get(groupId) as { total: number };
console.log(`Sum of balances: ${sum.total}`);
