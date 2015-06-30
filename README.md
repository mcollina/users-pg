# users-pg

Manage Users, with node and postgres

## Install

```
npm install @matteo.collina/users-pg --save
```

<a name="api"></a>
## API

  * <a href="#users"><code><b>buildUsers()</b></code></a>
  * <a href="#put"><code>users.<b>put()</b></code></a>
  * <a href="#get"><code>users.<b>get()</b></code></a>
  * <a href="#authenticate"><code>users.<b>authenticate()</b></code></a>
  * <a href="#createSchema"><code>users.<b>createSchema()</b></code></a>
  * <a href="#dropSchema"><code>users.<b>dropSchema()</b></code></a>

-------------------------------------------------------

<a name="users"></a>
### buildusers(connectionString)

The factory for the users module, you can just pass through a
[pg](http:/npm.im/pg) connection string.

Example:

```js
var connString = 'postgres://localhost/users_tests'
var users = require('@matteo.collina/users-pg')(connString)
```

-------------------------------------------------------

<a name="put"></a>
### users.put(object, callback(err, user))

Adds or updates an user. An user can have three properties:

1. the `'id'`, which needs to be set only for existing users
2. the `'username'`
3. the `'status'`, which can be any of
   `'wait'`, `'operational'` and `'error'`.

Validation is provided by [Joi](http://npm.im/joi), and a Joi error
object will be provided in case of validation errors.

The returned user includes the `id`, if missing.

-------------------------------------------------------

<a name="get"></a>
### users.get(id, callback(err, user))

Fetches an users, returns a
[`boom.notFound`](https://www.npmjs.com/package/boom#boom-notfound-message-data)
if not present.

-------------------------------------------------------

<a name="authenticate"></a>
### users.authenticate(user, callback(err, result, user))

Fetches a user, hashes the password with the stored salt and matches it
against the database. `result` is `true` if the match is successful,
`false` otherwise.
Returns [`boom.notFound`](https://www.npmjs.com/package/boom#boom-notfound-message-data)
if not present.

-------------------------------------------------------

<a name="createSchema"></a>
### users.createSchema(callback(err))

Create the schema in PostgreSQL for this module.

-------------------------------------------------------

<a name="dropSchema"></a>
### users.dropSchema(callback(err))

Drop the schema in PostgreSQL for this module.

## License

MIT
