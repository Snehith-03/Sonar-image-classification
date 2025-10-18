const express = require('express');
const bodyParser = require('body-parser');
const EC = require('elliptic').ec;
const BN = require('bn.js');
const { MongoClient } = require('mongodb');

const app = express();
app.use(bodyParser.json());

const ec = new EC('secp256k1');

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
let usersCollection;

async function initDB() {

  await client.connect();
  const db = client.db("sonarDB");
  usersCollection = db.collection("login_info");

}

const secrets = {};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/client.html');

});

app.post('/register', async (req, res) => {
  const { username, pubKey } = req.body;
  const existingUser = await usersCollection.findOne({ username });

  if (existingUser) {
    return res.json({ error: 'User exists' });
  }

  await usersCollection.insertOne({ username, pub: pubKey });
  res.json({ status: 'Registered' });
});


app.post('/login/challenge', async (req, res) => {
  const { username, R } = req.body;
  const user = await usersCollection.findOne({ username });

  if (!user) {
    return res.status(400).json({ error: 'No such user' });
  }

  const c = new BN(crypto.randomBytes(32)); 
  secrets[username] = { R, c };
  res.json({ c });
});

app.post('/login/verify', async (req, res) => {
  const { username, s } = req.body;
  const user = await usersCollection.findOne({ username });
  const secret = secrets[username];

  if (!user || !secret) {
    return res.status(400).json({ error: 'Login attempt not found' });
  }

  try {
    const R = ec.keyFromPublic(secret.R, 'hex').getPublic();
    const pub = ec.keyFromPublic(user.pub, 'hex').getPublic();
    const c = new BN(secret.c, 16);

    const sG = ec.g.mul(new BN(s, 16));
    const cY = pub.mul(c);
    const v = sG.add(cY.neg());

    const valid = v.eq(R);
    delete secrets[username];

    if (valid) {
      res.json({ status: 'Login successful' });
    } else {
      res.json({ status: 'Login failed' });
    }
  } catch(e) {
    console.error('Verification error:', e);
    res.status(500).json({ error: 'Verification error: ' + e.message });
  }
});


initDB().then(() => {
  app.listen(3000, () => console.log('Server running on http://localhost:3000'));
}).catch(console.error);
