const express = require('express');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/hackfest2', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/hackfest2.html'));
});

module.exports = router;