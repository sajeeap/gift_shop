const Return = require('../model/returnSchema');
const Order = require('../model/orderSchema');
const Wallet = require("../model/walletSchema");
const Cart = require("../model/cartSchema");
const Wishlist = require("../model/whishlistSchema")
module.exports = {
   

    showReturnForm: async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
    
        try {
            const orderId = req.query.orderId;
            const userId = req.session.user._id;
    
            if (!orderId) {
                return res.status(400).json({ success: false, message: 'Order ID is required' });
            }
    
            const order = await Order.findOne({ _id: orderId, customer_id: userId })
                .populate('items.product_id'); // Populate the product_id with product details
    
            if (!order || order.status !== 'Delivered') {
                return res.status(404).json({ success: false, message: 'Order not found or not delivered' });
            }
    
            const deliveryDate = new Date(order.createdAt);
            const currentDate = new Date();
            const twoWeeksInMillis = 14 * 24 * 60 * 60 * 1000;
    
            if (currentDate - deliveryDate > twoWeeksInMillis) {
                return res.status(400).json({ success: false, message: 'Return period has expired' });
            }
    
            let cart = await Cart.findOne({ userId: req.session.user }).populate("items");
            const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");
    
            res.render('user/returnForm', {
                title: "Return Order",
                order,
                user: req.session.user,
                cart,
                wishlist
            });
        } catch (error) {
            console.error('Error displaying return form:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },
    
    createReturnRequest: async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        try {
            const userId = req.session.user._id;
            const { orderId, items, reason, note } = req.body

            console.log(JSON.stringify(req.body));
            
            console.log(" orderId, items, reason, note",orderId, items, reason, note);
            
    
            if (!orderId || !items || !reason) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
    
            const order = await Order.findOne({ _id: orderId, customer_id: userId }).populate('items.product_id');
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
    
            if (order.status !== 'Delivered') {
                return res.status(400).json({ success: false, message: 'Return request can only be made for delivered orders' });
            }
    
            const deliveryDate = new Date(order.createdAt);
            const currentDate = new Date();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
            if (currentDate - deliveryDate > oneWeek) {
                return res.status(400).json({ success: false, message: 'Return period has expired' });
            }
    
            // // Ensure items are valid and match order items
            // const returnItems = items.map(item => {
            //     try {
            //         // Parse the product JSON string if necessary
            //         const parsedProduct = typeof item.product === 'string' ? JSON.parse(item.product) : item.product;
            //         return {
            //             product: parsedProduct._id, // Use product ID
            //             quantity: parseInt(item.quantity, 10),
            //             price: parseFloat(item.price)
            //         };
            //     } catch (e) {
            //         console.error('Error parsing item product data:', e);
            //         return null; // Invalidate item if parsing fails
            //     }
            // }).filter(item => item && item.product && item.quantity && item.price); // Filter out invalid items
    
            // if (returnItems.length === 0) {
            //     return res.status(400).json({ success: false, message: 'No items selected for return' });
            // }
    
            const returnRequest = new Return({
                user: userId,
                order: orderId,
                items,
                reason,
                note
            });
    
            await returnRequest.save();
    
            res.status(201).json({ success: true, message: 'Return request created successfully' });
        } catch (error) {
            console.error('Error creating return request:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },
    
    
   //admin
   
    
    
    
    
   // Create return request
//    createReturnRequest: async (req, res) => {
//     if (!req.session.user) {
//         return res.redirect('/login');
//     }

//     try {
//         const userId = req.session.user._id;
//         const { orderId, items, reason, note } = req.body;

//         if (!orderId || !items || !reason) {
//             return res.status(400).json({ success: false, message: 'Missing required fields' });
//         }

//         // Find the order
//         const order = await Order.findOne({ _id: orderId, customer_id: userId }).populate('items.product_id');
//         if (!order) {
//             return res.status(404).json({ success: false, message: 'Order not found' });
//         }

//         // Check order status
//         if (order.status !== 'Delivered') {
//             return res.status(400).json({ success: false, message: 'Return request can only be made for delivered orders' });
//         }

//         // Calculate return period
//         const deliveryDate = new Date(order.createdAt);
//         const currentDate = new Date();
//         const oneWeek = 7 * 24 * 60 * 60 * 1000;

//         if (currentDate - deliveryDate > oneWeek) {
//             return res.status(400).json({ success: false, message: 'Return period has expired' });
//         }

//         // Validate and format return items
//         const returnItems = items.map(item => {
//             console.log('Received item data:', item); // Log item data for debugging
//             if (!item.product || !item.quantity || !item.price) {
//                 throw new Error('Invalid item data');
//             }
//             return {
//                 product: item.product,
//                 quantity: parseInt(item.quantity, 10),
//                 price: parseFloat(item.price)
//             };
//         });

//         if (returnItems.length === 0) {
//             return res.status(400).json({ success: false, message: 'No items selected for return' });
//         }

//         const returnRequest = new Return({
//             user: userId,
//             order: orderId,
//             items: returnItems,
//             reason,
//             note
//         });

//         await returnRequest.save();

//         res.status(201).json({ success: true, message: 'Return request created successfully' });
//     } catch (error) {
//         console.error('Error creating return request:', error);
//         res.status(500).json({ success: false, message: 'Server error', error: error.message });
//     }
// },



    
    
    
    
    // Get all return requests for a user
    getUserReturnRequests : async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
    
        try {
            const userId = req.session.user._id;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10; // Default to 10 return requests per page
            const skip = (page - 1) * limit;
    
            const totalReturnRequests = await Return.countDocuments({ user: userId }); // Count total return requests
            const returnRequests = await Return.find({ user: userId })
                .populate('order items.product')
                .sort({ createdAt: -1 }) // Sort return requests by date
                .skip(skip)
                .limit(limit);

                console.log("retuenreq.............................", returnRequests);
                
    
            const totalPages = Math.ceil(totalReturnRequests / limit);
    
            res.render('user/returns', {
                title: "Return Requests",
                returnRequests,
                currentPage: page,
                totalPages,
                limit
            });
        } catch (error) {
            console.error('Error fetching return requests:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
    
}

//admin