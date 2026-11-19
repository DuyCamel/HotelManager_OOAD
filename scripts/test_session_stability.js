const http = require('node:http');
const express = require('express');
const session = require('express-session');

const app = express();
app.use(express.json());
app.use(
  session({
    name: 'hotel.sid',
    secret: 'test-secret-long-enough-for-testing-1234567890',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 365 * 24 * 3600000,
    },
  })
);

app.post('/login', (req, res) => {
  req.session.user = { id: 'U1', role: 'MANAGER' };
  res.json({ sessionID: req.sessionID });
});

app.post('/challenge', (req, res) => {
  res.json({ sessionID: req.sessionID, user: req.session.user });
});

app.post('/transfer', (req, res) => {
  res.json({ sessionID: req.sessionID, user: req.session.user });
});

const server = app.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log('Test server on', port);
  server.close();
});
