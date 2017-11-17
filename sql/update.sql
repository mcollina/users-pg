UPDATE users SET username=$2, hash=$3 WHERE id=$1 RETURNING id, username, hash
