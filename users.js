'use strict'

var fs = require('fs')
var path = require('path')
var WithConn = require('with-conn-pg')
var Ajv = require('ajv')
var createError = require('http-errors')
var pbkdf2 = require('pbkdf2-password')
var createTable = readQuery('create.sql')
var dropTable = readQuery('drop.sql')
var insertUser = readQuery('insert.sql')
var updateUser = readQuery('update.sql')
var getById = readQuery('get_by_id.sql')
var getByUsername = readQuery('get_by_username.sql')
var ajv = new Ajv()

var schema = {
  type: 'object',
  properties: {
    id: {
      type: 'number'
    },
    username: {
      type: 'string',
      minLength: 1
    },
    password: {
      type: 'string',
      pattern: '[a-zA-Z0-9]+',
      minLength: 3,
      maxLength: 30
    }
  }
}
var validateSchema = ajv.compile(schema)

function readQuery (file) {
  return fs.readFileSync(path.join(__dirname, 'sql', file), 'utf8')
}

function users (connString) {
  var passHasher = pbkdf2()
  var withConn = WithConn(connString)

  return {
    jsonSchema: schema,
    createSchema: withConn(createSchema),
    dropSchema: withConn(dropSchema),
    put: withConn([
      validate,
      genPass,
      execPut,
      returnFirst
    ]),
    getById: withConn([
      execGetById,
      returnFirst
    ]),
    getByUsername: withConn([
      execGetByUsername,
      returnFirst
    ]),
    authenticate: withConn([
      queryForHash,
      returnFirst,
      matchHash
    ]),
    end: withConn.end.bind(withConn)
  }

  function createSchema (conn, callback) {
    conn.query(createTable, callback)
  }

  function dropSchema (conn, callback) {
    conn.query(dropTable, callback)
  }

  function validate (conn, user, callback) {
    var valid = validateSchema(user)

    if (!valid) {
      var err = new createError.UnprocessableEntity()
      err.details = validateSchema.errors
      return callback(err)
    }

    callback(null, conn, user)
  }

  function genPass (conn, user, callback) {
    passHasher(user, function (err, pass, salt, hash) {
      if (err) {
        return callback(err)
      }

      callback(null, conn, {
        id: user.id,
        username: user.username,
        password: pass,
        salt: salt,
        hash: hash
      })
    })
  }

  function execPut (conn, user, callback) {
    var toExec = user.id ? updateUser : insertUser
    var args = [
      user.username,
      user.hash,
      user.salt
    ]

    if (user.id) {
      args.unshift(user.id)
    }

    conn.query(toExec, args, function (err, result) {
      callback(err, result, user)
    })
  }

  function returnFirst (result, user, callback) {
    var err = null

    if (typeof user === 'function') {
      callback = user
      user = null
    }

    if (result.rows.length === 0) {
      err = new createError.NotFound()
      err.notFound = true
    }

    if (user) {
      result.rows[0].password = user.password
    }

    callback(err, result.rows[0])
  }

  function execGetById (conn, id, callback) {
    conn.query(getById, [id], callback)
  }

  function execGetByUsername (conn, username, callback) {
    conn.query(getByUsername, [username], callback)
  }

  function matchHash (user, callback) {
    passHasher(user, function (err, pass, salt, hash) {
      if (user.hash === hash) {
        callback(err, true, user)
      } else {
        callback(err, false, user)
      }
    })
  }

  function queryForHash (conn, user, callback) {
    conn.query(getByUsername, [user.username], function (err, result) {
      callback(err, result, user)
    })
  }
}

module.exports = users
