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
            const itemId = req.query.itemId;
            const userId = req.session.user._id;
    
            if (!orderId) {
                return res.status(400).json({ success: false, message: 'Order ID is required' });
            }
    
            const order = await Order.findOne({ _id: orderId, customer_id: userId })
                .populate('items.product_id'); // Populate the product_id with product details
    
            if (!order || order.status !== 'Delivered') {
                return res.status(404).json({ success: false, message: 'Order not found or not delivered' });
            }

            // Extract the specific item from the order's items array
            const item = order.items.find(item => item._id.toString() === itemId);

            if (!item) {
                return res.status(404).json({ success: false, message: 'Item not found in order' });
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
                item,
                user: req.session.user,
                cart,
                wishlist
            });
        } catch (error) {
            console.error('Error displaying return form:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },
    // createReturnRequest: async (req, res) => {
    //     if (!req.session.user) {
    //         return res.redirect('/login');
    //     }
    
    //     try {
    //         const userId = req.session.user._id;
    //         const { orderId, items, reason, note } = req.body;
    
    //         console.log('Request Body:', JSON.stringify(req.body));
    //         console.log('Order ID:', orderId);
    //         console.log('Items:', items);
    //         console.log('Reason:', reason);
    //         console.log('Note:', note);
    
    //         // Validate required fields
    //         if (!orderId || !reason) {
    //             return res.status(400).json({ success: false, message: 'Missing required fields' });
    //         }
    
    //         // Find the order
    //         const order = await Order.findOne({ _id: orderId, customer_id: userId }).populate('items.product_id');
    //         if (!order) {
    //             return res.status(404).json({ success: false, message: 'Order not found' });
    //         }
    
    //         // Check if the order status allows returns
    //         if (order.status !== 'Delivered') {
    //             return res.status(400).json({ success: false, message: 'Return request can only be made for delivered orders' });
    //         }
    
    //         // Check if the return period has expired
    //         const deliveryDate = new Date(order.delivered_on);
    //         const currentDate = new Date();
    //         const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    //         if (currentDate - deliveryDate > oneWeek) {
    //             return res.status(400).json({ success: false, message: 'Return period has expired' });
    //         }
    
    //         let updated = false;
    
    //         if (items && items.length > 0) {
    //             // Handle return for specific items
    //             items.forEach(itemRequest => {
    //                 if (itemRequest.selected) {
    //                     const item = order.items.find(orderItem => 
    //                         orderItem.product_id._id.toString() === itemRequest.product &&
    //                         orderItem.quantity >= parseInt(itemRequest.quantity) // Ensure quantity check
    //                     );
    
    //                     if (item) {
    //                         item.returnRequested = true;
    //                         item.returnReason = reason;
    //                         item.returnNote = note;
    //                         item.returnQuantity = parseInt(itemRequest.quantity); // Store the quantity being returned
    //                         updated = true;
    //                     }
    //                 }
    //             });
    
    //             if (!updated) {
    //                 return res.status(400).json({ success: false, message: 'No valid items for return' });
    //             }
    //         } else {
    //             // Handle return for the entire order
    //             order.returned = true;
    //             order.reason = reason;
    //             order.note = note;
    //             order.status = "Return requested";
    //         }
    
    //         // Save the updated order
    //         await order.save();
    
    //         res.status(201).json({ success: true, message: 'Return request created successfully' });
    //     } catch (error) {
    //         console.error('Error creating return request:', error);
    //         res.status(500).json({ success: false, message: 'Server error' });
    //     }
    // },
    
    
    
    createReturnRequest: async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        try {
            const userId = req.session.user._id;
            const { orderId, itemId, reason, note } = req.body

            
            
            console.log(" orderId, item, reason, note",orderId, itemId, reason, note);
            
    
            if (!orderId || !itemId || !reason) {
                return res.status(400).json({ success: false, message: 'Missing required fields' });
            }
    
            const order = await Order.findOne({ _id: orderId, customer_id: userId }).populate('items.product_id');
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
    
            if (order.status !== 'Delivered') {
                return res.status(400).json({ success: false, message: 'Return request can only be made for delivered orders' });
            }
            
             // Extract the specific item from the order's items array
             const item = order.items.find(item => item._id.toString() === itemId);

             if (!item) {
                 return res.status(404).json({ success: false, message: 'Item not found in order' });
             }
    
            const deliveryDate = new Date(order.createdAt);
            const currentDate = new Date();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
            if (currentDate - deliveryDate > oneWeek) {
                return res.status(400).json({ success: false, message: 'Return period has expired' });
            }
    
          // Update the item-specific fields
            order.returnRequested = true;
            item.returnRequested = true;
            item.reason = reason;
            item.returnNote = note;
            item.productStatus = 'Return requested';
            item.return_requested_on = new Date();
    
            await order.save();
    
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
