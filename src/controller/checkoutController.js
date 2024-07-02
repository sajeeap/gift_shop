const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");

module.exports = {
    getCheckOut : async(req,res)=>{

        try {
            const userId = req.session.user; // Retrieve userId from session

            // Find user by userId
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).send('User not found');
            }

            // Render profile page with updated user data
            res.render('shop/checkout', {
                user
            });

        } catch (error) {
            console.error('Error fetching profile:', error);
            res.status(500).send('An error occurred while fetching the profile');
        }

}
}