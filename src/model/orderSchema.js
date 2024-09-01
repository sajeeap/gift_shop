const { ObjectId } = require('bson');
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {

    orderId: {
      type: String,
      unique: true,
      required: true
    },
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
      return_requested_on: {
        type: Date,
      },
      returnRequested: { type: Boolean, default: false },
      
      
      
      returnNote: {
        type: String,
        default: '' // Optional field for additional notes
      },
      reason: {
        type: String,
  
        enum: ['product_damage', 'parcel_damage', 'not_fitted', 'wrong_item'] // Add other reasons as necessary
      },
      ProductReturned: {
        type: Boolean,
        default: false
      },
      returned_on: {
        type: Date,
      },

      productStatus: {
        type: String,
        
        enum: ["Pending", "Placed", "Processing", "Shipped", "Delivered", "Cancelled", "Return requested", 'Return Approved', 'Return Rejected', 'Return Item Recieved',  "Recieved and Refunded"]
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
      enum: ["COD", "Wallet", "Razor Pay", "Pending"],
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
      enum: ["Pending", "Placed", "Processing", "Shipped", "Delivered", "Cancelled", "Return requested", 'Approved', 'Rejected']
    },
    note: {
      type: String,
      default: '' // Optional field for additional notes
    },
    reason: {
      type: String,

      enum: ['product_damage', 'parcel_damage', 'not_fitted', 'wrong_item'] // Add other reasons as necessary
    },
    returned: {
      type: Boolean,
      default: false
    },
    returned_on: {
      type: Date,
    },
    returnRequested: { type: Boolean, default: false },
    appliedCoupon: {
      type: String,
      default: null
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },
    cancelledBy: {
      type: String,
      enum: ['User', 'Admin'],
      default: null
    },

    razorpayOrderId: {
      type: String,
      default: null
    },
    razorpayPaymentId: {
      type: String,
      default: null
    },

    paymentId: {
      type: String,
      required: false,
    },
  },

  {
    timestamps: true
  }
);

module.exports = mongoose.model("Order", orderSchema);