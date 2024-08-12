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
      
          // Check if the order is in 'Processing' or 'Pending' status
          if (order.status !== 'Processing' && order.status !== 'Pending') {
            return res.status(400).json({ error: 'Only orders in processing or pending status can be cancelled' });
          }
      
          // Update the item status to 'Cancelled'
          order.items[itemIndex].status = 'Cancelled';
          order.items[itemIndex].cancelled_on = new Date();
      
          // Check if all items are cancelled, if so, update the overall order status to 'Cancelled'
          const allItemsCancelled = order.items.every(item => item.status === 'Cancelled');
          if (allItemsCancelled) {
            order.status = 'Cancelled';
          }
      
          // Handle refund logic based on payment method
          if (order.paymentMethod === 'COD') {
            // COD orders don't require refund logic, just save the order
          } else if (order.paymentMethod === 'Razor Pay') {
            try {
              await razorpayInstance.refunds.create({
                payment_id: order.paymentId,
                amount: orderProduct.itemTotal * 100, // amount should be in paise
                notes: 'Order cancellation refund'
              });
            } catch (error) {
                console.error('Error refunding via Razorpay:', JSON.stringify(error, null, 2));
              return res.status(500).json({ error: 'Error refunding via Razorpay' });
            }
           

          } else if (order.paymentMethod === 'Wallet') {
            // Handle Wallet refunds
            let wallet = await Wallet.findOne({ userId: order.customer_id });
            if (!wallet) {
              wallet = new Wallet({ userId: order.customer_id, balance: 0 });
            }
      
            wallet.balance += orderProduct.itemTotal;
            wallet.transactions.push({
              amount: orderProduct.itemTotal,
              message: 'Order cancellation refund',
              type: 'Credit'
            });
      
            await wallet.save();
          } else {
            return res.status(400).json({ error: 'Invalid payment method' });
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
      
    

    // cancelOrder: async (req, res) => {
    //     try {
    //         const { orderId, productId } = req.params;
    //         const userId = req.user._id; // Assuming user ID is stored in req.user
    //         const user = await User.findById(userId);
    
    //         if (!user) {
    //             return res.status(404).json({ error: 'User not found' });
    //         }
    
    //         const cancelledBy = user.isAdmin ? 'Admin' : 'User';  // Check if the user is an admin
    
    //         const order = await Order.findById(orderId).populate('items.product_id');
    //         if (!order) {
    //             return res.status(404).json({ error: 'Order not found' });
    //         }
    
    //         const itemIndex = order.items.findIndex(item => item.product_id._id.toString() === productId);
    //         if (itemIndex === -1) {
    //             return res.status(404).json({ error: 'Product not found in the order' });
    //         }
    
    //         const orderProduct = order.items[itemIndex];
    
    //         if (order.status !== 'Processing' && order.status !== 'Pending') {
    //             return res.status(400).json({ error: 'Only orders in processing or pending status can be cancelled' });
    //         }
    
    //         order.items[itemIndex].status = 'Cancelled';
    //         order.items[itemIndex].cancelled_on = new Date();
    //         order.items[itemIndex].cancelledBy = cancelledBy;  // Set cancelledBy on the specific item
    
    //         if (order.paymentMethod !== 'COD') {
    //             if (order.paymentMethod === 'Razorpay') {
    //                 const razorpayInstance = new razorpay({
    //                     key_id: process.env.RAZOR_PAY_KEY_ID,
    //                     key_secret: process.env.RAZOR_PAY_KEY_SECRET
    //                 });
    
    //                 try {
    //                     await razorpayInstance.refunds.create({
    //                         payment_id: order.paymentId,
    //                         amount: orderProduct.itemTotal * 100,
    //                         notes: 'Order cancellation refund'
    //                     });
    //                 } catch (error) {
    //                     console.error('Error refunding via Razorpay:', error);
    //                     return res.status(500).json({ error: 'Error refunding via Razorpay' });
    //                 }
    //             } else if (order.paymentMethod === 'Wallet') {
    //                 let wallet = await Wallet.findOne({ userId: user._id });
    //                 if (!wallet) {
    //                     wallet = new Wallet({
    //                         userId: user._id,
    //                         balance: 0
    //                     });
    //                 }
    
    //                 wallet.balance += orderProduct.itemTotal;
    
    //                 wallet.transactions.push({
    //                     amount: orderProduct.itemTotal,
    //                     message: 'Order cancellation refund',
    //                     type: 'Credit'
    //                 });
    
    //                 await wallet.save();
    //             } else {
    //                 return res.status(400).json({ error: 'Invalid payment method' });
    //             }
    //         }
    
    //         await order.save();
    //         return res.status(200).json({ success: true, message: 'Order cancelled successfully' });
    //     } catch (err) {
    //         console.error('Error cancelling order:', err);
    //         return res.status(500).json({ error: 'Internal server error' });
    //     }
    // },

    


    // Admin side
    getOrder: async (req, res) => {
        const locals = {
            title: "Orders",
        };


        try {
            let perPage = 12;
            let page = req.query.page || 1;

            const orders = await Order.find()
                .populate('items.product_id')
                .populate('customer_id')
                .sort({ createdAt: -1 })
                .skip((perPage * page) - perPage)
                .limit(perPage);

            const count = await Order.find().countDocuments({});
            const nextPage = parseInt(page) + 1;
            const hasNextPage = nextPage <= Math.ceil(count / perPage);



            res.render("admin/orders/order", {
                locals,
                orders,
                current: page,
                perPage,
                pages: Math.ceil(count / perPage),
                count,
                nextPage: hasNextPage ? nextPage : null,
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
    
        // Validate status
        const validStatuses = ['Processing', 'Pending', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).send('Invalid status');
        }
    
        try {
            const order = await Order.findById(orderId);
            if (order) {
                order.status = status;
    
                // Check if the status is set to 'Cancelled' and add a cancellation reason
                if (status === 'Cancelled') {
                    order.cancellationReason = 'Seller canceled the order';
                }
    
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
