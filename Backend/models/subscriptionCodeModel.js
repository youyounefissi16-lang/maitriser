import mongoose from 'mongoose';

const subscriptionCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  status: { type: String, enum: ['active', 'used', 'expired'], default: 'active' },
  expiresAt: { type: Date, default: null },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  usedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

subscriptionCodeSchema.index({ status: 1, planId: 1 });
subscriptionCodeSchema.index({ usedBy: 1 });

const SubscriptionCode = mongoose.model('SubscriptionCode', subscriptionCodeSchema);
export default SubscriptionCode;
