import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  bookId:       { type: String, unique: true, trim: true },
  title:        { type: String, required: true },
  moduleIds:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }], // multiple modules
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
}, { timestamps: true });

bookSchema.index({ moduleIds: 1, createdAt: -1 });
bookSchema.index({ title: 'text' });

const Book = mongoose.model('Book', bookSchema);
export default Book;
