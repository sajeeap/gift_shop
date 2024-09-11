const mongoose = require('mongoose');
const { path } = require('../../app');

const Schema = mongoose.Schema;

const catogorySchema = new Schema({

    name: {
        type: String,
        required : true,
        unique: true,
    },
    

    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    
    description: {
        type: String,
        maxlength: 500  // Example constraint for max length
    },

    //   image : {
    //     filename : String,
    //     originalname : String,  // Corrected typo
    //     path: String
    // },
    images: [
        {
            name: {
                type: String,
            },
            path: {
                type: String
            }
        }
    ],

  
    onOffer: {
        type: Boolean,
        default: false,
      },
      offerDiscountRate: {
        type: Number,
        min: 0,
        default: 0,
      },

},
{
    timestamps: true
});

module.exports = mongoose.model('Category', catogorySchema)