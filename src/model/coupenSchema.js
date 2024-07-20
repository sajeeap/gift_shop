const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

const coupenSchema = new Schema({
    coupen_code : {
        type : String,
        required : true,
        unique : true
    },
    description : {
        type : String,
        
    }

})