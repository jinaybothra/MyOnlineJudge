const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  //userId: { type: String, required: true, unique: true },
  username: String,
  solvedProblems: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
  ranking: { type: String, default: 'N/A' },
  languages: [String],
  achievements: [String],
  recentActivity: [String],
  email: {type: String, required: true, unique: true},
  password: {type: String, required: true},
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);