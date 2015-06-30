'use strict'

var test = require('tape')
var build = require('./')
var withConn = require('with-conn-pg')
var pbkdf2 = require('pbkdf2-password')
var Joi = require('joi')

var connString = 'postgres://localhost/users_tests'
var schemaQuery = 'select column_name, data_type, character_maximum_length from INFORMATION_SCHEMA.COLUMNS where table_name = \'users\' ORDER BY column_name'
var users

test('create schema', function (t) {
  users = build(connString)
  users.dropSchema(function () {
    users.createSchema(function (err) {
      t.error(err, 'no error')
      withConn(connString, function (conn, done) {
        t.error(err, 'no error')

        conn.query(schemaQuery, function (err, result) {
          t.error(err, 'no error')
          t.equal(result.rows.length, 4, 'has 4 columns')
          t.equal(result.rows[0].column_name, 'hash', 'has an hash')
          t.equal(result.rows[1].column_name, 'id', 'has an id')
          t.equal(result.rows[2].column_name, 'salt', 'has a salt')
          t.equal(result.rows[3].column_name, 'username', 'has a name')
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
    t.ok(result.salt, 'it has a salt')
    t.ok(result.hash, 'it has an hash')

    pbkdf2()({
      password: expected.password,
      salt: result.salt
    }, function (err, pass, salt, hash) {
      t.equal(result.hash, hash, 'hash matches')

      withConn.end()
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
      withConn.end()
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
      withConn.end()
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
      withConn.end()
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
    t.equal(err.name, 'ValidationError', 'error type matches')
    t.equal(err.details[0].message, '"username" is not allowed to be empty', 'validation error matches')
    withConn.end()
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
      withConn.end()
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
      withConn.end()
      t.end()
    })
  })
})

test('getting an non-existing user', function (t) {
  users.getById(42, function (err, result) {
    t.ok(err, 'errors')
    t.notOk(result, 'no result')
    t.equal(err.output.statusCode, 404, 'status code matches')
    t.equal(err.status, 404, 'status code matches')
    t.equal(err.notFound, true, 'notFound property matches')
    withConn.end()
    t.end()
  })
})
