'use strict'

var should = require('chai').should(),
    expect = require('chai').expect,
    supertest = require('supertest')

const assert = require("assert")
const cli = require('heroku-cli-util')
const nock = require('nock')
const unexpected = require('unexpected')

describe('test responseBuilder()', function () {


    it('for introResponse() : empty term', function () {

    })

    it('for introResponse() : keyword not first word', function() {

    })

    it('for aboutResponse() : "about" is first word of term', function() {

    })

    it('for searchResponse() : "search" is first word of term, no result', function() {

    })

    it('for searchResponse() : "search" is first word of term, 1 to 6 results', function() {

    })

    it('for searchResponse() : "search" is first word of term, 7 results', function() {

    })
})

describe('other responses', function() {


    it('textResponse()', function () {

    })

    it('audioAttachmentResponse', function () {

    })
})