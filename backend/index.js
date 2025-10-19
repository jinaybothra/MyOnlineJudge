require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const os = require('os');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

const Problem = require('./models/Problem');
const User = require('./models/User');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.urlencoded({extended: true}))
app.use(express.json())

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/codearena';
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mongo connected'))
  .catch((e) => console.error('Mongo connection error', e));

/**
 * GET /api/problems
 * returns list of problems
 */
app.get('/api/problems', async (req, res) => {
  try {
    const problems = await Problem.find().select('-testcases -__v'); // hide testcases for normal list
    res.json( problems );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/problems/:id
 * returns full problem (including examples). include testcases only if admin.
 */
app.get('/api/problems/:id', async (req, res) => {
  try {
    const p = await Problem.findOne({ id: req.params.id }).lean();
    if (!p) return res.status(404).json({ error: 'not found' });
    // Do not return testcases to regular clients in production
    const hideTests = req.query.showTests !== 'true';
    if (hideTests) delete p.testcases;
    res.json({ problem: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

/**
 * GET /api/user/:id
 * returns user profile (for demo)
 */
app.get('/api/user/:id', async (req, res) => {
  try {
    const u = await User.findOne({ userId: req.params.id }).lean();
    if (!u) {
      // create demo user if not exists
      const newU = await User.create({
        userId: req.params.id,
        name: 'Demo User',
        solvedProblems: 0,
        streak: 0,
        ranking: 'N/A',
        languages: ['JavaScript', 'Python'],
        achievements: [],
        recentActivity: [],
        email: 'abc@abc.com',
        password: 'hjdkdfhskfhskfh'
      });
      return res.json(newU);
    }
    res.json(u);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Register endpoint
app.post('/auth/register', async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword, username });
  await user.save();

  const token = jwt.sign(
    { id: user._id }, 
    process.env.MONGO_URI, 
    { expiresIn: '1h' }
  );

  const cookieOption = {
    expires: new Date(Date.now() + 24*60*60*1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
}
  const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
  }
  res.status(201).json({
      success: true,
      message: "Registration is successfull",
      user: userResponse,
      token: token
  })
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  console.log(req);
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const isMatch = bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id }, process.env.MONGO_URI, { expiresIn: '1h' });
  res.json({ token, user: { id: user._id, email: user.email, username: user.username } });
  console.log(res);
});

app.use(bodyParser.json({ limit: '1mb' }));

app.post('/run', async (req, res) => {
  const { language, code, stdin = '' } = req.body;
  if (!language || !code) return res.status(400).json({ error: 'Missing language or code' });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-'));
  let srcFile, cmd;

  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
      srcFile = path.join(tmpDir, 'main.js');
      fs.writeFileSync(srcFile, code);
      cmd = `node ${srcFile}`;
      break;
    case 'python':
    case 'py':
      srcFile = path.join(tmpDir, 'main.py');
      fs.writeFileSync(srcFile, code);
      cmd = `python3 ${srcFile}`;
      break;
    case 'cpp':
    case 'c++':
      srcFile = path.join(tmpDir, 'main.cpp');
      fs.writeFileSync(srcFile, code);
      cmd = `g++ ${srcFile} -o ${tmpDir}/a.out && ${tmpDir}/a.out`;
      break;
    case 'java':
      srcFile = path.join(tmpDir, 'Main.java');
      fs.writeFileSync(srcFile, code);
      cmd = `javac ${srcFile} && java -cp ${tmpDir} Main`;
      break;
    default:
      return res.status(400).json({ error: 'Unsupported language' });
  }

  const process = exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
    if (error) {
      return res.json({ success: false, out: stdout, err: stderr || error.message });
    }
    res.json({ success: true, out: stdout, err: stderr });
  });

  if (stdin) {
    process.stdin.write(stdin);
    process.stdin.end();
  }
});

/**
 * POST /api/submit
 * Evaluate code against problem.testcases.
 * This implementation is demo-only: it mocks evaluation.
 * In real system:
 *  - execute each testcase inside sandbox
 *  - compare trimmed stdout to expected
 *  - record result and update user's profile/achievements in DB
 */
app.post('/api/submit', async (req, res) => {
  try {
    const { code, language, problemId, userId = '123' } = req.body;
    const problem = await Problem.findOne({ id: problemId });
    if (!problem) return res.status(404).json({ error: 'problem not found' });

    // ---------- MOCK EVALUATION ----------
    // Randomly pass/fail for demo
    const pass = Math.random() > 0.35;
    const result = pass ? 'All testcases passed ✅' : 'Failed on testcase 2 ❌';

    // Update user profile demo: increment solvedProblems when passed
    const user = await User.findOneAndUpdate(
      { userId },
      {
        $inc: pass ? { solvedProblems: 1 } : {},
        $push: { recentActivity: `${pass ? 'Solved' : 'Attempted'} "${problem.title}" (${new Date().toLocaleString()})` },
      },
      { new: true, upsert: true }
    );

    // Simple achievement logic (demo)
    const achievements = user.achievements || [];
    if (pass && user.solvedProblems + (pass ? 1 : 0) >= 10 && !achievements.includes('Problem Solver')) {
      achievements.push('Problem Solver');
    }
    // persist achievements
    user.achievements = achievements;
    await user.save();

    return res.json({ result, passed: pass, achievements });
    // ---------------------------------------
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});