INSERT INTO users (username, hash) VALUES ($1, $2) RETURNING id, username, hash
