const express = require('express');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

const planPrices = {
  1: { amount: 2000 },
  2: { amount: 4000 }
}

router.post('/create-intent', async (req, res) => {
  try {
    const { currency, planId } = req.body;

    const expectedAmount = planPrices[planId].amount;
    const clientAmount = req.body.amount;

    if (expectedAmount !== clientAmount) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: planPrices[planId].amount,
      currency: currency,
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;