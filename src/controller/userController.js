const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");
const User = require("../model/userSchema")
const bcrypt = require('bcrypt');
const Address = require("../model/addressSchema")
const Wishlist = require("../model/whishlistSchema")
const Orders = require("../model/orderSchema")
const Wallet = require("../model/walletSchema");
const Cart = require("../model/cartSchema");
const { getUserOrders } = require('../controller/orderController');
const crypto = require('crypto');
const razorpayInstance = require("../config/razorPay");



const setDefaultAddress = async (req, res) => {
    try {
        const { addressId } = req.body;
        const customerId = req.session.user._id;

        await Address.updateMany({ customer_id: customerId, default: true }, { $set: { default: false } });
        await Address.findByIdAndUpdate(addressId, { $set: { default: true } })

        res.status(200).json({ success: true, message: "Default address set successfully" })
    } catch (error) {
        console.error("Error setting default address", error);
        res.status(500).json({ success: false, message: "Server Error" });

    }

}

function generateRefferalCode(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let referralCode = '';
    for (let i = 0; i < length; i++) {
        referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return referralCode;
  }

module.exports = {

    //profile
    getProfile: async (req, res) => {
    try {
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        if (!user.referralCode) {
            const refferalCode = generateRefferalCode(8);
            user.referralCode = refferalCode;
            await user.save();
        }

        const successfullRefferals = user.successfullRefferals.reverse();

        if (!user) {
            return res.status(404).send('User not found');
        }

        let cart = await Cart.findOne({ userId: req.session.user }).populate("items");
        const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");

        // Get Wallet with Pagination
        const wallet = await Wallet.findOne({ userId });
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // Ensure transactions are in descending order by date
        const transactions = wallet 
            ? wallet.transactions.reverse().slice(skip, skip + limit) 
            : [];

        const totalTransactions = wallet ? wallet.transactions.length : 0;
        const totalPages = Math.ceil(totalTransactions / limit);

        // Get Addresses
        const addresses = await Address.find({
            customer_id: userId,
            delete: false
        });

        // Get Orders
        const orders = await Orders.find({
            customer_id: userId
        }).populate('items.product_id')
            .sort({ createdAt: -1 })
            .exec();

        if (!addresses) {
            throw new Error('No addresses found for the user.');
        }

        // Check if a specific order is requested for return
        const orderId = req.query.returnOrderId;  // Assuming the order ID for return is passed via query
        let returnOrder = null;

        if (orderId) {
            const order = await Orders.findOne({ _id: orderId, customer_id: userId }).populate('items.product_id');

            if (order && order.orderStatus === 'Delivered') {
                const deliveryDate = new Date(order.createdAt);
                const currentDate = new Date();
                const twoWeeksInMillis = 14 * 24 * 60 * 60 * 1000;

                if (currentDate - deliveryDate <= twoWeeksInMillis) {
                    returnOrder = order;  // Only set if return is allowed
                } else {
                    console.warn('Return period has expired');
                }
            } else {
                console.warn('Order not found or not delivered');
            }
        }

        res.render('user/profile', {
            user,
            addresses,
            orders,
            cart,
            wishlist,
            wallet: wallet || { balance: 0, transactions: [] },
            transactions,
            currentPage: page,
            totalPages,
            limit,
            referralCode: user.referralCode,
            successfullRefferals,
            returnOrder  // Include the return order details if applicable
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).send('An error occurred while fetching the profile');
    }
},


    // getProfile: async (req, res) => {
    //     try {
    //         const userId = req.session.user._id;
    //         const user = await User.findById(userId);
    
    //         if (!user.referralCode) {
    //             const refferalCode = generateRefferalCode(8);
    //             user.referralCode = refferalCode;
    //             await user.save();
    //         }
    
    //         const successfullRefferals = user.successfullRefferals.reverse();
    
    //         if (!user) {
    //             return res.status(404).send('User not found');
    //         }
    
    //         let cart = await Cart.findOne({ userId: req.session.user }).populate("items");
    //         const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");
    
    //         // Get Wallet with Pagination
    //         const wallet = await Wallet.findOne({ userId });
    //         const page = parseInt(req.query.page, 10) || 1;
    //         const limit = parseInt(req.query.limit, 10) || 10;
    //         const skip = (page - 1) * limit;
    
    //         // Ensure transactions are in descending order by date
    //         const transactions = wallet 
    //             ? wallet.transactions.reverse().slice(skip, skip + limit) 
    //             : [];
    
    //         const totalTransactions = wallet ? wallet.transactions.length : 0;
    //         const totalPages = Math.ceil(totalTransactions / limit);
    
    //         // Get Addresses
    //         const addresses = await Address.find({
    //             customer_id: userId,
    //             delete: false
    //         });
    
    //         // Get Orders
    //         const orders = await Orders.find({
    //             customer_id: userId
    //         }).populate('items.product_id')
    //             .sort({ createdAt: -1 })
    //             .exec();
    
    //         if (!addresses) {
    //             throw new Error('No addresses found for the user.');
    //         }
    
    //         res.render('user/profile', {
    //             user,
    //             addresses,
    //             orders,
    //             cart,
    //             wishlist,
    //             wallet: wallet || { balance: 0, transactions: [] },
    //             transactions,
    //             currentPage: page,
    //             totalPages,
    //             limit,
    //             referralCode: user.referralCode,
    //             successfullRefferals
    //         });
    
    //     } catch (error) {
    //         console.error('Error fetching profile:', error);
    //         res.status(500).send('An error occurred while fetching the profile');
    //     }
    // },
    

    // getProfile: async (req, res) => {

    //     try {
    //         const userId = req.session.user._id;
    //         const user = await User.findById(userId);

            
    //     if(!user.referralCode){
    //         const refferalCode = generateRefferalCode(8);
      
    //         user.referralCode = refferalCode;
    //         await user.save();
    //       }
      
    //       console.log(user);
      
    //       successfullRefferals = user.successfullRefferals.reverse();

    //         if (!user) {
    //             return res.status(404).send('User not found');
    //         }

    //         let cart = await Cart.findOne({ userId: req.session.user }).populate("items");
    //         const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");

    //         // Get Wallet
    //         const wallet = await Wallet.findOne({ userId });

    //         //Get Addresses
    //         const addresses = await Address.find({
    //             customer_id: userId,
    //             delete: false
    //         });

    //         //Get Orders
    //         const orders = await Orders.find({
    //             customer_id: userId
    //         }).populate('items.product_id')
    //             .sort({ createdAt: -1 })
    //             .exec();

    //         // Get Orders using the getUserOrders function
    //         // const orders = await getUserOrders(userId);



    //         if (!addresses) {
    //             throw new Error('No addresses found for the user.');
    //         }

    //         res.render('user/profile', {
    //             user,
    //             addresses,
    //             orders,
    //             cart,
    //             wishlist,
    //             wallet: wallet || { balance: 0, transactions: [] },
    //             refferalCode: user.referralCode,
    //            successfullRefferals


    //         });

    //     } catch (error) {

    //         console.error('Error fetching profile:', error);
    //         res.status(500).send('An error occurred while fetching the profile');
    //     }

    // },

    editProfile: async (req, res) => {
        try {
            const userId = req.session.user; // Retrieve userId from session

            // Find user by userId
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Update user's profile 
            const { firstName, lastName } = req.body;

            user.firstName = firstName || user.firstName;
            user.lastName = lastName || user.lastName;

            await user.save();

            // Send success response
            res.status(200).json({ message: 'Profile updated successfully' });
        } catch (error) {
            console.error('Error updating profile:', error);

            res.status(500).json({
                message: 'An error occurred while updating the profile',
                error: error.message,
            });
        }
    },


    //change password 
    changePassword: async (req, res) => {

        const { currentPassword, newPassword, confirmPassword } = req.body;

        try {
            // Check if the new passwords match
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ success: false, message: 'New passwords do not match' });
            }

            // Retrieve the user ID from the session
            const userId = req.session.user;

            // Find the user by ID
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Check if the current password is correct
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Current password is incorrect' });
            }

            // Validate new password complexity (optional, can be done client-side)
            if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 8 characters long and contain at least one uppercase letter and one digit'
                });
            }

            // Hash the new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 12);

            // Update the user's password
            user.password = hashedNewPassword;
            await user.save();

            // Send success response
            return res.status(200).json({ success: true, message: 'Password successfully changed' });

        } catch (error) {
            console.error('Error changing password:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while changing the password' });
        }


    },


    //whishlist

    getWishlist: async (req, res) => {
        try {
            const locals = {
                title: "Wishlist",
            };

            if (!(req.session.user || req.session.user._id)) {
                console.error("User not logged in or session expired!");
                return res.status(401).json({ message: "User not logged in or session expired" });
            }

            const user = await User.findById(req.session.user._id);
            if (!user) {
                console.error("User not found!");
                return res.status(404).json({ message: "User not found!" });
            }

            const wishlist = await Wishlist.findOne({ user_id: user._id }).populate("products");
            let cart = await Cart.findOne({ userId: req.session.user }).populate("items");


            let products;
            if (wishlist && wishlist.products) {
                products = wishlist.products;
            } else {
                products = [];
            }



            res.render("user/wishlist", {
                locals,
                wishlist,
                products,
                user,
                cart
            });

        } catch (error) {
            console.error("Error fetching wishlist", error.message);
            res.status(500).json({ message: "Server error" });
        }
    },

    addToWishlist: async (req, res) => {
        try {



            const userId = req.session.user._id || req.session.user
            if (!userId) {
                return res.status(401).json({ success: false, message: "User not logged in or session expired" });
            }

            let wishlist = await Wishlist.findOne({ user_id: userId });
            if (!wishlist) {
                wishlist = new Wishlist({ user_id: userId, products: [] });
            }

            const productId = req.body.productId;
            if (wishlist.products.includes(productId)) {
                return res.status(400).json({ success: false, message: "Product already in the wishlist" });
            }

            wishlist.products.push(productId);
            await wishlist.save();

            res.status(200).json({ success: true, message: "Product added to wishlist successfully" });

        } catch (error) {
            console.error("Error adding product to wishlist", error);
            res.status(500).json({ success: false, message: "Server Error" });
        }
    },


    removeFromWishlist: async (req, res) => {
        try {
            const userId = req.session.user._id;
            if (!userId) {
                return res.status(401).json({ success: false, message: "User not logged in or session expired" });
            }

            const { productId } = req.body;

            const wishlist = await Wishlist.findOne({ user_id: userId });
            if (!wishlist) {
                return res.status(404).json({ success: false, message: "Wishlist not found" });
            }

            wishlist.products.pull(productId);
            await wishlist.save();

            res.status(200).json({ success: true, message: "Product removed successfully!" });

        } catch (error) {
            console.error("Error removing product from wishlist", error);
            res.status(500).json({ success: false, message: "Server Error" });
        }
    },

    //wallet

    getWallet: async (req, res) => {
        try {
            if (!req.session.user || !req.session.user._id) {
                return res.redirect('/login'); // Redirect to login if session not found
            }

            const userId = req.session.user._id;
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 transactions per page
            const skip = (page - 1) * limit;

            // Fetch wallet data
            const wallet = await Wallet.findOne({ userId });


            const totalTransactions = wallet ? wallet.transactions.length : 0;
            const transactions = wallet ? wallet.transactions.slice(skip, skip + limit) : [];

            // Fetch other necessary data
            let cart = await Cart.findOne({ userId }).populate("items");
            const wishlist = await Wishlist.findOne({ user_id: userId }).populate("products");

            const totalPages = Math.ceil(totalTransactions / limit);

            // Render the wallet page with the data
            res.render('user/profile', {
                title: "Wallet",
                wallet: wallet || { balance: 0, transactions: [] },
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
    },

    addMoney: async (req, res) => {
        const { amount, currency } = req.body;

        if (!amount || !currency) {
            return res.status(400).json({ error: 'Invalid request' });
        }



        try {

            

            const options = {
                amount: amount * 100, // Convert to paise or cents
                currency: currency, // Use currency from request
                receipt: 'receipt_order_' + new Date().getTime(),
                payment_capture: '1'
            };


            const order = await razorpayInstance.orders.create(options);
            res.json({
                amount: order.amount,
                orderId: order.id,
                currency: order.currency
            });
        } catch (error) {
            console.error('Error creating Razorpay order:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    verifyPayment: async (req, res) => {
        try {
            const { orderId, paymentId, signature, amount } = req.body;
            console.log("orderid|||||||||||||||||||||||||||||||||||||||||||",orderId);
            
    
            const userId = req.session.user._id;
    
            if (!orderId || !paymentId || !signature || !amount) {
                return res.status(400).json({ error: 'Invalid request' });
            }
    
            // Generate signature
            const generatedSignature = crypto.createHmac('sha256', process.env.RAZOR_PAY_KEY_SECRET)
                .update(orderId + "|" + paymentId)
                .digest('hex');
    
            if (generatedSignature === signature) {
                // Payment verified, update wallet balance
                let wallet = await Wallet.findOne({ userId });
                if (!wallet) {
                    wallet = new Wallet({ userId, balance: 0, transactions: [] });
                    await wallet.save();
                }
                
                wallet.balance += parseFloat(amount); // Update balance once
                wallet.transactions.push({
                    amount: parseFloat(amount),
                    date: new Date(),
                    type: 'Credit',
                    orderId: orderId,
                    paymentId: paymentId
                });
                await wallet.save();
    
                res.json({ success: true });
            } else {
                res.json({ success: false });
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            res.status(500).send('Internal Server Error');
        }
    },


    //referral

   
    




    //Address

    getAddress: async (req, res) => {
        try {
            if (!req.session.user || !req.session.user._id) {
                throw new Error('User not logged in or session expired.');
            }

            const addresses = await Address.find({
                customer_id: req.session.user._id,
                delete: false
            });

            if (!addresses) {
                throw new Error('No addresses found for the user.');
            }

            res.render("user/profile", {
                addresses,
                user: req.session.user
            });
        } catch (err) {
            console.error('Error fetching addresses:', err);
            res.status(500).json({ message: 'Server Error' });
        }
    },
    addAddress: async (req, res) => {
        try {
            const userId = req.session.user._id;

            const address = new Address({
                customer_id: userId,
                name: req.body.name,
                address_type: req.body.addressType,
                zip_code: req.body.zipCode,
                locality: req.body.locality,
                house_name: req.body.houseName,
                area_street: req.body.areaStreet,
                town: req.body.town,
                state: req.body.state,
                landmark: req.body.landmark
            });

            await address.save();
            return res.status(200).json({ success: true, message: 'Address added successfully' });
        } catch (err) {
            console.error('Error adding address:', err);
            res.status(500).json({ success: false, message: 'Failed to add address' });
        }
    },
    editAddress: async (req, res) => {
        try {
            const userId = req.session.user._id;

            const addressId = req.body.addressId;
            const updateAddress = {
                customer_id: userId,
                name: req.body.name,
                address_type: req.body.addressType,
                zip_code: req.body.zipCode,
                locality: req.body.locality,
                house_name: req.body.houseName,
                area_street: req.body.areaStreet,
                town: req.body.town,
                state: req.body.state,
                landmark: req.body.landmark
            };

            await Address.findByIdAndUpdate(addressId, updateAddress, { new: true });
            return res.status(200).json({ success: true, message: 'Address updated successfully' });
        } catch (error) {
            console.error('Error editing address:', error);
            res.status(500).json({ success: false, message: 'Failed to edit address' });
        }
    },
    deleteAddress: async (req, res) => {
        try {
            const addressId = req.body.addressId;

            await Address.findByIdAndDelete(addressId);
            return res.status(200).json({ success: true, message: "Address deleted successfully !!!" })
        } catch (err) {
            console.error('Error deleting address:', err);
            res.status(500).json({ success: false, message: 'Failed to delete address' });
        }
    },


    setDefaultAddress


}