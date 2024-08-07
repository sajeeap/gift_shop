const { ObjectId } = require('bson');
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    customer_id: {
      type: ObjectId,
      ref: "User",
      required: true
    },
    items: [{
      product_id: {
        type: ObjectId,
        ref: "Product",
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, `Quantity Can't be less than 1`],
      },
      
      price: {
        type: Number,
        required: true,
      },
      itemTotal: {
        type: Number,
        required: true,
      },
      order_id: {
        type: String,
        required: true,
      },
      status: {
        type: String,
      },
      payment_status: {
        type: String,
      },
      returnReason: {
        type: String,
      },
      shipped_on: {
        type: Date,
      },
      out_for_delivery: {
        type: Date,
      },
      delivered_on: {
        type: Date,
      },
      cancelled_on: {
        type: Date,
      },
      returned_on: {
        type: Date,
      },
    }],
    shippingAddress: {
      name: {
        type: String,
      },
      house_name: {
        type: String,
      },
      locality: {
        type: String,
      },
      area_street: {
        type: String,
      },
      phone: {
        type: String,
      },
      zipcode: {
        type: Number,
      },
      state: {
        type: String,
      },
      landmark: {
        type: String,
      },
      city: {
        type: String,
      },
      address: {
        type: String,
      },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedTotalPrice: {
      type: Number,
      default: 0,
    },
  
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "COD", "Failed", "Refunded", "Cancelled"],
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
    appliedCoupon: { 
      type: String,
      default: null
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order", orderSchema);
