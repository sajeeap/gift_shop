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
                ref: "User",
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: [1, `Quantity Can't be less than 1`],
              },
              productDetails: {
                name : {
                    type : String,                  
                },
                quantity : {
                    type : Number,                   
                },
                price : {
                    type : Number,                   
                }
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
        }]
    },

    {
        timestamps: true
    }

)


module.exports = mongoose.model("Order", orderSchema)