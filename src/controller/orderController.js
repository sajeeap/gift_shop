const Order = require("../model/orderSchema");
const Return = require("../model/returnSchema")
const cron = require('node-cron');
const mongoose = require('mongoose');
const Product = require("../model/productSchema");
const User = require("../model/userSchema");
const Cart = require("../model/cartSchema");
const Wishlist = require("../model/whishlistSchema");
const adminLayout = "./layouts/adminLayouts";
const Wallet = require("../model/walletSchema");
const crypto = require('crypto');
const razorpayInstance = require("../config/razorPay")
const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')



const generateInvoice = async (order) => {
    const invoicesDir = path.join(__dirname, '..', 'invoices');

    try {
        if (!fs.existsSync(invoicesDir)) {
            fs.mkdirSync(invoicesDir, { recursive: true });
        }
    } catch (err) {
        console.error('Error creating invoices directory:', err);
        throw new Error('Error creating invoices directory');
    }

    const filePath = path.join(invoicesDir, `${order._id}.pdf`);

    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const writeStream = fs.createWriteStream(filePath);

            doc.pipe(writeStream);

            // Add title and invoice header
            doc.fontSize(20).text('GIFT SHOP', { align: 'center' });
            doc.moveDown();
            doc.fontSize(25).text('Invoice', { align: 'center' });
            doc.moveDown();

            // Define column positions
            const columns = {
                index: 50,
                description: 100,
                quantity: 280,
                price: 370,
                amount: 460
            };

            // Table header
            doc.fontSize(12)
                .text('Index', columns.index, 150)
                .text('Description', columns.description, 150)
                .text('Quantity', columns.quantity, 150)
                .text('Price', columns.price, 150)
                .text('Amount', columns.amount, 150);

            // Draw horizontal line below header
            doc.moveTo(columns.index, 170)
                .lineTo(columns.amount + 100, 170)
                .stroke();

            // Table content and total amount calculation
            let position = 190;
            let totalAmount = 0;

            order.items.forEach((item, index) => {
                const itemAmount = item.quantity * item.price;
                totalAmount += itemAmount;

                doc.fontSize(10)
                    .text(index + 1, columns.index, position)
                    .text(item.product_id.product_name || 'Unknown Product', columns.description, position)
                    .text(item.quantity, columns.quantity, position)
                    .text(`₹${item.price.toFixed(2)}`, columns.price, position)
                    .text(`₹${itemAmount.toFixed(2)}`, columns.amount, position);

                // Draw horizontal line after each row
                doc.moveTo(columns.index, position + 15)
                    .lineTo(columns.amount + 100, position + 15)
                    .stroke();

                position += 20;
            });

            // Add the total amount
            position += 20;
            doc.fontSize(12).text('Total:', columns.price, position, { align: 'left' });
            doc.fontSize(12).text(`₹${totalAmount.toFixed(2)}`, columns.amount, position, { align: 'right' });

            // End the PDF document
            doc.end();

            writeStream.on('finish', () => {
                console.log(`Invoice generated successfully at ${filePath}`);
                resolve(filePath);
            });

            writeStream.on('error', (err) => {
                console.error('Error writing PDF to file:', err);
                reject(new Error('Error generating invoice PDF'));
            });
        } catch (err) {
            console.error('Error generating invoice PDF:', err);
            reject(new Error('Error generating invoice PDF'));
        }
    });
};

const cancelPendingOrders = async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours in milliseconds
  
    await Order.updateMany(
      {
        paymentStatus: 'Pending',
        paymentMethod: "Razor Pay",
        createdAt: { $lt: twoHoursAgo }
      },
      { $set: { status: 'Cancelled', paymentStatus: 'Cancelled' } }
    );
};
  
// Schedule this function to run periodically
cron.schedule('0 * * * *', cancelPendingOrders); // Check every hour




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

    cancelWholeOrder: async (req, res) => {
        const { orderId } = req.params;
        try {
            const result = await Order.updateOne(
                { _id: orderId, paymentStatus: 'Pending' },
                { $set: { status: 'Cancelled', paymentStatus: 'Cancelled' } }
            );
            if (result.nModified > 0) {
                res.json({ success: true });
            } else {
                res.json({ success: false });
            }
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }

    },

    cancelOrder: async (req, res) => {
        const { orderId, productId } = req.params;

        console.log("Order ID and Product ID:", orderId, productId);
 
        try {
            // Fetch the order by ID and populate related product data
            const order = await Order.findById(orderId).populate('items.product_id');
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            console.log("Order found in cancelOrder:", order);

            // Find the specific product in the order
            const itemIndex = order.items.findIndex(item => item.product_id._id.toString() === productId);
            if (itemIndex === -1) {
                return res.status(404).json({ error: 'Product not found in the order' });
            }

            const orderProduct = order.items[itemIndex];

            // Only allow cancellation if the order is in a specific status
            if (order.status !== 'Processing' && order.status !== 'Pending' && order.status !== 'Placed') {
                return res.status(400).json({ error: 'Only orders in processing, pending, or confirmed status can be cancelled' });
            }

            // Update the item's status to 'Cancelled' and set the cancellation date
            order.items[itemIndex].status = 'Cancelled';
            order.items[itemIndex].cancelled_on = new Date();

            // If all items in the order are cancelled, update the order status to 'Cancelled'
            const allItemsCancelled = order.items.every(item => item.status === 'Cancelled');
            if (allItemsCancelled) {
                order.status = 'Cancelled';
            }

            // Handle refund logic based on payment method
            if (order.paymentMethod === 'COD') {
                // No refund necessary for COD orders, simply save the order
            } else if (order.paymentMethod === 'Razor Pay') {


                // Add the amount back to the wallet
                let wallet = await Wallet.findOne({ userId: order.customer_id });
                if (!wallet) {
                    wallet = new Wallet({ userId: order.customer_id, balance: 0 });
                }


                const discpercent = order.couponDiscount / order.totalPrice;
                const refundAmount = orderProduct.itemTotal * (1 - discpercent);

                wallet.balance += refundAmount.toFixed(2);
                wallet.transactions.push({
                    amount: refundAmount.toFixed(2),
                    message: 'Refunded to Wallet',
                    type: 'Credit'
                });

                await wallet.save();

            } else if (order.paymentMethod === 'Wallet') {
                // Refund directly to the wallet
                let wallet = await Wallet.findOne({ userId: order.customer_id });
                if (!wallet) {
                    wallet = new Wallet({ userId: order.customer_id, balance: 0 });
                }


                const discpercent = order.couponDiscount / order.totalPrice;
                const refundAmount = orderProduct.itemTotal * (1 - discpercent);

                wallet.balance += refundAmount.toFixed(2);
                wallet.transactions.push({
                    amount: refundAmount.toFixed(2),
                    message: 'Refunded to Wallet',
                    type: 'Credit'
                });

                await wallet.save();
            } else {
                return res.status(400).json({ error: 'Invalid payment method' });
            }

            // Save the updated order
            await order.save();

            // Respond with success
            return res.status(200).json({ success: true, message: 'Order cancelled and refunded successfully' });
        } catch (err) {
            console.error('Error cancelling order:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },




    downloadInvoice: async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        try {
            const orderId = req.params.id;
            const userId = req.session.user._id;

            // Query the order by ID and ensure it belongs to the logged-in user
            const order = await Order.findOne({ _id: orderId, customer_id: userId })
                .populate('items.product_id') // Populate product details if needed
                .exec();

            const filePath = await generateInvoice(order);

            if (fs.existsSync(filePath)) {
                res.download(filePath, `invoice_${order._id}.pdf`, (err) => {
                    if (err) {
                        console.error('Error sending invoice file:', err);
                        res.status(500).json({ success: false, message: 'Error sending invoice file' });
                    }
                    // Optionally, delete the file after sending
                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Error deleting invoice file:', err);
                    });
                });
            } else {
                console.error('Invoice file does not exist:', filePath);
                res.status(500).json({ success: false, message: 'Error generating invoice file' });
            }
        } catch (error) {
            console.error('Error generating invoice:', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    },







    // Admin side
    getOrder: async (req, res) => {
        const locals = {
            title: "Orders",
        };


        try {
            let perPage = 12;
            let page = req.query.page || 1;

            const orders = await Order.find({ returned : false})
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

        const statusOrder = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', "Returned", "Return requested"];

        if (!statusOrder.includes(status)) {
            req.flash('error', 'Invalid status');
            return res.redirect('/admin/orders');
        }

        try {
            const order = await Order.findById(orderId);
            if (order) {
                const currentStatusIndex = statusOrder.indexOf(order.status);
                const newStatusIndex = statusOrder.indexOf(status);

                if (newStatusIndex < currentStatusIndex) {
                    req.flash('error', 'You cannot move the order status backwards.');
                    return res.redirect('/admin/orders');
                }

                order.status = status;

                if (status === 'Cancelled') {
                    order.cancellationReason = 'Seller canceled the order';
                }

                await order.save();
                req.flash('success', 'Order status updated successfully');
                res.redirect('/admin/orders');
            } else {
                req.flash('error', 'Order not found');
                res.redirect('/admin/orders');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            req.flash('error', 'Internal Server Error');
            res.redirect('/admin/orders');
        }
    },

    getReturn: async (req, res) => {
        const locals = {
            title: "Return",
        };


        try {
            let perPage = 12;
            let page = req.query.page || 1;

            const returnOrders = await Order.find( {returnRequested : true}).populate('items.product_id').populate('customer_id').sort({ createdAt: -1 })
                .skip((perPage * page) - perPage)
                .limit(perPage);

            

            const count = await Order.find().countDocuments({});
            const nextPage = parseInt(page) + 1;
            const hasNextPage = nextPage <= Math.ceil(count / perPage);



            res.render("admin/return/return", {
                locals,
                returnOrders,
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

    manageReturnStatus: async (req, res) => {
        const orderId = req.body.order;
        const itemOrderId = req.body.itemOrderId;
        const newStatus = req.body.returnStatus;
    
        // Define valid return statuses in the correct order
        const validReturnStatuses = ["Requested", "Approved", "Rejected", "Recieved and Refunded"];
    
        if (!validReturnStatuses.includes(newStatus)) {
            req.flash('error', 'Invalid return status');
            return res.redirect('/admin/return'); // Redirect to the correct return management page
        }
    
        try {
            const orderItem = await Order.findOne({ _id: orderId });
            const returnItem = orderItem.items.find(item => item.order_id.toString() === itemOrderId);
    
            if (returnItem) {
                const currentStatus = returnItem.productStatus;
    
                // Check if trying to revert back to "Requested" after moving forward
                if (newStatus === 'Requested' && currentStatus !== 'Return requested') {
                    req.flash('error', 'Cannot change status back to Requested once it has been approved, rejected, or refunded');
                    return res.redirect('/admin/return'); // Redirect to the return management page
                }
    
                // Prevent going back from "Approved", "Rejected", or "Recieved and Refunded"
                if (["Approved", "Rejected", "Recieved and Refunded"].includes(currentStatus) && validReturnStatuses.indexOf(newStatus) < validReturnStatuses.indexOf(currentStatus)) {
                    req.flash('error', `Cannot move return status back from ${currentStatus} to ${newStatus}`);
                    return res.redirect('/admin/return'); // Redirect to the return management page
                }
    
                // Update status based on newStatus
                if (newStatus === 'Requested') {
                    returnItem.productStatus = 'Return requested';
                    returnItem.ProductReturned = false;
                } else if (newStatus === 'Approved') {
                    returnItem.productStatus = 'Return Approved';
                    returnItem.ProductReturned = false;
                } else if (newStatus === 'Rejected') {
                    returnItem.productStatus = 'Return Rejected';
                    returnItem.ProductReturned = false;
                } else if (newStatus === 'Recieved and Refunded') {
                    returnItem.productStatus = 'Recieved and Refunded';
                    returnItem.ProductReturned = true;
    
                    if (orderItem.paymentMethod === 'COD') {
                        // No refund necessary for COD orders, simply save the order
                    } else if (orderItem.paymentMethod === 'Razor Pay' || orderItem.paymentMethod === 'Wallet') {
                        // Refund directly to the wallet
                        let wallet = await Wallet.findOne({ userId: orderItem.customer_id });
    
                        if (!wallet) {
                            wallet = new Wallet({ userId: orderItem.customer_id, balance: 0 });
                        }
    
                        const discpercent = orderItem.couponDiscount / orderItem.totalPrice;
                        const refundAmount = returnItem.itemTotal * (1 - discpercent);
    
                        wallet.balance += parseFloat(refundAmount.toFixed(2));
                        wallet.transactions.push({
                            amount: refundAmount.toFixed(2),
                            message: 'Refunded to Wallet from return product',
                            type: 'Credit'
                        });
    
                        await wallet.save();
                    } else {
                        return res.status(400).json({ error: 'Invalid payment method' });
                    }
                }
    
                await orderItem.save();
                req.flash('success', 'Return status updated successfully');
            } else {
                req.flash('error', 'Product not found');
            }
    
            res.redirect('/admin/return'); // Redirect to the return management page
        } catch (error) {
            console.error('Error updating return status:', error);
            req.flash('error', 'Internal Server Error');
            res.redirect('/admin/return'); // Redirect to the return management page
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
