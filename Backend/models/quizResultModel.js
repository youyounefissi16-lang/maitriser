import mongoose from 'mongoose';

const quizResultSchema = new mongoose.Schema({
  // userId is a plain string (e.g. "U001") — NOT an ObjectId.
  // Students log in with a userId string, not a MongoDB _id.
  userId:    { type: String, required: true, index: true },
  quizId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score:     { type: Number, required: true },
  answers:   { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

quizResultSchema.index({ userId: 1, timestamp: -1 });
quizResultSchema.index({ quizId: 1 });
quizResultSchema.index({ userId: 1, quizId: 1 });
quizResultSchema.index({ score: 1 });

const QuizResult = mongoose.model('QuizResult', quizResultSchema);
export default QuizResult;
