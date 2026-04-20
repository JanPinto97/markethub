const router = require('express').Router();
const marketController = require('../controllers/market.controller');

// Obtener precios en tiempo real para el ticker
router.get('/prices', marketController.getPrices);

// Obtener serie temporal para el gráfico
router.get('/history', marketController.getHistory);

// Obtener noticias
router.get('/news', marketController.getNews);

// Obtener calendario económico
router.get('/calendar', marketController.getEconomicCalendar);

module.exports = router;
