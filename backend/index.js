require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

const Problem = require('./models/Problem');
const User = require('./models/User');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.urlencoded({extended: true}))
app.use(express.json())

const MONGO = process.env.MONGO_URI;
const PORT = process.env.PORT

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

async function runCode(language, code, testCases) {
  const tmpDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
  const timestamp = Date.now();
  let srcFile, compileCmd;

  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
      srcFile = path.join(tmpDir, `main_${timestamp}.js`);
      fs.writeFileSync(srcFile, code);
      compileCmd = (input) => `node ${srcFile}`;
      break;
    case 'python':
    case 'py':
      srcFile = path.join(tmpDir, `main_${timestamp}.py`);
      fs.writeFileSync(srcFile, code);
      compileCmd = (input) => `python3 ${srcFile}`;
      break;
    case 'cpp':
    case 'c++':
      srcFile = path.join(tmpDir, `main_${timestamp}.cpp`);
      fs.writeFileSync(srcFile, code);
      compileCmd = (input) => `g++ ${srcFile} -o ${tmpDir}/a_${timestamp}.out && ${tmpDir}/a_${timestamp}.out`;
      break;
    case 'java':
      srcFile = path.join(tmpDir, `Main_${timestamp}.java`);
      fs.writeFileSync(srcFile, code);
      compileCmd = (input) => `javac ${srcFile} && java -cp ${tmpDir} Main_${timestamp}`;
      break;
    default:
      throw new Error('Unsupported language');
  }

  const results = [];

  for (let tc of testCases) {
    const result = await new Promise((resolve) => {
      const proc = exec(compileCmd(tc.input), { timeout: 5000 }, (err, stdout, stderr) => {
        resolve({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          output: stdout.trim(),
          error: err ? stderr || err.message : null,
          passed: stdout.trim() === tc.expectedOutput.trim()
        });
      });
      if (tc.input) {
        proc.stdin.write(tc.input);
        proc.stdin.end();
      }
    });
    results.push(result);
  }
  return results;
}

function generateHiddenCases(testCases) {
  const hidden = [];
  for (let t of testCases) {
    // Try to vary numbers if any exist in input
    if (t.input.match(/\d+/)) {
      const nums = t.input.match(/\d+/g).map(Number);
      const modified = nums.map((n) => n + Math.floor(Math.random() * 3 + 1));
      let newInput = t.input;
      nums.forEach((n, i) => {
        newInput = newInput.replace(n, modified[i]);
      });
      hidden.push({ input: newInput, expectedOutput: t.expectedOutput });
    } else {
      // For string inputs, reverse or shuffle
      const words = t.input.trim().split(/\s+/);
      const reversed = words.reverse().join(" ");
      hidden.push({ input: reversed, expectedOutput: t.expectedOutput });
    }
  }
  return hidden;
}

app.post('/run', async (req, res) => {
  const { language, code, testCases } = req.body;
  if (!language || !code || !Array.isArray(testCases)) return res.status(400).json({ error: 'Missing language, code or testCases array' });

  try {
    const results = await runCode(language, code, testCases);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/submit
 * Evaluate code against problem.testcases.
 */
app.post('/api/submit', async (req, res) => {
  const { problemId, code, language } = req.body;
  try {
    const problem = await Problem.findOne({ id: problemId });
    if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });

    let hiddenCases = problem.hiddenTestcases;
    if (!hiddenCases || hiddenCases.length === 0) {
      hiddenCases = TestCaseGenerator.generate(problem);
      problem.testcases = hiddenCases;
      await problem.save();
    }

    const tmpDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const results = [];
    for (const test of hiddenCases) {
      const inputFile = path.join('/tmp', `input_${Date.now()}.txt`);
      const codeFile = path.join('/tmp', `code_${Date.now()}`);
      fs.writeFileSync(inputFile, test.in);

      let command = '';
      if (language === 'cpp') {
        fs.writeFileSync(`${codeFile}.cpp`, code);
        command = `g++ ${codeFile}.cpp -o ${codeFile} && ${codeFile} < ${inputFile}`;
      } else if (language === 'java') {
        fs.writeFileSync(`${codeFile}.java`, code);
        command = `javac ${codeFile}.java && java -cp /tmp $(basename ${codeFile}) < ${inputFile}`;
      } else if (language === 'python') {
        fs.writeFileSync(`${codeFile}.py`, code);
        command = `python3 ${codeFile}.py < ${inputFile}`;
      } else if (language === 'javascript') {
        fs.writeFileSync(`${codeFile}.js`, code);
        command = `node ${codeFile}.js < ${inputFile}`;
      }

      const output = await new Promise(resolve => {
        exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
          if (error || stderr) {
            resolve({ output: stderr || error.message, error: true });
          } else {
            resolve({ output: stdout.trim(), error: false });
          }
        });
      });

      const passed = !output.error && output.output === test.out.trim();
      results.push({ input: test.in, output: output.output, expectedOutput: test.out, passed });
    }

    const allPassed = results.every(r => r.passed);
    res.json({ success: true, message: allPassed ? '🎉 All test cases passed!' : '❌ Some test cases failed', results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});