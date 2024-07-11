const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({

    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },

    payment_method: {
        type: String,
        default: 'COD' 
    },
    status: {
        type: String,
        default: 'Pending' // Initial status, can be updated to 'Paid' upon confirmation
    },
    payment_date: {
        type: Date
    }

}, {
    timestamps: true,
}

)

module.exports = mongoose.model("Payment", paymentSchema);