const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const validationRoutes = require('./validationRoutes');

router.use('/auth', authRoutes);
router.use('/validations', validationRoutes);

module.exports = router;