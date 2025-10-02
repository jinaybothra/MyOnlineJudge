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
    defaultCode: `function twoSum(nums, target) {\n  // write your solution here\n  return [];\n}`,
    testcases: [
      { input: '2\n[2,7,11,15]\n9', output: '[0,1]' },
      { input: '3\n[3,2,4]\n6', output: '[1,2]' },
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
    defaultCode: `function reverseString(s) {\n  // write your solution here\n}`,
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