const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Wishlist = require("../model/whishlistSchema");
const adminLayout = "./layouts/adminLayouts";
const Wallet = require("../model/walletSchema");
const crypto = require('crypto');
const razorpayInstance = require("../config/razorPay")

const mongoose = require("mongoose");



module.exports = {
    // User side
    getUserOrders: async (req, res) => {
        const userId = req.params.userId;
        try {
            let orders = await Order.find({ customer_id: userId })
                .populate("customer_id items.product_id shippingAddress")
                .sort({ createdAt: -1 })
                .exec();

            for (const order of orders) {
                const allCancelled = order.items.every(item => item.status === "Cancelled");
                const allReturned = order.items.every(item => item.status === "Returned");
                const allDelivered = order.items.every(item => item.status === "Delivered");
                const allShipped = order.items.every(item => item.status === "Shipped");
                const allPending = order.items.every(item => item.status === "Pending");

                let status;

                if (allCancelled) {
                    status = "Cancelled";
                } else if (allReturned) {
                    status = "Returned";
                } else if (allDelivered) {
                    status = "Delivered";
                } else if (allShipped) {
                    status = "Shipped";
                } else if (allPending) {
                    status = "Pending";
                }

                if (status) {
                    await Order.updateOne({ _id: order._id }, { $set: { status: status } });
                }
            }

            res.render('user/profile', {
                orders
            });

        } catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    getSingleOrder: async (req, res) => {
        // Implementation needed
        res.send('Single order details implementation needed');
    },

    cancelOrder: async (req, res) => {
        const { orderId, productId } = req.params;

        try {
            // Fetch the order by ID and populate relevant fields
            const order = await Order.findById(orderId).populate('items.product_id');
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }
    
            // Find the item to cancel
            const itemIndex = order.items.findIndex(item => item.product_id._id.toString() === productId);
            if (itemIndex === -1) {
                return res.status(404).json({ error: 'Product not found in the order' });
            }
    
            const orderProduct = order.items[itemIndex];
    
            // Check if the order status is 'Processing'
            if (order.status !== 'Processing' && order.status !== 'Pending') {
                return res.status(400).json({ error: 'Only orders in processing status can be cancelled' });
            }
    
            // Update the status of the specific item to 'Cancelled'
            order.items[itemIndex].status = 'Cancelled';
            order.items[itemIndex].cancelled_on = new Date();
    
            // Convert amount from USD to cents
            const amountInCents = orderProduct.itemTotal * 100; // Convert dollars to cents
    
            // Handle refunds based on payment method
            if (order.paymentMethod !== 'COD') {
                if (order.paymentMethod === 'Razorpay') {
                    // Refund via Razorpay
                    const razorpayInstance = new razorpay({
                        key_id: process.env.RAZOR_PAY_KEY_ID,
                        key_secret: process.env.RAZOR_PAY_KEY_SECRET
                    });
    
                    try {
                        // Create the refund
                        await razorpayInstance.refunds.create({
                            payment_id: order.paymentId, // Replace with the actual payment ID from Razorpay
                            amount: amountInCents, // Amount should be in paise (1 USD = 100 cents)
                            notes: 'Order cancellation refund'
                        });
                    } catch (error) {
                        console.error('Error refunding via Razorpay:', error);
                        return res.status(500).json({ error: 'Error refunding via Razorpay' });
                    }
                } else if (order.paymentMethod === 'Wallet') {
                    // Handle Wallet Refund
                    let user = await User.findById(order.customer_id);
                    if (!user) return res.status(404).json({ error: 'User not found' });
    
                    // Find or create a wallet for the user
                    let wallet = await Wallet.findOne({ userId: user._id });
                    if (!wallet) {
                        wallet = new Wallet({
                            userId: user._id,
                            balance: 0
                        });
                    }
    
                    wallet.balance += orderProduct.itemTotal;
    
                    // Add a transaction record to the wallet
                    wallet.transactions.push({
                        amount: orderProduct.itemTotal,
                        message: 'Order cancellation refund',
                        type: 'Credit'
                    });
    
                    await wallet.save();
                } else {
                    return res.status(400).json({ error: 'Invalid payment method' });
                }
            }
    
            // Save the updated order
            await order.save();
    
            // Respond with success
            return res.status(200).json({ success: true, message: 'Order cancelled successfully' });
        } catch (err) {
            console.error('Error cancelling order:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },





    // Admin side
    getOrder: async (req, res) => {
        const locals = {
            title: "Orders",
        };

        let perPage = 12;
        let page = req.query.page || 1;

        try {
            const orders = await Order.find()
                .populate('items.product_id')
                .populate('customer_id')
                .sort({ createdAt: -1 })
                .skip((perPage * page) - perPage)
                .limit(perPage);

            const count = await Order.countDocuments();

            res.render("admin/orders/order", {
                locals,
                orders,
                current: page,
                pages: Math.ceil(count / perPage),
                layout: adminLayout
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    manageOrderStatus: async (req, res) => {
        const orderId = req.params.id;
        const { status } = req.body;

        try {
            const order = await Order.findById(orderId);
            if (order) {
                order.status = status;
                await order.save();
                res.redirect('/admin/orders');
            } else {
                res.status(404).send('Order not found');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).send('Internal Server Error');
        }
    },

    getAdminOrderDetails: async (req, res) => {
        const locals = {
            title: "Order Details",
        };
        const orderId = req.params.id;

        try {
            const order = await Order.findById(orderId)
                .populate('items.product_id')
                .populate('customer_id');

            res.render("admin/orders/view", {
                locals,
                order,
                layout: adminLayout
            });
        } catch (error) {
            console.error('Error fetching order details:', error);
            res.status(500).send('Internal Server Error');
        }
    }
};
