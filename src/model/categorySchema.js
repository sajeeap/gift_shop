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

},
{
    timestamps: true
});

module.exports = mongoose.model('Category', catogorySchema)