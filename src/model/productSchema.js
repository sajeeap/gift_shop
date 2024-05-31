const mongoose = require('mongoose');
const { path } = require('../../app');

const Schema = mongoose.Schema;

const productSchema = new Schema({

    product_name: {
        type: String,
        required : true,
        unique: true,
    },
    price: {
      type: Number,
    },

    actualPrice: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    
    category: {
        type: mongoose.Schema.Types.ObjectId,
        required : true,
       
    },

    stock:{
      type:Number,
      min:0,
      requires:true,
      default:0
  },


    description: {
      type: String,
      required: true,
    },
    
    primary_image: {
        name: {
          type: String,
        },
        path: {
          type: String,
        },
      },
      secondary_images: [
        {
          name: {
            type: String,
          },
          path: {
            type: String,
          },
        },
      ],
      
      
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },

},
{
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema)