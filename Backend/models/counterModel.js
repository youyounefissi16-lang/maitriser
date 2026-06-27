import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.getNextSequence = async function (prefix) {
  const counter = await this.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
};

const Counter = mongoose.model('Counter', counterSchema);
export default Counter;
