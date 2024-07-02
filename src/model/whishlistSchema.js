const mongoose = require("mongoose");

const whishlistSchema = new mongoose.Schema(
    {
        user_id : {
            type : mongoose.Schema.Types.ObjectId,
            required : true,
            ref:"User"
        },
        product_id : [{
            type : mongoose.Schema.Types.ObjectId,
            required : true,
            ref:"Product"
        }]
    },
    {
        timestamps:true
    }
)

module.exports = mongoose.model("Whishlist", whishlistSchema)