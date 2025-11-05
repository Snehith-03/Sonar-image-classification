const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const EC = require('elliptic').ec;
const BN = require('bn.js');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const sharp = require('sharp');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { FormData, Blob } = globalThis;const jwt = require('jsonwebtoken');
require('dotenv').config();



const JWT_SECRET = process.env.JWT_SECRET
const app = express();
const upload = multer();
const ec = new EC('secp256k1');

const uri = process.env.MONGO_URL
const client = new MongoClient(uri);

let usersCollection, imageCollection;
const challenges = new Map(); 


//cleans up challenge and user data of users within 1 minute from inmemory.
setInterval(() => {
  const now = Date.now();
  for (const [username, data] of challenges.entries()) {
      if (data.expiresAt < now)
        challenges.delete(username);
  }
}, 60 * 1000);


//TO-DO: change this to ngrok link
const COLAB_API = process.env.COLAB_URL

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true

}));

app.use(bodyParser.json());

async function initDB() {
  await client.connect();
  const db = client.db("sonarDB");
  usersCollection = db.collection("login_info");
  imageCollection = db.collection("images");
  console.log("Connected to MongoDB!");

}

app.post('/login/challenge', async (req, res) => {
  try {
    const { username, R } = req.body;
    if (!username || !R)
      return res.status(400).json({ error: 'Missing username or R' });

    const user = await usersCollection.findOne({ username });
    if (!user)
      return res.status(400).json({ error: 'No such user' });

    ec.keyFromPublic(R, 'hex').getPublic(); 

    const c = new BN(crypto.randomBytes(32)).toString('hex');
    challenges.set(username, { R, c, expiresAt: Date.now() + 60000 }); 
    res.json({ c });

  } catch (err) {
    res.status(500).json({ error: 'Challenge generation failed' });
  }

});


app.post('/login/verify', async (req, res) => {
  try {
    const { username, s } = req.body;
    if (!username || !s)
      return res.status(400).json({ error: 'Missing username or s' });

    const user = await usersCollection.findOne({ username });
    if (!user)
      return res.status(400).json({ error: 'No such user' });

    const secret = challenges.get(username);
    if (!secret)
      return res.status(400).json({ error: 'Challenge expired or not found' });

    challenges.delete(username);

    const R = ec.keyFromPublic(secret.R, 'hex').getPublic();
    const pub = ec.keyFromPublic(user.pub, 'hex').getPublic();
    const c = new BN(secret.c, 16);
    const sBN = new BN(s, 16);

    const sG = ec.g.mul(sBN);
    const cY = pub.mul(c);
    const v = sG.add(cY.neg());

    const valid = v.eq(R);

    if (!valid) {
      return res.status(401).json({ error: 'Login failed' });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '2h' });

    res.json({
      status: 'Login successful',
      token
    });

  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }

});

app.get('/verify-token', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token)
    return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await usersCollection.findOne({ username: decoded.username });
    if (!user)
      return res.status(400).json({ error: 'User not found' });

    res.json({ valid: true, username: decoded.username });

  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }

});

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file)
        return res.status(400).json({ error: "No file uploaded" });

    const buffer = await sharp(req.file.buffer).resize(224, 224).toBuffer();
    const name = req.body.name?.split('.')[0] || `img_${Date.now()}`;

    const existingImage = await imageCollection.findOne({ name });
    if (existingImage) {
      await imageCollection.updateOne(
        { name },
        { $set: { data: buffer, mimetype: req.file.mimetype, uploadedAt: new Date() } }
      );
    }
    else {
      await imageCollection.insertOne({
        name,
        data: buffer,
        mimetype: req.file.mimetype,
        uploadedAt: new Date()
      });
    }

    const { FormData, Blob } = globalThis; 
    const formData = new FormData();
    formData.append("file", new Blob([buffer], { type: req.file.mimetype }), `${name}.jpg`);

    const response = await fetch(COLAB_API, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Colab API error: ${errText}`);
    }

    const prediction = await response.json();

    res.json({
      message: `Image '${name}' processed successfully!`,
      model_prediction: prediction
    });

  } catch (err){

    res.status(500).json({ error: "Error uploading or predicting image" });
  }

});

initDB().then(() => {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

}).catch(err => {
  console.error('DB init error:', err);
  process.exit(1);
});
