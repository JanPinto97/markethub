const router = require('express').Router();
const ctrl = require('../controllers/searchController');

router.get('/', ctrl.search);

module.exports = router;
