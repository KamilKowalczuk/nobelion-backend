import Stripe from 'stripe';
import { randomBytes } from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: '2026-04-22.dahlia' });

export const generateToken = () => {
    return randomBytes(16).toString('hex');
};

export const createStripeSession = async (params: any) => {
    return await stripe.checkout.sessions.create(params);
};
