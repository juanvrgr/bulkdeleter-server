const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models').User;
const BillingPlan = require('../models').BillingPlan;

const router = express.Router();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password', 'accessToken', 'googleId'] } });
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, { attributes: { exclude: ['password', 'accessToken'] } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/user/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ where: { email }, attributes: { exclude: ['password', 'accessToken'] } });
        if (!user) {
            return res.status(200).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetPasswordToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const resetPasswordUrl = `http://localhost:3000/reset-password/${resetPasswordToken}`;
        await transporter.sendMail({
            to: email,
            from: 'BulkDeleter Team',
            subject: 'Reset your BulkDeleter account password',
            html: `<p>Please click the link below to reset your password:</p><a href="${resetPasswordUrl}">${resetPasswordUrl}</a>`
        });

        res.status(200).json({ message: 'Please check your email to reset your password.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByPk(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully. You can now login.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/user/:userId/billing', async (req, res) => {
    try {
        const { userId } = req.params;
        const userWithBillingPlan = await User.findByPk(userId, {
            include: [{
                model: BillingPlan,
                as: 'billingPlan'
            }]
        });

        if (!userWithBillingPlan) {
            return res.status(404).send('User not found.');
        }

        res.send(userWithBillingPlan.billingPlan);
    } catch (error) {
        res.status(400).send(error.message);
    }
});

router.put('/user/:userId/google', async (req, res) => {
    try {
        const { userId } = req.params;
        const { googleId, accessToken } = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.googleId = googleId;
        user.accessToken = accessToken;
        await user.save();

        res.status(200).json({ message: 'Google ID added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;