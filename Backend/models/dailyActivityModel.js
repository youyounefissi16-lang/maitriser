import mongoose from 'mongoose';

const dailyActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  quizIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
  answers: [{
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    questionText: String,
    selectedAnswers: [String],
    correctAnswers: [String],
    correct: Boolean,
  }],
  score: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  completedAt: { type: Date, default: Date.now },
}, { timestamps: true });

dailyActivitySchema.index({ userId: 1, date: 1 }, { unique: true });
dailyActivitySchema.index({ date: 1 });

const DailyActivity = mongoose.model('DailyActivity', dailyActivitySchema);
export default DailyActivity;
