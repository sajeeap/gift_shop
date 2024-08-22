const Return = require('../model/returnSchema');
const Order = require('../model/orderSchema');

module.exports = {
    getReturnForm : async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
    
        try {
            const orderId = req.params.orderId;
            const userId = req.session.user._id;
            const order = await Order.findOne({ _id: orderId, user: userId }).populate('items.product');
    
            if (!order || order.orderStatus !== 'Delivered') {
                return res.status(404).json({ success: false, message: 'Order not found or not delivered' });
            }
    
            const deliveryDate = new Date(order.deliveryDate);
            const currentDate = new Date();
            const twoWeeksInMillis = 7 * 24 * 60 * 60 * 1000;
    
            if (currentDate - deliveryDate > twoWeeksInMillis) {
                return res.status(400).json({ success: false, message: 'Return period has expired' });
            }
    
            res.render('user/profile', {
                title: "Return Order",
                order
            });
        } catch (error) {
            console.error('Error displaying return form:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },

    createReturnRequest : async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }
    
        try {
            const userId = req.session.user._id;
            const { orderId, items, reason, note } = req.body;
    
            // Log the entire request body for debugging
            console.log('Received Request Body:', req.body);
            console.log('userId:', userId);
            console.log('orderId:', orderId);
    
            const order = await Order.findOne({ _id: orderId, customer_id: userId }).populate('items.product_id');
    
            console.log('order:', order);
    
            if (!order) {
                return res.status(404).json({ success: false, message: 'Order not found' });
            }
    
            if (order.status !== 'Delivered') {
                return res.status(400).json({ success: false, message: 'Return request can only be made for delivered orders' });
            }
    
            const deliveryDate = new Date(order.delivered_on);
            const currentDate = new Date();
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
            if (currentDate - deliveryDate > oneWeek) {
                return res.status(400).json({ success: false, message: 'Return period has expired' });
            }
    
            const returnItems = (items || []).filter(item => item.selected).map(item => ({
                product: item.product,
                size: item.size,
                quantity: item.quantity,
                price: item.price
            }));

            console.log("return>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",returnItems);
            
    
            if (returnItems.length === 0) {
                return res.status(400).json({ success: false, message: 'No items selected for return' });
            }
    
            const returnRequest = new Return({
                user: userId,
                order: orderId,
                items: returnItems,
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
}