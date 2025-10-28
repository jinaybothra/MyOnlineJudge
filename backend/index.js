require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// AI Code Review endpoint
app.post('/api/ai-review', async (req, res) => {
  console.log('\n📨 AI Review request received');
  
  try {
    const { code, language, problem, userMessage, conversationHistory } = req.body;

    if (!code || !language || !userMessage) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API key not configured'
      });
    }

    // Get model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 1) {
      conversationContext = conversationHistory.slice(1).map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n\n');
    }

    const prompt = `You are an expert code reviewer and programming mentor.

${conversationContext ? 'Previous conversation:\n' + conversationContext + '\n\n' : ''}

**Problem Statement:**
${problem || 'No problem statement provided'}

**Programming Language:** ${language}

**Current Code:**
\`\`\`${language}
${code}
\`\`\`

**User Question:**
${userMessage}

Please provide helpful, constructive feedback using markdown formatting.`;

    console.log('🤖 Calling Gemini API...');

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();

    console.log('✅ Gemini response received');
    console.log('Response length:', aiResponse.length);

    res.json({
      success: true,
      response: aiResponse,
      model: 'gemini-pro'
    });

  } catch (error) {
    console.error('❌ AI Review error:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


/**
 * GET /api/problems
 * returns list of problems
 */
app.get('/api/problems', async (req, res) => {
  try {
    const problems = await Problem.find();
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

const TEMP_DIR = path.join(__dirname, 'temp');
const TIMEOUT = 5000; // 5 seconds timeout

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating temp directory:', err);
  }
}

ensureTempDir();

// Generate unique filename
function generateFilename(language) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extensions = {
    javascript: 'js',
    python: 'py',
    cpp: 'cpp',
    java: 'java'
  };
  return `code_${timestamp}_${random}.${extensions[language]}`;
}

// Execute code with timeout
function executeWithTimeout(command, timeout) {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        if (error.killed) {
          reject(new Error('Execution timeout exceeded'));
        } else {
          reject(new Error(stderr || error.message));
        }
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// Run code for specific language
async function runCode(language, code, testCases) {
  const tmpDir = path.join(__dirname, 'temp');
  
  if (!fsSync.existsSync(tmpDir)) {
    fsSync.mkdirSync(tmpDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  let srcFile, compileCmd;

  console.log('=== RUN CODE DEBUG ===');
  console.log('Language:', language);
  console.log('Test cases:', JSON.stringify(testCases, null, 2));

  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
      srcFile = path.join(tmpDir, `main_${timestamp}.js`);
      fsSync.writeFileSync(srcFile, code);
      // Execute: node "filename" "inputfile"
      compileCmd = (inputFile) => `node "${srcFile}" "${inputFile}"`;
      break;
    case 'python':
    case 'py':
      srcFile = path.join(tmpDir, `main_${timestamp}.py`);
      fsSync.writeFileSync(srcFile, code);
      // Execute: python3 "filename" "inputfile"
      compileCmd = (inputFile) => `python3 "${srcFile}" "${inputFile}"`;
      break;
    case 'cpp':
    case 'c++':
      srcFile = path.join(tmpDir, `main_${timestamp}.cpp`);
      const cppOut = path.join(tmpDir, `a_${timestamp}.out`);
      fsSync.writeFileSync(srcFile, code);
      // Execute: g++ "filename" -o "output" && "output" "inputfile"
      compileCmd = (inputFile) => `g++ "${srcFile}" -o "${cppOut}" && "${cppOut}" "${inputFile}"`;
      break;
    case 'java':
      const javaDir = path.join(tmpDir, `java_${timestamp}`);
      if (!fsSync.existsSync(javaDir)) {
        fsSync.mkdirSync(javaDir, { recursive: true });
      }
      srcFile = path.join(javaDir, `Main.java`);
      fsSync.writeFileSync(srcFile, code);
      // Execute: javac "filename" && java -cp "dir" Main "inputfile"
      compileCmd = (inputFile) => `javac "${srcFile}" && java -cp "${javaDir}" Main "${inputFile}"`;
      break;
    default:
      throw new Error('Unsupported language');
  }

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const result = await new Promise((resolve) => {
      const inputData = tc.input || '';
      const expectedOutput = tc.expectedOutput || '';
      
      // Create input file for this test case
      const inputFile = path.join(tmpDir, `input_${timestamp}_${i}.txt`);
      fsSync.writeFileSync(inputFile, inputData);
      
      const cmd = compileCmd(inputFile);
      console.log('Executing command:', cmd);
      
      exec(cmd, { 
        timeout: 5000,
        maxBuffer: 1024 * 1024,
        shell: true
      }, (err, stdout, stderr) => {
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
        if (err) console.log('error:', err.message);
        
        const actualOutput = stdout.trim();
        const expected = expectedOutput.trim();
        
        resolve({
          input: inputData,
          expectedOutput: expected,
          output: actualOutput,
          error: err ? (stderr || err.message) : null,
          passed: actualOutput === expected
        });
      });
    });
    
    results.push(result);
  }
  
  console.log('Files kept at:', tmpDir);
  
  return results;
};


function generateHiddenCases(testCases) {
  const hidden = [];
  const randomizeChar = (ch) => {
    if (/[0-9]/.test(ch)) {
      return String(Math.floor(Math.random() * 10));
    } else if (/[a-zA-Z]/.test(ch)) {
      const isUpper = ch === ch.toUpperCase();
      const base = isUpper ? 65 : 97;
      return String.fromCharCode(base + Math.floor(Math.random() * 26));
    } else {
      return ch;
    }
  };

  for (let t of testCases) {
    if (!t.input || typeof t.input !== 'string') continue;

    let newInput = t.input.split('').map(randomizeChar).join('');
    hidden.push({ input: newInput, expectedOutput: t.expectedOutput });
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
app.post('/api/submits', async (req, res) => {
  const { problemId, code, language } = req.body;
  try {
    const problem = await Problem.findOne({ id: problemId });
    if (!problem) return res.status(404).json({ success: false, message: 'Problem not found' });

    let hiddenCases = generateHiddenCases(problem.examples);
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
app.get('/' , (req,res)=>{
  res.status(200).json({message: "Server running"})
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});