const express = require('express');
const { body } = require('express-validator');
const {
    createNote,
    getNotes,
    getNoteById,
    updateNote,
    deleteNote,
    searchNotes,
    getTags,
} = require('../controllers/notesController');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/notes/tags — must come before /:id to avoid conflict
router.get('/tags', getTags);

// POST /api/notes/search — semantic search
router.post('/search', searchNotes);

// CRUD routes
router.post(
    '/',
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('content').trim().notEmpty().withMessage('Content is required'),
        body('tags').optional().isArray().withMessage('Tags must be an array'),
    ],
    createNote
);

router.get('/', getNotes);
router.get('/:id', getNoteById);

router.put(
    '/:id',
    [
        body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
        body('content').optional().trim().notEmpty().withMessage('Content cannot be empty'),
        body('tags').optional().isArray().withMessage('Tags must be an array'),
    ],
    updateNote
);

router.delete('/:id', deleteNote);

module.exports = router;
