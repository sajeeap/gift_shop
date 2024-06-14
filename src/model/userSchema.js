const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({

    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    joined_date: {
        type: Date,
        default: Date.now,
        immutable: true,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
},
    {
        timestamps: true,
    }
);
module.exports = mongoose.model('User', userSchema);