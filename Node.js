const express = require('express');
const app = express();

// Define the API endpoint
app.get('/api/transfer', (req, res) => {
    // 1. Get parameters from the URL
    const token = req.query.token;
    const paytoNumber = req.query.paytoNumber;
    const amount = parseFloat(req.query.amount);
    const comment = req.query.comment || "";

    // 2. Validate parameters
    if (!token || !paytoNumber || isNaN(amount)) {
        return res.status(400).json({
            status: "failure",
            message: "Missing or invalid parameters. 'token', 'paytoNumber', and 'amount' are required."
        });
    }

    // 3. Process the data (Database logic goes here)
    const transactionId = "TXN" + Math.floor(Math.random() * 1000000000);

    // 4. Return the output as JSON
    res.json({
        status: "success",
        message: "Payment processed successfully",
        data: {
            transaction_id: transactionId,
            amount: amount,
            receiver_number: paytoNumber,
            comment: comment,
            timestamp: new Date().toISOString()
        }
    });
});

// Start the server
app.listen(3000, () => {
    console.log('API running on http://localhost:3000');
});
