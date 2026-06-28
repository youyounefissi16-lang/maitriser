import User from '../models/userModel.js';

export async function checkSubscription(userId) {
  const user = await User.findById(userId).select('subscription');
  if (!user) return false;
  if (!user.subscription || user.subscription.status !== 'active') return false;
  if (user.subscription.endDate && new Date(user.subscription.endDate) < new Date()) return false;
  return true;
}
