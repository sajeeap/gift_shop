
const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");
const path = require('path')

module.exports={
    getProductList : async (req,res)=>{
        const locals={
            title:"All Product",
        }

        const products = await Product.find().populate('category').sort({createdAt:-1})
        const categories = await Category.find({ isActive: true })

        try {
            res.render('shop/productList.ejs',{
                locals,
                success: req.flash("success"),
                error: req.flash("error"),
                user: req.session.user,
                products,
                categories
            })
            
        } catch (error) {
            console.log(error);
        }
    }
}