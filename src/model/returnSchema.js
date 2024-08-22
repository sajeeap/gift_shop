const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            
            price: {
                type: Number,
                required: true
            }
        }],
    reason: {
        type: String,
        required: true,
        enum: ['product_damage', 'parcel_damage', 'not_fitted', 'wrong_item'] // Add other reasons as necessary
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    note: {
        type: String,
        default: '' // Optional field for additional notes
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Return', returnSchema);











// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;
// const ObjectId = Schema.ObjectId;

// const returnSchema = new Schema({
//     user_id: {
//         type: ObjectId,
//         ref: 'User'
//     },
//     order_id: {
//         type: ObjectId,
//         ref: 'Order'
//     },
//     product_id: {
//         type: ObjectId,
//         ref: 'Product'
//     },
//     item_id: {
//         type: String,
//     },
//     reason: {
//         type: String,
//     },
//     status: {
//         type: String,
//     },
//     comment: {
//         type: String
//     }
// },{
//     timestamps: true
// });

// module.exports = mongoose.model('Return', returnSchema);
