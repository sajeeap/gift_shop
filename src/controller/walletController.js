const Wallet = require("../model/walletSchema");
const Cart = require("../model/cartSchema");
const Wishlist = require("../model/whishlistSchema")
const crypto = require("crypto");
const razorpayInstance = require("../config/razorPay"); // Assuming you have a Razorpay instance configured


// Fetch user's wallet and transaction history
const getWallet =async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to login if session not found
        }

        const userId = req.session.user._id || req.session.user;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default to 10 transactions per page
        const skip = (page - 1) * limit;

        const wallet = await Wallet.findOne({ userId });
        const totalTransactions = wallet ? wallet.transactions.length : 0;
        const transactions = wallet ? wallet.transactions.slice(skip, skip + limit) : [];

        let cart = await Cart.findOne({userId:req.session.user}).populate("items");
        const wishlist = await Wishlist.findOne({ user_id:req.session.user }).populate("products");

        const totalPages = Math.ceil(totalTransactions / limit);

        res.render('user/profile', {
            title: "Wallet",
            wallet: wallet || { balance: 0 },
            transactions,
            currentPage: page,
            totalPages,
            limit,
            user: req.session.user,
            cart,
            wishlist
        });
    } catch (error) {
        console.error('Error fetching wallet data:', error);
        res.status(500).send('Server error');
    }
};

// Render the add money form
const addMoneyForm = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to login if session not found
        }

        res.render('user/addmoney', { title: "Add Money" });
    } catch (error) {
        console.error('Error rendering add money form:', error);
        res.status(500).redirect('/login'); // Redirect to login on error
    }
};

// Initiate a Razorpay payment order
const initiatePayment = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to login if session not found
        }

        const { amount, note } = req.body;

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const options = {
            amount: amount * 100, // amount in paisa
            currency: 'INR',
            receipt: `receipt_${new Date().getTime()}`,
            notes: {
                description: note || 'Adding money to wallet'
            }
        };

        const order = await razorpayInstance.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error('Error initiating payment:', error); // Log the error details
        res.status(500).json({ error: 'Server error occurred. Please try again later.' });
    }
};

// Verify the Razorpay payment signature and update the wallet
const verifyPayment = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); // Redirect to login if session not found
        }

        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, note } = req.body;

        // Generate the expected signature
        const generated_signature = crypto.createHmac('sha256', razorpayInstance.key_secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            try {
                const userId = req.session.user._id;
                let wallet = await Wallet.findOne({ userId });
                if (!wallet) {
                    wallet = new Wallet({ userId, balance: 0, transactions: [] });
                }

                // Update wallet balance and add transaction
                wallet.balance += amount / 100; // Convert from paisa to rupees
                const transaction = {
                    date: new Date(),
                    amount: amount / 100,
                    message: note || 'Added to wallet',
                    type: 'Credit'
                };

                // Save the transaction and update wallet
                wallet.transactions.push(transaction);
                await wallet.save();

                res.json({ success: true, message: 'Payment verified and wallet updated' });
            } catch (error) {
                console.error('Error updating wallet:', error);
                res.status(500).json({ success: false, message: 'Server error' });
            }
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

module.exports = {
    getWallet,
    addMoneyForm,
    initiatePayment,
    verifyPayment
};
