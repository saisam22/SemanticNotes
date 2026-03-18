const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/db');
const logger = require('../config/logger');

// POST /api/auth/register
const register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;
    try {
        // Check if email exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Email already registered' });
        }

        const password_hash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
            [name, email, password_hash]
        );

        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        logger.info(`New user registered: ${email}`);
        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (err) {
        logger.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        logger.info(`User logged in: ${email}`);
        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email },
        });
    } catch (err) {
        logger.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};

// GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        logger.error('GetMe error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = { register, login, getMe };
