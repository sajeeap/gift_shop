const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

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
      referralCode: {
        type: String,
      },
      referralToken: {
        type: ObjectId,
      },
      successfullRefferals: [{
        date: {
          type: Date,
          default: Date.now,
        },
        username: {
          type: String,
        },
        status: {
          type: String,
        }
      }],
      refferalRewards: {
        type: Number,
        default: 0,
        min: 0,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
      wallet : {
        type:  mongoose.Schema.Types.ObjectId,
        ref: "Wallet"
      },
      wishlist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WishList",
      },
},
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('User', userSchema);