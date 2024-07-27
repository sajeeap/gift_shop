const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const couponSchema = new Schema({
    coupon_code: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,

    },
    
    min_purchase: {
        type: Number,
        default: 0,
    },

    discount_amount: {
        type: Number,
        default: 0,
    },
    usedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
    expiry_date: {
        type: Date,
        default: Date.now(),
        required: true,
    },
    


},{
    timestamps: true
})

module.exports = mongoose.model('Coupon', couponSchema)