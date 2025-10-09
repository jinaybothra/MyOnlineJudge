require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Problem = require('./models/Problem');
const User = require('./models/User');

const app = express();
app.use(express.urlencoded({extended: true}))
app.use(express.json())

// CORS for local dev (adjust in production)
const cors = require('cors');
app.use(cors({ origin: true }));

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
    res.json({ problems });
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

  const token = jwt.sign({ id: user._id }, process.env.MONGO_URI, { expiresIn: '1h' });
  res.json({ token, user: { id: user._id, email, username } });
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  console.log(req);
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const isMatch = password === user.password;
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id }, process.env.MONGO_URI, { expiresIn: '1h' });
  res.json({ token, user: { id: user._id, email: user.email, username: user.username } });
  console.log(res);
});


/**
 * POST /api/run
 * Run code (demo). THIS IS A MOCK runner for safety.
 * In production, implement this by executing code inside a secure, isolated sandbox (docker container, gVisor, Firecracker VMs).
 */
app.post('/api/run', async (req, res) => {
  try {
    const { code, language, stdin } = req.body;

    // ---------- MOCKED EXECUTION (safe demo) ----------
    // Return a mocked result (useful for UI dev). Replace this with a sandboxed runner.
    return res.json({
      output: `<<MOCK RUN>>\nLanguage: ${language}\nStdIn:\n${stdin || '<empty>'}\n\nProgram Output:\n[This is mocked output — implement a secure runner to execute real code]`
    });
    // --------------------------------------------------

    // ***** Example insecure local execution (DO NOT USE IN PROD) *****
    // If you want a quick local test (only run on your machine with trusted code), you could spawn a child_process.
    // WARNING: This is UNSAFE for untrusted code. DO NOT expose to public.
    //
    // const { exec } = require('child_process');
    // // write code to temp file depending on language, then run node/python/g++ etc.
    // exec('node /tmp/code.js', { timeout: 2000 }, (err, stdout, stderr) => {
    //   if (err) return res.json({ output: stderr || err.message });
    //   res.json({ output: stdout });
    // });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
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