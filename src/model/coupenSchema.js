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
    purchaseAmount: {
        type: Number,
        default: 0,
    },
    discountAmount: {
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
    expirationDate: {
        type: Date,
        default: Date.now(),
        required: true,
    },

},{
    timestamps: true
})

module.exports = mongoose.model('Coupon', couponSchema)