import sqlite3
con = sqlite3.connect("database/ecosmart.db")
con.row_factory = sqlite3.Row

print("--- Cultivo activo ---")
for r in con.execute("SELECT * FROM crops"):
    print(dict(r))

print("--- Config ---")
for r in con.execute("SELECT * FROM config"):
    print(dict(r))

print("--- Últimos 5 eventos de riego ---")
for r in con.execute("SELECT * FROM irrigation_events ORDER BY id DESC LIMIT 5"):
    print(dict(r))