const express = require('express');
const http = require('http');
const path = require('path');
const registerHelpers = require('./utils/registerHelpers');
const { Server } = require('socket.io');
const hbs = require('hbs');
const hbsutils = require('hbs-utils')(hbs);
const expressSession = require('express-session');
const SessionStore = require('connect-session-knex')(expressSession);
const con = require('./utils/connection');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 80;

const viewsPath = path.join(__dirname, './templates/views');
const partialsPath = path.join(__dirname, './templates/partials');
const publicPath = path.join(__dirname, './public');

app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbsutils.registerPartials(partialsPath, { precompile: true });
app.use(express.static(publicPath));
app.use(expressSession({
    secret: process.env.EXPRESS_SESSION_SECRET || 'unkown',
    cookie: {
        sameSite: 'strict',
        maxAge: 86400000,
    },
    resave: true,
    saveUninitialized: false,
    store: new SessionStore({
        tablename: 'player_session',
        knex: con,
    }),
}));

registerHelpers();

module.exports.io = io;

//Routes
const login = require('./routes/login');
const register = require('./routes/register');
const sheet = require('./routes/sheet');
const dice = require('./routes/dice');
const avatar = require('./routes/avatar');
const portrait = require('./routes/portrait');
//End Routes

app.get('/', (req, res) => {
    res.render('home');
});

app.use('/register', register);
app.use('/login', login);
app.use('/sheet', sheet);
app.use('/dice', dice);
app.use('/avatar', avatar);
app.use('/portrait', portrait);

app.get('*', (req, res) => {
    res.status(404).end();
});

module.exports.start = () => {
    server.listen(port, () => {
        console.log(`Listening to port ${port}...`);
    });
};
