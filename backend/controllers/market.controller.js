const axios = require('axios');

exports.getPrices = async (req, res) => {
    try {
        const symbols = req.query.symbols || 'BTC/USD,EUR/USD,GOLD,SPX';
        const apiKey = process.env.TWELVE_DATA_API_KEY;
        
        // Llamada a Twelve Data desde el servidor
        const response = await axios.get(`https://api.twelvedata.com/price?symbol=${symbols}&apikey=${apiKey}`);
        
        // Twelve Data a veces devuelve error 200 con un mensaje de error en el body
        if (response.data.status === 'error') {
            return res.status(429).json({ message: 'Límite de API alcanzado o símbolo inválido' });
        }

        res.json(response.data);
    } catch (error) {
        console.error('Error en Market Controller:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener precios' });
    }
};

exports.getHistory = async (req, res) => {
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
        const { symbol } = req.query;
        const apiKey = process.env.TWELVE_DATA_API_KEY;
        const response = await axios.get(`https://api.twelvedata.com/news?symbol=${symbol}&apikey=${apiKey}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener noticias' });
    }
};
