const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.ObjectId,
            ref: "User"
        },
        items: [
            {
                product_id: {
                    type: mongoose.Schema.ObjectId,
                    ref: "Product"

                },
                price : {
                    type: Number,
                },
                quantity : {
                    type : Number,
                    required : true,
                    min : [1, "Quantity can't be less than one"]

                },
                itemTotal : {
                    type: Number
                }
            },     
        ]

        ,

        totalPrice : {
            type : Number
        },
        coupon : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Coupon"
        },
        couponDiscount :{
            type : Number,
            default : 0
        }

    },

    {
        timestamps : true
    }

)


module.exports = mongoose.model("Cart", cartSchema)