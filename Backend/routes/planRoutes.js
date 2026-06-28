import express from 'express';
import { body, param } from 'express-validator';
import Plan from '../models/planModel.js';
import SubscriptionCode from '../models/subscriptionCodeModel.js';
import User from '../models/userModel.js';
import { verifyToken, requireAdmin } from '../controllers/authController.js';
import { catchAsync } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import crypto from 'crypto';

const router = express.Router();

function generateCode(prefix) {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${rand}`;
}

// ── Public: list active plans ──────────────────────────────────────────────
router.get('/plans', catchAsync(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.discipline) filter.discipline = req.query.discipline;
  if (req.query.year) filter.year = Number(req.query.year);
  const plans = await Plan.find(filter).sort({ sortOrder: 1, name: 1 });
  res.json(plans);
}));

// ── Authenticated: check subscription ──────────────────────────────────────
router.get('/payments/subscription', verifyToken, catchAsync(async (req, res) => {
  const user = await User.findById(req.user.id).select('subscription');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ subscription: user.subscription || { status: 'none' } });
}));

// ── Authenticated: redeem a subscription code ──────────────────────────────
router.post('/payments/redeem-code', verifyToken, [
  body('code').trim().notEmpty().withMessage('Code is required'),
], validate, catchAsync(async (req, res) => {
  const codeStr = req.body.code.toUpperCase().trim();
  const doc = await SubscriptionCode.findOne({ code: codeStr });
  if (!doc) return res.status(404).json({ message: 'Invalid code' });
  if (doc.status !== 'active') return res.status(400).json({ message: 'Code already used or expired' });
  if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
    doc.status = 'expired';
    await doc.save();
    return res.status(400).json({ message: 'Code expired' });
  }

  const plan = await Plan.findById(doc.planId);
  if (!plan || !plan.isActive) return res.status(400).json({ message: 'Associated plan no longer available' });

  const startDate = new Date();
  const endDate = new Date();
  if (plan.interval === 'year') endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 1);

  await User.findByIdAndUpdate(req.user.id, {
    subscription: {
      planId: plan._id,
      planName: plan.name,
      status: 'active',
      startDate,
      endDate,
    },
  });

  doc.status = 'used';
  doc.usedBy = req.user.id;
  doc.usedAt = new Date();
  await doc.save();

  res.json({ message: 'Subscription activated', planName: plan.name, endDate });
}));

// ── Admin: plan CRUD ───────────────────────────────────────────────────────
router.get('/admin/plans', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const plans = await Plan.find().sort({ sortOrder: 1, name: 1 });
  res.json(plans);
}));

router.post('/admin/plans', verifyToken, requireAdmin, [
  body('name').trim().notEmpty(),
  body('discipline').isIn(['medicine', 'pharmacy']),
  body('year').isInt({ min: 1, max: 7 }),
  body('included').optional().isObject(),
  body('interval').optional().isIn(['month', 'year']),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt(),
], validate, catchAsync(async (req, res) => {
  const plan = await Plan.create(req.body);
  res.status(201).json(plan);
}));

router.put('/admin/plans/:id', verifyToken, requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  res.json(plan);
}));

router.delete('/admin/plans/:id', verifyToken, requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const plan = await Plan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  res.json({ message: 'Plan deleted' });
}));

// ── Admin: subscription code management ────────────────────────────────────
router.get('/admin/subscription-codes', verifyToken, requireAdmin, catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.planId) filter.planId = req.query.planId;
  const codes = await SubscriptionCode.find(filter)
    .populate('planId', 'name discipline year')
    .populate('usedBy', 'name email')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });
  res.json(codes);
}));

router.post('/admin/subscription-codes/generate', verifyToken, requireAdmin, [
  body('planId').isMongoId(),
  body('count').isInt({ min: 1, max: 100 }),
  body('expiresAt').optional({ values: 'null' }).isISO8601(),
  body('notes').optional().trim(),
], validate, catchAsync(async (req, res) => {
  const { planId, count, expiresAt, notes } = req.body;
  const plan = await Plan.findById(planId);
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  const prefix = `${plan.discipline.slice(0, 3).toUpperCase()}${plan.year}`;
  const codes = [];
  for (let i = 0; i < count; i++) {
    let code;
    let attempts = 0;
    do {
      code = generateCode(prefix);
      attempts++;
    } while (attempts < 20 && await SubscriptionCode.findOne({ code }));
    codes.push(code);
  }

  const docs = codes.map((code) => ({
    code,
    planId,
    createdBy: req.user.id,
    expiresAt: expiresAt || null,
    notes: notes || '',
  }));
  await SubscriptionCode.insertMany(docs);

  res.status(201).json({ message: `${codes.length} codes generated`, codes });
}));

router.delete('/admin/subscription-codes/:id', verifyToken, requireAdmin, [
  param('id').isMongoId(),
], validate, catchAsync(async (req, res) => {
  const code = await SubscriptionCode.findByIdAndUpdate(req.params.id, { status: 'expired' }, { new: true });
  if (!code) return res.status(404).json({ message: 'Code not found' });
  res.json({ message: 'Code revoked' });
}));

// ── Admin: set user subscription manually ──────────────────────────────────
router.put('/users/:id/subscription', verifyToken, requireAdmin, [
  param('id').isMongoId(),
  body('status').optional().isIn(['none', 'active', 'expired', 'cancelled']),
  body('planId').optional({ values: 'null' }).isMongoId(),
  body('planName').optional().trim(),
  body('startDate').optional({ values: 'null' }).isISO8601(),
  body('endDate').optional({ values: 'null' }).isISO8601(),
], validate, catchAsync(async (req, res) => {
  const { status, planId, planName, startDate, endDate } = req.body;
  const subscription = {};
  if (status !== undefined) subscription['subscription.status'] = status;
  if (planId !== undefined) subscription['subscription.planId'] = planId || null;
  if (planName !== undefined) subscription['subscription.planName'] = planName || '';
  if (startDate !== undefined) subscription['subscription.startDate'] = startDate || null;
  if (endDate !== undefined) subscription['subscription.endDate'] = endDate || null;

  const user = await User.findByIdAndUpdate(req.params.id, { $set: subscription }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'Subscription updated', user });
}));

export default router;
