const axios = require('axios');

const getFinnhubUrl = (endpoint) => `https://finnhub.io/api/v1/${endpoint}?token=${process.env.FINNHUB_API_KEY}`;

exports.getPrices = async (req, res) => {
    try {
        const symbol = req.query.symbols || 'BINANCE:BTCUSDT';
        // Usamos Finnhub para quotes en tiempo real
        const response = await axios.get(`${getFinnhubUrl('quote')}&symbol=${symbol}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo precios de Finnhub' });
    }
};

exports.getHistory = async (req, res) => {
    // Nota: El gráfico ahora usará el widget directo de TradingView
    // Pero mantenemos este endpoint por si se usa Twelve Data fallback
    try {
        const { symbol, interval } = req.query;
        const apiKey = process.env.TWELVE_DATA_API_KEY;
        const response = await axios.get(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&apikey=${apiKey}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener histórico' });
    }
};

exports.getNews = async (req, res) => {
    try {
        const { category = 'general' } = req.query;
        const response = await axios.get(`${getFinnhubUrl('news')}&category=${category}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener noticias' });
    }
};

exports.getEconomicCalendar = async (req, res) => {
    try {
        const { from, to } = req.query;
        const response = await axios.get(`${getFinnhubUrl('calendar/economic')}&from=${from}&to=${to}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener calendario económico' });
    }
};
