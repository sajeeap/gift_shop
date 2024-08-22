const mongoose = require('mongoose');
const productModel = require('../models/products');

const orderSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    products:[{
        productId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Product'
        },
        quantity:{
            type:Number
        },
        productTotalPrice:{
            type:Number,
        },
        orderStatus:{
            type: Boolean,
            default: false,
         },
         returned:{
             type: Boolean,
             default:false
         },
         orderValid:{
             type:Boolean,
             default: true
         },
         deliveredAt: {
            type: Date,
         },
         status: {
            type: String,
            enum: [ "Pending", "Shipped", "Delivered", "Processing", "Canceled", "Returned" ]
         }
    }],
    address: {
        name: {
            type: String
        },
        email: {
            type: String,
        },
        phone: {
            type: String, 
        },
        pincode: {
            type: Number,
        },
        state: {
            type: String, 
        },
        country: {
            type: String,
        },
        altphone: {
            type: String,
        },
        city: {
            type: String, 
        },
        landmark: {
            type: String, 
    }},
    paymentMethod: {
        type: String,
        enum: [ "COD", "wallet", "razorpay", "Pending" ],
    },
    orderNotes: {
        type: String
    },
    originalPrice: {
        type: Number,
        default: 0,
    },
    totalPrice:{
        type:Number
    },
    orderDate:{
        type:Date,
        default:Date.now
    },
    couponUsed: {
        type: String,
    },
    deliveredAt: {
        type: Date,
        // default: Date.now
     },
     pending: {
        type: Boolean,
        default: false
     },
     rzr_orderId: {
        type: String,
        default: "",
     }
});

const orderModel = new mongoose.model( 'Order', orderSchema );
module.exports = orderModel;

