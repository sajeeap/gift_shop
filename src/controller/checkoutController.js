const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");
const Address = require("../model/addressSchema");
const Wishlist = require("../model/whishlistSchema");
const Order = require("../model/orderSchema");
const Wallet = require("../model/walletSchema"); // Assuming the wallet schema is defined
const crypto = require('crypto');
const razorpayInstance = require("../config/razorPay");

module.exports = {
    getCheckOutPage: async (req, res) => {
        const userId = req.session.user;

        const address = await Address.findOne({
            customer_id: userId,
            default: true,
            delete: false
        });

        let cart = await Cart.findOne({ userId }).populate("items.product_id");
        const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");

        // Fetch wallet balance
        const wallet = await Wallet.findOne({ userId: userId });
        const walletBalance = wallet ? wallet.balance : 0;

        let totalItems = 0;
        let totalPrice = 0;

        if (cart) {
            for (const item of cart.items) {
                let total = 0;
                if (!item.itemTotal) {
                    total = item.price * item.quantity;
                } else {
                    total = item.itemTotal;
                }
                totalPrice += total;
                totalItems += item.quantity;
            }
        }

        res.render("shop/checkout", {
            user: req.session.user,
            address,
            cart,
            wishlist,
            totalPrice,
            totalItems,
            walletBalance // Pass wallet balance to the view
        });
    },

    placeOrder: async (req, res) => {
        try {
            const { paymentoptions, address, useWallet } = req.body;

            if (!paymentoptions) {
                return res.status(400).json({ success: false, message: "Please select a payment method" });
            }
            if (!address) {
                return res.status(400).json({ success: false, message: "Please select an address" });
            }

            let shippingAddress = await Address.findById(address);
            if (!shippingAddress) {
                return res.status(404).json({ success: false, message: "Shipping address not found" });
            }

            const userId = req.session.user._id;
            const user = await User.findById(userId);
            const userCart = await Cart.findOne({ userId });

            if (!user || !userCart) {
                return res.status(404).json({ success: false, message: "User or cart not found" });
            }

            shippingAddress = {
                name: shippingAddress.name,
                house_name: shippingAddress.house_name,
                locality: shippingAddress.locality,
                area_street: shippingAddress.area_street,
                phone: shippingAddress.phone,
                zipcode: shippingAddress.zip_code,
                state: shippingAddress.state,
                landmark: shippingAddress.landmark,
                city: shippingAddress.city,
                address: shippingAddress.address,
                formattedAddress: `${shippingAddress.name}, ${shippingAddress.house_name}(H), ${shippingAddress.locality}, ${shippingAddress.town}, ${shippingAddress.state}, PIN: ${shippingAddress.zip_code}`,
            };

            const status = paymentoptions === "COD" ? "Confirmed" : "Pending";
            const paymentStatus = paymentoptions === "COD" ? "Pending" : "Paid";

            const items = [];
            let totalPrice = 0;

            for (let i = 0; i < userCart.items.length; i++) {
                const item = userCart.items[i];
                const itemTotal = item.price * item.quantity;
                items.push({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price: item.price,
                    itemTotal: itemTotal,
                    order_id: `${userId}-${Date.now()}-${i}`, // Generating a unique order_id
                });
                totalPrice += itemTotal;
            }

            const wallet = await Wallet.findOne({ userId: userId });
            let walletBalance = wallet ? wallet.balance : 0;
            let amountToBePaid = totalPrice;

            // Use wallet balance if selected
            if (useWallet && walletBalance > 0) {
                if (walletBalance >= totalPrice) {
                    walletBalance -= totalPrice;
                    amountToBePaid = 0;
                } else {
                    amountToBePaid -= walletBalance;
                    walletBalance = 0;
                }
                await Wallet.findOneAndUpdate({userId : userId }, { balance: walletBalance });
            }

            const order = new Order({
                customer_id: userId,
                items: items,
                totalPrice: totalPrice,
                paymentMethod: paymentoptions,
                paymentStatus: paymentStatus,
                status: status,
                shippingAddress: shippingAddress,
                amountPaid: totalPrice - amountToBePaid,
                remainingAmount: amountToBePaid
            });

            await order.save();
            await Cart.findOneAndDelete({ userId });

            

            const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");
            let cart = 'cart is empty';

            
            return res.status(201).render("shop/orderConfirm", {
                user: req.session.user,
                order,
                wishlist,
                cart
            });
        } catch (error) {
            console.error("Error placing order:", error);
            return res.status(500).json({ success: false, message: "Failed to place order", error: error.message });
        }
    },

    successOrder: async (req, res) => {
        try {
            const userId = req.session.user || req.session.user._id;
            const user = await User.findOne({ userId });
            if (!user) {
                return res.status(404).send('User not found.');
            }

            const order = await Order.findOne({ customer_id: user._id })
                .sort({ createdAt: -1 })
                .populate('items.product_id') // Assuming you want to populate product details in items
                .lean();

            if (!order) {
                return res.status(404).send('No orders found for this user.');
            }

            res.render("shop/orderConfirm", {
                order: order, // Pass the full order object
                user: user // Optionally pass user details if needed in the template
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Failed to retrieve order.');
        }
    },

    verifyPayment: async (req, res) => {
        try {
            
            const payment_id  = req.body.paymentId;
            

            if (payment_id) {
                
                res.json({ success: true });

            } else {
                res.json({ success: false });
            }        
            

            
        } catch (error) {
            console.error('Error verifying payment:', error);
            res.status(500).send('Internal Server Error');
        }
    },


    
};