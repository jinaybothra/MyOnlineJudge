require('dotenv').config();
const mongoose = require('mongoose');
const Problem = require('./models/Problem');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/codearena';

const problems = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['array', 'hashmap'],
    statement: 'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
    constraints: '2 <= nums.length <= 10^5',
    examples: [{ in: 'nums = [2,7,11,15], target = 9', out: '[0,1]' }],
    defaultCode: {
      javascript: "function twoSum(nums, target) {\n// enter your code here\n  return [];\n}\n\nconst fs = require('fs');\n\nif (process.argv.length < 3) {\n  console.error(\"No input file provided\");\n  process.exit(1);\n}\n\nconst inputFile = process.argv[2];\n\ntry {\n  const fileContent = fs.readFileSync(inputFile, 'utf8');\n  const values = fileContent.trim().split(/\\s+/).map(Number);\n  if (values.length < 2) {\n    console.error(\"Invalid input format - need at least 2 values\");\n    console.error(\"Got:\", values);\n    process.exit(1);\n  }\n  \n  const n = values[0];\n  const nums = values.slice(1, n + 1);\n  const target = values[n + 1];\n  const result = twoSum(nums, target);\n  console.log(\"[\" + result+\"]\");\n  \n} catch (err) {\n  console.error('Error reading file:', err.message);\n  process.exit(1);\n}",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nvector<int> twoSum(const vector<int>& nums, int target) {\n    // write your solution here\n    return {};\n}\n\nint main(int argc, char* argv[]) {\n    if (argc < 2) {\n        cerr << \"Usage: ./a.out <inputfile>\" << endl;\n        return 1;\n    }\n    \n    ifstream inputFile(argv[1]);\n    if (!inputFile) {\n        cerr << \"Cannot open input file\" << endl;\n        return 1;\n    }\n    \n    int n;\n    inputFile >> n;\n    \n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) {\n        inputFile >> nums[i];\n    }\n    \n    int target;\n    inputFile >> target;\n    \n    inputFile.close();\n    \n    vector<int> result = twoSum(nums, target);\n    if (!result.empty()) {\n        cout << \"[\" << result[0] << \",\" << result[1] << \"]\" << endl;\n    } else {\n        cout << \"[]\" << endl;\n    }\n    \n    return 0;\n}",
      java: "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static int[] twoSum(int[] nums, int target) {\n        // write your solution here\n        return new int[]{};\n    }\n\n    public static void main(String[] args) {\n        // Input format: java Main \"inputfile.txt\"\n        if (args.length < 1) {\n            System.err.println(\"Usage: java Main <inputfile>\");\n            System.exit(1);\n        }\n        \n        try {\n            File file = new File(args[0]);\n            Scanner sc = new Scanner(file);\n            \n            int n = sc.nextInt();\n            int[] nums = new int[n];\n            for (int i = 0; i < n; i++) {\n                nums[i] = sc.nextInt();\n            }\n            int target = sc.nextInt();\n            \n            sc.close();\n            \n            int[] result = twoSum(nums, target);\n            if (result.length == 2) {\n                System.out.println(\"[\" + result[0] + \",\" + result[1] + \"]\");\n            } else {\n                System.out.println(\"[]\");\n            }\n        } catch (FileNotFoundException e) {\n            System.err.println(\"Cannot open input file\");\n            System.exit(1);\n        }\n    }\n}",
      python: "def two_sum(nums, target):\n    # write your code here\n    return []\n\nimport sys\nimport os\n\nif len(sys.argv) < 2:\n    print(\"Usage: python3 script.py <inputfile>\", file=sys.stderr)\n    sys.exit(1)\n\ninput_file = sys.argv[1]\nif not os.path.exists(input_file):\n    print(f\"Input file does not exist: {input_file}\", file=sys.stderr)\n    sys.exit(1)\n\ntry:\n    with open(input_file, 'r') as f:\n        line = f.read().strip()\n        values = list(map(int, line.split()))\n    if len(values) < 2:\n        print(\"Invalid input format\", file=sys.stderr)\n        sys.exit(1)\n    \n    n = values[0]\n    \n    if len(values) < n + 2:\n        print(f\"Invalid input: expected {n + 2} values, got {len(values)}\", file=sys.stderr)\n        sys.exit(1)\n    nums = values[1:n+1]\n    target = values[n+1]\n    result = two_sum(nums, target)\n    print(str(result).replace(\" \", \"\"))\n    \nexcept ValueError as e:\n    print(f\"Invalid input: contains non-numeric values\", file=sys.stderr)\n    sys.exit(1)\nexcept Exception as e:\n    print(f\"Error: {str(e)}\", file=sys.stderr)\n    sys.exit(1)",
    },
    testcases: [
      { input: '4 2 7 11 15 9', output: '[0,1]' },
      { input: '3 3 2 4 6', output: '[1,2]' },
    ]
  },
  {
    id: 'reverse-string',
    title: 'Reverse String',
    difficulty: 'Easy',
    tags: ['string'],
    statement: 'Write a function that reverses a string in-place.',
    constraints: '1 <= s.length <= 10^5',
    examples: [{ in: 's = ["h","e","l","l","o"]', out: '["o","l","l","e","h"]' }],
    defaultCode: {
      javascript: "function reverseString(s) {\n  // write your solution here\n  return s;\n}\n\nconst fs = require('fs');\nif (process.argv.length < 3) {\n  console.error(\"Usage: node script.js <inputfile>\");\n  process.exit(1);\n}\nconst inputFile = process.argv[2];\nif (!fs.existsSync(inputFile)) {\n  console.error(\"Input file does not exist:\", inputFile);\n  process.exit(1);\n}\n\ntry {\n  const line = fs.readFileSync(inputFile, 'utf8').replace(/\\\\n$/, '');\n  const result = reverseString(line);\n  console.log(result);\n} catch (err) {\n  console.error(\"Error:\", err.message);\n  process.exit(1);\n}",
      java: "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static String reverseString(String s) {\n        // write your solution here\n        return \" \";\n    }\n    public static void main(String[] args) {\n        if (args.length < 1) {\n            System.err.println(\"Usage: java Main <inputfile>\");\n            System.exit(1);\n        }\n        try {\n            File file = new File(args[0]);\n            BufferedReader br = new BufferedReader(new FileReader(file));\n            String line = br.readLine();\n            br.close();\n            \n            if (line == null) {\n                line = \"\";\n            }\n            String result = reverseString(line);\n            System.out.println(result);\n            \n        } catch (FileNotFoundException e) {\n            System.err.println(\"Cannot open input file\");\n            System.exit(1);\n        } catch (IOException e) {\n            System.err.println(\"Error reading file\");\n            System.exit(1);\n        }\n    }\n}",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nstring reverseString(const string& s) {\n    // write your solution here\n    return \" \";\n}\n\nint main(int argc, char* argv[]) {\n    if (argc < 2) {\n        cerr << \"Usage: ./a.out <inputfile>\" << endl;\n        return 1;\n    }\n    ifstream inputFile(argv[1]);\n    if (!inputFile) {\n        cerr << \"Cannot open input file\" << endl;\n        return 1;\n    }\n    string line;\n    getline(inputFile, line);\n    inputFile.close();\n    string result = reverseString(line);\n    cout << result << endl;\n    \n    return 0;\n}",
      python: "def reverse_string(s):\n    # write your solution here\n    return ' '\n\nimport sys\nimport os\nif len(sys.argv) < 2:\n    print(\"Usage: python3 script.py <inputfile>\", file=sys.stderr)\n    sys.exit(1)\n\ninput_file = sys.argv[1]\n\nif not os.path.exists(input_file):\n    print(f\"Input file does not exist: {input_file}\", file=sys.stderr)\n    sys.exit(1)\ntry:\n    with open(input_file, 'r') as f:\n        line = f.read().rstrip('\\\\n')\n    \n    result = reverse_string(line)\n    print(result)\n    \nexcept Exception as e:\n    print(f\"Error: {str(e)}\", file=sys.stderr)\n    sys.exit(1)"
    },
    testcases: [
      { input: 'hello', output: 'olleh' },
      { input: 'abc', output: 'cba' },
    ]
  }
];

mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to mongo, seeding...');
    for (const p of problems) {
      await Problem.findOneAndUpdate({ id: p.id }, p, { upsert: true });
      console.log('Upserted:', p.id);
    }
    console.log('Seed complete');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Err', e);
    process.exit(1);
  });