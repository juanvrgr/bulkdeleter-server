const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models').User;
require('dotenv').config()

const router = express.Router();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, isGoogle, googleId, accessToken } = req.body;

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            isVerified: isGoogle ? true : false,
            provider: isGoogle ? 'google' : 'email',
            billingPlanId: 1,
            googleId: googleId ? googleId : null,
            accessToken: accessToken ? accessToken : null
        });

        if (isGoogle) {
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.status(201).json({ user, token });
        }

        const verificationToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const verificationUrl = `http://localhost:${PORT}/verify/${verificationToken}`;
        await transporter.sendMail({
            to: email,
            from: 'BulkDeleter Team',
            subject: 'Verify your BulkDeleter account',
            html: `<p>Please click the link below to verify your email:</p><a href="${verificationUrl}">${verificationUrl}</a>`
        });

        res.status(201).json({ message: 'User registered. Please check your email to verify your account.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: `Error: ${error.message}` });
    }
});

router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByPk(decoded.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isVerified = true;
        await user.save();

        res.redirect('http://localhost:3000/login?verified=true');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ message: 'Email not verified' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(403).json({ message: 'Invalid password' });
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const userInfo = {
            id: user.dataValues.id,
            username: user.dataValues.username,
            isVerified: user.dataValues.isVerified,
            email: user.dataValues.email,
            billingPlanId: user.dataValues.billingPlanId,
            provider: user.dataValues.provider
        }
        res.status(200).json({ token, user: userInfo });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;