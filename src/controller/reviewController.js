const Product = require('../model/productSchema');
const mongoose = require('mongoose');


module.exports = {
    getUserReviews: async(req,res) =>{

    },

    addReviews : async(req,res)=>{
       
    const { productId } = req.params;
    const { rating, comment, name, email } = req.body;

    try {
        // Assuming userId is obtained from session or authentication
        const userId = req.user.id; // Adjust as per your authentication setup

        // Create a new review instance
        const newReview = new Review({
            productId,
            userId,
            rating,
            comment
        });

        // Save the review to the database
        await newReview.save();

        // Redirect back to the product page or send a success response
        res.redirect(`/product/${productId}`); // Redirect to the product details page
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit review' });
    }


    }
}