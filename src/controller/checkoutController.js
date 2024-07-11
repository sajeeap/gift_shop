const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");
const Address = require("../model/addressSchema")
const Wishlist = require("../model/whishlistSchema")

module.exports = {

    getCheckOutPage: async (req, res) => {
        const userId = req.session.user._id;

        const address = await Address.findOne({
            customer_id: userId,
            default: true,
            delete: false
        })
       
        let cart = await Cart.findOne({ userId }).populate("items.product_id");       
        const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");




        
        let totalItems = 0;
        let totalPrice = 0;

        if (cart) {
            for (const item of cart.items) {         
                               

                let total = 0;
                if(!item.itemTotal){
                    total = item.price*item.quantity
                } else {
                    total = item.itemTotal
                }

                totalPrice += total;
                totalItems += item.quantity;                 
                                               
                
            }
        } 



        res.render("shop/checkout", {
            user: req.session.user,
            address,
            cart,
            wishlist,
            totalPrice,
            totalItems,
            

        })
    },


}