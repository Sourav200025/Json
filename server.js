const express = require('express');
const cors = require('cors');
const apiRoutes = require('./api'); // Aapki api.js file ko yahan import kiya gaya hai

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Kisi bhi frontend se API call allow karne ke liye
app.use(express.json()); // JSON data read karne ke liye

// Routes
app.use('/', apiRoutes); // api.js ke saare routes '/' path par kaam karenge

// System Health Check (Render par status check karne ke liye)
app.get('/ping', (req, res) => {
    res.json({ status: 'success', message: 'Infinity Gateway API is live and running!' });
});

// Server Start
app.listen(PORT, () => {
    console.log(`Server is running successfully on port ${PORT}`);
});
