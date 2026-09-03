const router = require('express').Router();
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin (Only do this ONCE in your main server file, 
// or ensure it doesn't re-initialize if already done)
if (!admin.apps.length) {
  const serviceAccount = require('./serviceAccountKey.json'); // Path to your key
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN || "8280911898:AAFDTVyHxSbzP_fUGicuAyP-Kmpi07yLaEc";
const ADMIN_TG_ID = process.env.ADMIN_TG_ID;

/**
 * Helper to send Telegram Messages[span_1](start_span)[span_1](end_span)
 */
async function sendTG(tg_id, text) {
  if (!tg_id) return;
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: tg_id,
      text: text,
      parse_mode: 'HTML' // Changed to HTML to match your frontend style
    }, { timeout: 8000 });
  } catch (e) {
    console.error('TG Error:', e.message);
  }
}

/**
 * Main Payment Processor[span_2](start_span)[span_2](end_span)
 */
async function processPayment(req, res, query) {
  try {
    const key = query.key || query.token;
    const to = query.to || query.paytoNumber;
    const amount = query.amount || query.amt;
    const comment = query.comment || '';
    
    // 1. Validation
    if (!key) return res.status(400).json({ status: 'error', message: 'API key required' });
    if (!to) return res.status(400).json({ status: 'error', message: 'Receiver number required' });
    if (!amount) return res.status(400).json({ status: 'error', message: 'Amount required' });

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 1) {
      return res.status(400).json({ status: 'error', message: 'Invalid amount. Minimum ₹1' });
    }

    // 2. Fetch Users from Firestore
    const senderSnapshot = await db.collection('users').where('apiToken', '==', key).limit(1).get();
    if (senderSnapshot.empty) {
      return res.status(401).json({ status: 'error', message: 'Invalid API Token' });
    }
    const senderDoc = senderSnapshot.docs[0];
    const senderData = senderDoc.data();

    const receiverSnapshot = await db.collection('users').where('phone', '==', to).limit(1).get();
    if (receiverSnapshot.empty) {
      return res.status(404).json({ status: 'error', message: `Receiver ${to} not found on network` });
    }
    const receiverDoc = receiverSnapshot.docs[0];
    const receiverData = receiverDoc.data();

    if (senderData.phone === receiverData.phone) {
      return res.status(400).json({ status: 'error', message: 'Cannot transfer to self' });
    }

    let txId = "";
    let sNewBal = 0;
    let rNewBal = 0;

    // 3. Execute Firestore Transaction (Safe concurrency)
    await db.runTransaction(async (t) => {
      const sRef = db.collection('users').doc(senderDoc.id);
      const rRef = db.collection('users').doc(receiverDoc.id);

      const sFresh = await t.get(sRef);
      const rFresh = await t.get(rRef);

      if (sFresh.data().balance < amt) {
        throw new Error('Insufficient Balance');
      }

      sNewBal = sFresh.data().balance - amt;
      rNewBal = rFresh.data().balance + amt;

      // Update balances
      t.update(sRef, { balance: sNewBal });
      t.update(rRef, { 
        balance: rNewBal, 
        totalCredits: (rFresh.data().totalCredits || 0) + amt 
      });

      // Create transaction record
      const txnRef = db.collection('transactions').doc();
      txId = txnRef.id;
      
      t.set(txnRef, {
        type: 'api_transfer',
        from: senderDoc.id,
        to: receiverDoc.id,
        senderName: senderData.name,
        senderPhone: senderData.phone,
        receiverName: receiverData.name,
        receiverPhone: receiverData.phone,
        amount: amt,
        balanceAfter: sNewBal,
        status: 'success',
        comment: comment,
        timestamp: Date.now(),
        usersInvolved: [senderDoc.id, receiverDoc.id]
      });
    });

    // 4. Formatting timestamp
    const dObj = new Date(); 
    const tStamp = `${('0'+dObj.getDate()).slice(-2)}-${('0'+(dObj.getMonth()+1)).slice(-2)}-${dObj.getFullYear()} ${('0'+dObj.getHours()).slice(-2)}:${('0'+dObj.getMinutes()).slice(-2)}:${('0'+dObj.getSeconds()).slice(-2)}`;

    // 5. Send API Response[span_3](start_span)[span_3](end_span)
    res.json({
      status: 'success',
      message: 'Payment successful',
      data: {
        transaction_id: txId.toUpperCase(),
        amount: amt.toString(),
        receiver: {
          name: receiverData.name,
          number: receiverData.phone
        }
      },
      comment: comment,
      timestamp: tStamp
    });

    // 6. INSTANT NOTIFICATIONS[span_4](start_span)[span_4](end_span)
    if (senderData.telegramUid) {
      const sendAlert = `<b>💸 Amount Sent Successfully</b>\n━━━━━━━━━━━━━━━━━━\n 🆔 <b>Receiver :</b> <code>${receiverData.phone}</code>\n ⚡️ <b>Amount:</b> ₹${amt.toFixed(1)}\n 👩‍💻 <b>Method:</b> API\n 💰 <b>Updated Balance:</b> <code>₹${sNewBal.toFixed(1)}</code>\n━━━━━━━━━━━━━━━━━━\n🚀 Payment has been securely debited!`;
      sendTG(senderData.telegramUid, sendAlert);
    }

    if (receiverData.telegramUid) {
      const rcvAlert = `<b>💸 Amount Credited Successfully</b>\n━━━━━━━━━━━━━━━━━━\n 🆔 <b>Sender :</b> <code>${senderData.phone}</code>\n ⚡️ <b>Amount:</b> ₹${amt.toFixed(1)}\n 👩‍💻 <b>Method:</b> API\n 💰 <b>Updated Balance:</b> <code>₹${rNewBal.toFixed(1)}</code>\n━━━━━━━━━━━━━━━━━━\n🚀 Payment has been securely Credited!`;
      sendTG(receiverData.telegramUid, rcvAlert);
    }

  } catch (e) {
    console.error('Payment error:', e.message);
    if (!res.headersSent) {
      res.status(e.message === 'Insufficient Balance' ? 400 : 500)
         .json({ status: 'error', message: e.message });
    }
  }
}

// Routes[span_5](start_span)[span_5](end_span)
router.get('/', (req, res) => processPayment(req, res, req.query));
router.get('/api-pay', (req, res) => processPayment(req, res, req.query));

// Balance Check[span_6](start_span)[span_6](end_span)
router.get('/balance', async (req, res) => {
  try {
    const { key, token } = req.query;
    const apiKey = key || token;
    
    if (!apiKey) return res.json({ status: 'error', message: 'Token required' });
    
    const userSnap = await db.collection('users').where('apiToken', '==', apiKey).limit(1).get();
    if (userSnap.empty) return res.json({ status: 'error', message: 'Invalid API Token' });
    
    const user = userSnap.docs[0].data();
    res.json({ status: 'success', balance: user.balance, name: user.name });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Verify Number[span_7](start_span)[span_7](end_span)
router.get('/verify', async (req, res) => {
  try {
    const { key, token, number, mobile } = req.query;
    const apiKey = key || token;
    const targetNum = number || mobile;

    if (!apiKey) return res.json({ status: 'error', message: 'Token required' });
    
    const senderSnap = await db.collection('users').where('apiToken', '==', apiKey).limit(1).get();
    if (senderSnap.empty) return res.json({ status: 'error', message: 'Invalid API Token' });
    
    if (!targetNum) return res.json({ status: 'error', message: 'Target number required' });
    
    const targetSnap = await db.collection('users').where('phone', '==', targetNum).limit(1).get();
    if (targetSnap.empty) return res.json({ status: 'error', message: 'User not found' });
    
    const user = targetSnap.docs[0].data();
    res.json({ status: 'success', name: user.name, number: user.phone });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;

