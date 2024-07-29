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
      },
   

    primaryImages:[
        {
            name:{
                type:String,
            },
            path:{
                type:String
            }
        }
    ],
    secondaryImages:[
        {
            name:{
                type:String,
            },
            path:{
                type:String
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