'use strict'
var debug = require('debug')('hash-stream-validation')

var crc
try {
  crc = require('fast-crc32c')
  debug('Using fast-crc32c')
} catch (e) {
  crc = require('./crc32c.js')
  debug('Using ./crc32c.js')
}

var crypto = require('crypto')
var through = require('through2')

module.exports = function (cfg) {
  cfg = cfg || {}

  var crc32c = cfg.crc32c !== false
  var md5 = cfg.md5 !== false

  debug('Config:', { crc32c, md5 })

  var hashes = {}
  if (md5) hashes.md5 = crypto.createHash('md5')

  var onData = function (chunk, enc, done) {
    if (crc32c) hashes.crc32c = crc.calculate(chunk, hashes.crc32c)
    if (md5) hashes.md5.update(chunk)

    done(null, chunk)
  }

  var onFlush = function (done) {
    if (crc32c) hashes.crc32c = new Buffer([hashes.crc32c]).toString('base64')
    if (md5) hashes.md5 = hashes.md5.digest('base64')

    done()
  }

  var validationStream = through(onData, onFlush)

  validationStream.test = function (algo, sum) {
    debug(`Testing ${algo} - actual: ${hashes[algo]}, expected: ${sum} [${hashes[algo] === sum}]`)
    return hashes[algo] === sum
  }

  return validationStream
}
