const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const EC = require('elliptic').ec;
const BN = require('bn.js');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const sharp = require('sharp');  
const multer = require('multer');
const redis = require('redis');

const app = express(); 
const upload = multer(); 

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
const ec = new EC('secp256k1');

const REDIS_TTL = 60; 

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

let usersCollection, imageCollection, redisClient;

async function initDB() {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on('error', (err) => {
      console.log("Redis connection error:", err);
    });

    await redisClient.connect();
    console.log("Successfully connected to Redis!");

    await client.connect();
    const db = client.db("sonarDB");
    usersCollection = db.collection("login_info");
    imageCollection = db.collection("images");

    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Database initialization error:", error);
    process.exit(1);
  }
}

app.get('/', (req, res) => {
  res.json({ 
    message: 'SONAR AI Backend API',
    endpoints: {
      auth: ['/register', '/login/challenge', '/login/verify'],
      images: ['/upload', '/image/:name']
    }
  });
});

app.post('/register', async (req, res) => {
  try {
    const { username, pubKey } = req.body;
    
    if (!username || !pubKey) {
      return res.status(400).json({ error: 'Username and public key required' });
    }

    const existingUser = await usersCollection.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ error: 'User exists' });
    }
  
    await usersCollection.insertOne({ 
      username, 
      pub: pubKey,
      createdAt: new Date()
    });
    
    res.json({ status: 'Registered' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login challenge endpoint
app.post('/login/challenge', async (req, res) => {
  try {
    const { username, R } = req.body;
    
    if (!username || !R) {
      return res.status(400).json({ error: 'Missing username or R' });
    }

    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'No such user' });
    }

    try {
      ec.keyFromPublic(R, 'hex').getPublic();
    } catch (e) {
      return res.status(400).json({ error: 'Invalid R point' });
    }

    const c = new BN(crypto.randomBytes(32));
    const secret = { R, c: c.toString('hex') };

    await redisClient.setEx(`challenge:${username}`, REDIS_TTL, JSON.stringify(secret));

    res.json({ c: secret.c });
  } catch (error) {
    console.error('Challenge error:', error);
    res.status(500).json({ error: 'Challenge generation failed' });
  }
});

// Login verification endpoint
app.post('/login/verify', async (req, res) => {
  try {
    const { username, s } = req.body;
    
    if (!username || !s) {
      return res.status(400).json({ error: 'Missing username or s' });
    }

    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'No such user' });
    }

    const secretJSON = await redisClient.get(`challenge:${username}`);
    if (!secretJSON) {
      return res.status(400).json({ error: 'Challenge expired or not found' });
    }

    const secret = JSON.parse(secretJSON);
    await redisClient.del(`challenge:${username}`); 

    try {
      const R = ec.keyFromPublic(secret.R, 'hex').getPublic();
      const pub = ec.keyFromPublic(user.pub, 'hex').getPublic();
      const c = new BN(secret.c, 16);
      const sBN = new BN(s, 16);

      const sG = ec.g.mul(sBN);
      const cY = pub.mul(c);
      const v = sG.add(cY.neg());

      const valid = v.eq(R);
      res.json({ status: valid ? 'Login successful' : 'Login failed' });
    } catch (e) {
      res.status(500).json({ error: 'Verification error: ' + e.message });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Image upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!imageCollection) {
      throw new Error("DB not initialized");
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Resize image to 224x224 for model input
    const buffer = await sharp(req.file.buffer)
      .resize(224, 224)
      .toBuffer();

    const name = req.body.name.split('.')[0];

    // Check if image already exists
    const existingImage = await imageCollection.findOne({ name });
    if (existingImage) {
      // Update existing image
      await imageCollection.updateOne(
        { name },
        { 
          $set: {
            data: buffer,          
            mimetype: req.file.mimetype,
            uploadedAt: new Date()
          }
        }
      );
      return res.json({ message: `Image '${name}' updated successfully!` });
    }

    // Insert new image
    await imageCollection.insertOne({
      name,
      data: buffer,          
      mimetype: req.file.mimetype,
      uploadedAt: new Date()
    });

    res.json({ message: `Image '${name}' uploaded successfully!` });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: "Error uploading image" });
  }
});

// Image retrieval endpoint
app.get("/image/:name", async (req, res) => {
  if (!imageCollection) {
    return res.status(500).json({ error: "DB not initialized" });
  }

  try {
    const rawName = req.params.name?.trim();
    if (!rawName) {
      return res.status(400).json({ error: "Image name is required" });
    }

    const name = rawName.split('.')[0];
    const imgDoc = await imageCollection.findOne({ name });

    if (!imgDoc) {
      return res.status(404).json({ error: "Image not found" });
    }

    const imgData = imgDoc.data.buffer ? Buffer.from(imgDoc.data.buffer) : Buffer.from(imgDoc.data);
    if (!imgData) {
      return res.status(500).json({ error: "Invalid image data" });
    }

    const ext = imgDoc.mimetype.split('/')[1];

    res.writeHead(200, {
      'Content-Type': imgDoc.mimetype,
      'Content-Disposition': `inline; filename="${name}.${ext}"`,
      'Content-Length': imgData.length,
      'Cache-Control': 'public, max-age=3600'
    });

    res.end(imgData);
  } catch (err) {
    console.error('Image fetch error:', err);
    res.status(500).json({ error: "Error fetching image" });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const mongoStatus = client.topology?.isConnected() ? 'connected' : 'disconnected';
    const redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';
    
    res.json({
      status: 'ok',
      mongodb: mongoStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  try {
    await client.close();
    await redisClient.quit();
    console.log('Connections closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

initDB().then(() => {
const PORT = process.env.PORT || 3001; // Changed port to 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
    console.log('Endpoints available:');
    console.log('  - POST /register');
    console.log('  - POST /login/challenge');
    console.log('  - POST /login/verify');
    console.log('  - POST /upload');
    console.log('  - GET  /image/:name');
    console.log('  - GET  /health');
  });

// Serve React build in production
const path = require('path');
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'build');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
