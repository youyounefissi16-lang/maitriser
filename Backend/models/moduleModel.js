import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  year: { type: Number, required: true, min: 1, max: 7 },
  courses: [{ type: String }],
}, { timestamps: true });

moduleSchema.index({ year: 1, name: 1 }, { unique: true });

const Module = mongoose.model('Module', moduleSchema);
export default Module;
