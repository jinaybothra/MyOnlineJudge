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
      javascript: "function twoSum(nums, target) {  \n// write your solution here  \nreturn [];\n}\nconst args = process.argv.slice(3);\nif (args.length < 3) {\n  console.error(\"Usage: node twoSum.js <num1> <num2> ... <target>\");\n  process.exit(1);\n}\n\nconst num = parseInt(args[0]);\nconst target = parseInt(args[args.length - 1]);\nconst nums = args.slice(1, args.length - 1).map(Number);\nconst result = twoSum(nums, target);\nconst str = `[${result.join(\",\")}]`;\nconsole.log(str);",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nvector<int> twoSum(const vector<int>& nums, int target) {\n    return {};\n}\n\nint main() {\n    int n;\n    cin >> n; // number of elements\n    vector<int> nums(n);\n    for (int i = 0; i < n; i++) {\n        cin >> nums[i];\n    }\n    int target;\n    cin >> target;\n    vector<int> result = twoSum(nums, target);\n    if (!result.empty()) {\n cout <<\"[\" << result[0] << \",\" << result[1]<<\"]\" << endl;\n    } else {\n        cout << \"No solution found\" << endl;\n    }\n    return 0;\n}\n",
      java: "import java.util.*;\n\npublic class TwoSum {\n\n    public static int[] twoSum(int[] nums, int target) {\n        return [];\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) {\n            nums[i] = sc.nextInt();\n        }\n        int target = sc.nextInt();\n        int[] result = twoSum(nums, target);\n        if (result.length == 2) {\n            System.out.println(result[0] + \" \" + result[1]);\n        } else {\n            System.out.println(\"No solution found\");\n        }\n        sc.close();\n    }\n}\n",
      python: "def two_sum(nums, target):\n    return []  # no solution found\n\ndef main():\n    n = int(input())\n    nums = list(map(int, input().split()))\n    target = int(input())\n    result = two_sum(nums, target)\n    if result:\n        print(result[0], result[1])\n    else:\n        print(\"No solution found\")\n\nif __name__ == \"__main__\":\n    main()\n"
    },
    testcases: [
      { input: '4 2 7 11 15 9', output: '[0,1]' },
      { input: '3 3 2 4 6', output: '[1,2]' },
    ],
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
      javascript: "function reverseString(String line)\n{ return ''}\nconst readline = require(\"readline\");\n\nconst rl = readline.createInterface({\n  input: process.stdin,\n  output: process.stdout\n});\n\nlet inputLines = [];\n\nrl.on(\"line\", (line) => {\n  inputLines.push(line);\n}).on(\"close\", () => {\n  const reversed = reverseString(inputLines)\n    console.log(reversed);\n  });\n});\n\nprocess.stdin.on(\"end\", () => rl.close());\n",
      java: "import java.util.Scanner;\n\npublic class ReverseString {\n    public static String reverse(String str) {\n    return '';\n}\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        while (sc.hasNextLine()) {\n            String line = sc.nextLine();\n            String reversed = reverse(line);\n            System.out.println(reversed);\n        }\n        sc.close();\n    }\n}",
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\nstring reverseString(const string& str) {\n    return '';\n    }\n\nint main() {\n    string line;\n    while (getline(cin, line)) {\n        string reversed = reverseString(line);\n        cout << reversed << endl;\n    }\n    return 0;\n}\n",
      python: "def reverse_string(s: str) -> str:\n    return ''\n\ndef main():\n    import sys\n    for line in sys.stdin:\n        line = line.rstrip('\\n')  # remove newline character\n        print(reverse_string(line))\n\nif __name__ == \"__main__\":\n    main()\n"
    },
    testcases: [
      { input: 'hello', output: 'olleh' },
      { input: 'abc', output: 'cba' },
    ],
  },
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