const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const returnSchema = new Schema({
    user_id: {
        type: ObjectId,
        ref: 'User'
    },
    order_id: {
        type: ObjectId,
        ref: 'Order'
    },
    product_id: {
        type: ObjectId,
        ref: 'Product'
    },
    item_id: {
        type: String,
    },
    reason: {
        type: String,
    },
    status: {
        type: String,
    },
    comment: {
        type: String
    }
},{
    timestamps: true
});

module.exports = mongoose.model('Return', returnSchema);
