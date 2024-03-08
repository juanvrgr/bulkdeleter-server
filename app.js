const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('./models').User;
const BillingPlan = require('./models').BillingPlan;
const cors = require('cors');
const dotenv = require('dotenv').config();

const app = express();
app.use(express.json());

app.use(cors());

const PORT = process.env.PORT || 3001;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post('/register', async (req, res) => {
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

app.get('/verify/:token', async (req, res) => {
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

app.post('/login', async (req, res) => {
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

app.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password', 'accessToken', 'googleId'] } });
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/users/:id', async (req, res) => {
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

app.get('/user/:email', async (req, res) => {
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

app.post('/forgot-password', async (req, res) => {
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

app.post('/reset-password/:token', async (req, res) => {
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

app.get('/user/:userId/billing', async (req, res) => {
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

app.put('/user/:userId/google', async (req, res) => {
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));