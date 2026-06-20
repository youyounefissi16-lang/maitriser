import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
}, { timestamps: true });

bookmarkSchema.index({ userId: 1, quizId: 1 }, { unique: true });

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
export default Bookmark;
