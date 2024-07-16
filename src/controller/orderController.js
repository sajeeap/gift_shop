const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");
const User = require("../model/userSchema")
const Cart = require("../model/cartSchema");
const Wishlist = require("../model/whishlistSchema")
const adminLayout = "./layouts/adminLayouts";


const mongoose = require("mongoose");

module.exports = {
    //user side

    getUserOrders: async (userId) => {
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

            return orders;

        } catch (error) {
            console.error('Error fetching orders:', error);
            throw error;
        }
    },

    // getUserOrders : async (req, res) => {
    //     try {
    //         const userId = req.session.user._id || req.session.user;
    //         let user = await User.findById(userId);

    //         let orders = await Order.find({ customer_id: userId })
    //             .populate("customer_id items.product_id  shippingAddress ")
    //             .sort({ createdAt: -1 })
    //             .exec();

    //             console.log("order1111111111111111111111111111111111111111111111111111111111111111111", or);

    //             for( const order of orders){
    //                 const allCancelled = order.items.every(
    //                     (item)=> item.status === "Cancelled"
    //                 )
    //                 const allReturned = order.items.every(
    //                     (item)=> item.status === "Returned"
    //                 )
    //                 const allDelivered = order.items.every(
    //                     (item)=> item.status === "Delivered"
    //                 )

    //                 const allShipped = order.items.every( (item)=> item.status === "Shipped")
    //                 const allPending = order.items.every( (item)=> item.status ==="Pending" )

    //                 let status;

    //                 if(allCancelled){
    //                     status = "Cancelled"
    //                 }else if (allReturned){
    //                     status = "Returned"
    //                 }else if (allDelivered){
    //                     status = "Delivered"
    //                 }else if (allShipped){
    //                     status = "Shipped"
    //                 }else if (allPending){
    //                     status = "Failed"
    //                 }

    //                 if(status){
    //                     await Order.updateOne({ _id : order._id}, {$set : { status : status}})
    //                 }
    //             }

    //             res.render("user/profile", {
    //                 ordersDetails,

    //             })

    //     } catch (error) {

    //     }
    // },

    getOrderDetails: async (req, res) => {
        console.log(res);
        try {
            const orderId = req.params.orderId;
            const order = await Order.findById(orderId).populate("items.product_id");

            if (!order) {
                return res.status(404).json({ success: false, message: "Order not found" });
            }

            res.json(order);


        } catch (error) {
            console.error("Error fetching order details:", error);
            res.status(500).json({ success: false, message: "Failed to fetch order details" });
        }
    },

    getSingleOrder: async (req, res) => {




    },

    cancelOrders: async (req, res) => {


    },



    //Admin

    getOrder: async (req, res) => {

        const locals = {
            title: "Orders",
        };

        let perPage = 12;
        let page = req.query.page || 1;
        const orders = await Order.aggregate([{ $sort: { createdAt: -1 } }])
            

        res.render("admin/orders/order", {

            locals,
            orders,
           

            layout: adminLayout

        }

        )

    }

}


