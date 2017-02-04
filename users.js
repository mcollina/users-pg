'use strict'

var fs = require('fs')
var path = require('path')
var WithConn = require('with-conn-pg')
var Joi = require('joi')
var boom = require('boom')
var pbkdf2 = require('pbkdf2-password')
var createTable = readQuery('create.sql')
var dropTable = readQuery('drop.sql')
var insertUser = readQuery('insert.sql')
var updateUser = readQuery('update.sql')
var getById = readQuery('get_by_id.sql')
var getByUsername = readQuery('get_by_username.sql')

var schema = {
  id: Joi.number().positive(),
  username: Joi.string().required(),
  password: Joi.string().regex(/[a-zA-Z0-9]{3,30}/)
}

function readQuery (file) {
  return fs.readFileSync(path.join(__dirname, 'sql', file), 'utf8')
}

function users (connString) {
  var passHasher = pbkdf2()
  var withConn = WithConn(connString)

  return {
    joiSchema: schema,
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
    var valResult = Joi.validate(user, schema)

    if (valResult.error) {
      return callback(valResult.error)
    }

    callback(null, conn, valResult.value)
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
      err = boom.notFound('user not found')

      // connect compatibility
      err.notFound = true
      err.status = 404
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
