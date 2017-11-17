CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  username VARCHAR(40) not null UNIQUE,
  hash TEXT not null
)
