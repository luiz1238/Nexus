const home = require('./login');
const register = require('./register');
const sheet = require('./sheet');
const dice = require('./dice');
const avatar = require('./avatar');
const portrait = require('./portrait');

module.exports = [
    { url: '/', ref: login },
    { url: '/register', ref: register },
    { url: '/sheet', ref: sheet },
    { url: '/dice', ref: dice },
    { url: '/avatar', ref: avatar },
    { url: '/portrait', ref: portrait },
]
