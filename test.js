'use strict'

var tap = require('tap')
var test = tap.test
var tearDown = tap.tearDown
var build = require('./')
var securePassword = require('secure-password')

var connString = 'postgres://localhost/users_tests'
var withConn = require('with-conn-pg')(connString)
var schemaQuery = 'select column_name, data_type, character_maximum_length from INFORMATION_SCHEMA.COLUMNS where table_name = \'users\' ORDER BY column_name'
var users

tearDown(function () {
  users.end()
})

test('create schema', function (t) {
  users = build(connString)
  users.dropSchema(function () {
    users.createSchema(function (err) {
      t.error(err, 'no error')
      withConn(function (conn, done) {
        t.error(err, 'no error')

        conn.query(schemaQuery, function (err, result) {
          t.error(err, 'no error')
          t.equal(result.rows.length, 3, 'has 4 columns')
          t.equal(result.rows[0].column_name, 'hash', 'has an hash')
          t.equal(result.rows[1].column_name, 'id', 'has an id')
          t.equal(result.rows[2].column_name, 'username', 'has a name')
          done()
        })
      })(function (err) {
        t.error(err, 'no error')
        withConn.end()
        t.end()
      })
    })
  })
})

test('can insert users', function (t) {
  var expected = {
    username: 'myusername',
    password: 'wait'
  }
  users.put(expected, function (err, result) {
    t.error(err, 'no error')
    t.ok(result.id, 'it has an id')
    t.equal(result.username, expected.username, 'it has a username')
    t.equal(result.password, expected.password, 'it has a password')
    t.ok(result.hash, 'it has an hash')

    var pwd = securePassword()
    pwd.verify(Buffer.from(expected.password), Buffer.from(result.hash, 'base64'), function (err, result) {
      t.error(err, 'no error')
      t.equal(result, securePassword.VALID, 'hash matches')
      t.end()
    })
  })
})

test('can update users', function (t) {
  var toWrite = {
    username: 'myuser',
    password: 'apassword'
  }
  users.put(toWrite, function (err, result) {
    t.error(err, 'no error')
    users.put({
      id: result.id,
      username: toWrite.username,
      password: 'another long password'
    }, function (err, result2) {
      t.error(err, 'no error')
      t.notEqual(result2.hash, result.hash, 'hash does not match')
      t.equal(result2.id, result.id, 'id matches')
      t.equal(result2.username, toWrite.username, 'username matches')
      t.end()
    })
  })
})

test('can get users by id', function (t) {
  var toWrite = {
    username: 'myusername2',
    password: 'mypass'
  }
  users.put(toWrite, function (err, expected) {
    t.error(err, 'no error')
    delete expected.password
    users.getById(expected.id, function (err, result) {
      t.error(err, 'no error')
      t.deepEqual(result, expected, 'matches')
      t.end()
    })
  })
})

test('can get users by username', function (t) {
  var toWrite = {
    username: 'myusername3',
    password: 'mypass'
  }
  users.put(toWrite, function (err, expected) {
    t.error(err, 'no error')
    delete expected.password
    users.getByUsername(expected.username, function (err, result) {
      t.error(err, 'no error')
      t.deepEqual(result, expected, 'matches')
      t.end()
    })
  })
})

test('cannot insert an user without a username', function (t) {
  var expected = {
    username: '',
    password: 'mypass'
  }
  users.put(expected, function (err, result) {
    t.ok(err, 'insert errors')
    t.equal(err.name, 'UnprocessableEntityError', 'error type matches')
    t.equal(err.details[0].dataPath, '.username', 'validation data path matches')
    t.equal(err.details[0].message, 'should NOT be shorter than 1 characters', 'validation error matches')
    t.end()
  })
})

test('can authenticate successfully users', function (t) {
  var toWrite = {
    username: 'myusername4',
    password: 'mypass'
  }
  users.put(toWrite, function (err, expected) {
    t.error(err, 'no error')
    delete expected.password
    users.authenticate({
      username: 'myusername4',
      password: 'mypass'
    }, function (err, result) {
      t.error(err, 'no error')
      t.equal(result, true, 'matches')
      t.end()
    })
  })
})

test('can authenticate unsuccessfully users', function (t) {
  var toWrite = {
    username: 'myusername5',
    password: 'mypass'
  }
  users.put(toWrite, function (err, expected) {
    t.error(err, 'no error')
    delete expected.password
    users.authenticate({
      username: 'myusername5',
      password: 'another pass'
    }, function (err, result) {
      t.error(err, 'no error')
      t.equal(result, false, 'matches')
      t.end()
    })
  })
})

test('getting an non-existing user', function (t) {
  users.getById(42, function (err, result) {
    t.ok(err, 'errors')
    t.notOk(result, 'no result')
    t.equal(err.status, 404, 'status code matches')
    t.equal(err.notFound, true, 'notFound property matches')
    t.end()
  })
})
