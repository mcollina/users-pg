CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  username VARCHAR(40) not null UNIQUE,
  salt TEXT not null,
  hash TEXT not null
)
