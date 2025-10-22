const mongoose = require('mongoose');

const TestcaseSchema = new mongoose.Schema({
  input: { type: String, required: true },   // raw stdin or serialized args
  output: { type: String, required: true },  // expected stdout
});

const ProblemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. 'two-sum'
  title: { type: String, required: true },
  difficulty: { type: String, default: 'Medium' },
  tags: [String],
  statement: String,
  constraints: String,
  examples: [{ in: String, out: String }],
  defaultCode: {javascript: String, java: String, cpp: String, python: String},
  testcases: [TestcaseSchema], // used by /submit to evaluate
}, { timestamps: true });

module.exports = mongoose.model('Problem', ProblemSchema);