const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({

    googleId: {
        type: String,
        unique: true,
        sparse: true,
    },

    firstName: {
        type: String,
        required: function() {
            return !this.googleId  // Required if not a Google or Facebook user
        },
    },
    lastName: {
        type: String,
        required: function() {
            return !this.googleId // Required if not a Google or Facebook user
        },
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
       
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
      wallet : {
        type:  mongoose.Schema.Types.ObjectId,
        ref: "Wallet"
      }
},
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('User', userSchema);