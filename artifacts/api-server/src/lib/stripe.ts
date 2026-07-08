import Stripe from 'stripe';

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(secretKey, {
  apiVersion: '2025-08-27.basil',
});

export const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY ?? '',
  annual: process.env.STRIPE_PRICE_ID_ANNUAL ?? '',
} as const;

export type BillingPlan = keyof typeof STRIPE_PRICE_IDS;
