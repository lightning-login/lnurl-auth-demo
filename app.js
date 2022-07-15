const express = require('express');
const LnurlAuth = require('passport-lnurl-auth');
const passport = require('passport');
const session = require('express-session');
const favicon = require('serve-favicon')
const path = require('path')

const app = express();

const config = {
	host: process.env.HOST || 'localhost',
	port: process.env.PORT || 3000,
	url: null,
};

if (!config.url) {
	config.url = 'http://' + config.host + ':' + config.port;
}

app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public/img', 'favicon.ico')))
app.use(session({
	secret: '12345',
	resave: false,
	saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/static', express.static(path.join(__dirname, 'public')))

const map = {
	user: new Map(),
};

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	done(null, map.user.get(id) || null);
});

passport.use(new LnurlAuth.Strategy(function(linkingPublicKey, done) {
	let user = map.user.get(linkingPublicKey);
	if (!user) {
		user = { id: linkingPublicKey };
		map.user.set(linkingPublicKey, user);
	}
	done(null, user);
}));

app.use(passport.authenticate('lnurl-auth'));

app.get('/', function(req, res) {
	if (!req.user) {
		return res.render('index', { title: 'Login with Lightning!' })
	}
	console.log(req.user)
	res.render('authenticated', { title: 'Logged in', userid: req.user.id })
});

app.get('/login',
	function(req, res, next) {
		if (req.user) {
			// Already authenticated.
			return res.redirect('/');
		}
		next();
	},
	new LnurlAuth.Middleware({
		callbackUrl: 'https://lightninglogin.live/login',
		cancelUrl: 'https://lightninglogin.live/',
		loginTemplateFilePath: path.join(__dirname, 'views', 'login.html'),
	})
);

app.get('/logout',
	function(req, res, next) {
		if (req.user) {
			// Already authenticated.
			req.session.destroy();
			return res.redirect('/');
		}
		next();
	}
);

app.get('/learn',
	function(req, res, next) {
		res.render('learn')
	}
);

const server = app.listen(config.port, function() {
	console.log('Server listening at ' + config.url);
});

process.on('uncaughtException', error => {
	console.error(error);
});

process.on('beforeExit', code => {
	try {
		server.close();
	} catch (error) {
		console.error(error);
	}
	process.exit(code);
});
