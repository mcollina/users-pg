INSERT INTO users (username, hash, salt) VALUES ($1, $2, $3) RETURNING id, username, hash, salt
