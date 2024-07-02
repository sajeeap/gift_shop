const { ObjectId } = require("bson");
const mongoose = require("mongoose");

const addressSchema  = new mongoose.Schema(
    {
        customer_id : {
            type :ObjectId,
            required : true
        },
        name : {
            type : String,
            required : true
        },

        address_type : {
            type :String,
            required : true
        },
        zip_code : {
            type :String,
            required: true
        },
        locality : {
            type : String,
            required : true
        },
        house_name : {
            type :String,
            required: true
        },
        area_street : {
            type:String,
            required : true
        },
        town : {
            type : String,
            required : true
        },
        state : {
            type : String,
            required : true
        },
        landmark : {
            type :String,
            required: true
        },
        delete : {
            type : Boolean,
            required : true,
            default : false
        }
    },

    {
        timestamps: true
    }
)

module.exports = mongoose.model("Address", addressSchema)