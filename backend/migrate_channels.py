import sqlite3

db_path = r"c:/Users/User/Desktop/SynapseIQ/backend/synapse.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get all workspaces
cursor.execute("SELECT id FROM workspaces")
workspaces = cursor.fetchall()

for (ws_id,) in workspaces:
    # Check if a general channel exists
    cursor.execute("SELECT id FROM channels WHERE workspace_id = ? AND is_dm = 0 AND is_private = 0", (ws_id,))
    if not cursor.fetchone():
        # Create general channel
        print(f"Creating general channel for {ws_id}")
        cursor.execute("""
            INSERT INTO channels (workspace_id, name, description, is_private, is_dm)
            VALUES (?, ?, ?, ?, ?)
        """, (ws_id, "general", "General group chat for everyone", 0, 0))

conn.commit()
conn.close()
print("Migration completed.")
