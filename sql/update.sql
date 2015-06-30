UPDATE users SET username=$2, hash=$3, salt=$4 WHERE id=$1 RETURNING id, username, hash, salt
