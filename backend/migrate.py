import sqlite3

db_path = r"c:/Users/User/Desktop/SynapseIQ/backend/synapse.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE channels ADD COLUMN is_dm BOOLEAN NOT NULL DEFAULT 0;")
except sqlite3.OperationalError:
    print("Column is_dm might already exist.")

try:
    cursor.execute("ALTER TABLE channels ADD COLUMN dm_user_1_id INTEGER REFERENCES users(id) ON DELETE CASCADE;")
except sqlite3.OperationalError:
    pass

try:
    cursor.execute("ALTER TABLE channels ADD COLUMN dm_user_2_id INTEGER REFERENCES users(id) ON DELETE CASCADE;")
except sqlite3.OperationalError:
    pass

conn.commit()
conn.close()
print("Migration completed.")
