const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({

    product_name: {
        type: String,
        require: true,
    },
    price: {
        type: Number
    },
  
      onOffer: {
        type: Boolean,
        default: false,
      },
      offerDiscountPrice: {
        type: Number,
        min: 0,
        default: 0
      },
      offerDiscountRate: {
        type: Number,
        min: 0,
        default: 0
      },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    stock: {
        type: Number,
        min: 0,
        requires: true,
        default: 0
    },

    primaryImages: [
        {
            name: {
                type: String,
            },
            path: {
                type: String
            }
        }
    ],
    secondaryImages: [
        {
            name: {
                type: String,
            },
            path: {
                type: String
            }
        }
    ],
    numberOfPurchases: {
        type: Number,
        default: 0
    },


},
    {
        timestamps: true,
        strict: false,
    },
)
module.exports = mongoose.model("Product", productSchema);