
const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");
const User = require("../model/userSchema")
const path = require('path');


module.exports={

    userHome: async (req,res)=>{
        const locals={
            title:"Home Page",
        }

        const products = await Product.find().populate('category').sort({createdAt:-1})

        try {
            res.render('index',{
                locals,
                user: req.session.user,
                products
            })
            
        } catch (error) {
            console.log(error);
        }
    },

    getProductList : async (req,res)=>{
        const locals={
            title:"All Product",
        }

        const products = await Product.find().populate('category').sort({createdAt:-1})
        const categories = await Category.find({ isActive: true })

        try {
            res.render('shop/productList.ejs',{
                locals,
                user: req.session.user,
                products,
                categories,
               
                
            })
            
        } catch (error) {
            console.log(error);
        }
    },

    getProductDetails : async(req,res)=>{

        const locals={
            title:"Product Details",
        }

        const product = await Product.findById(req.params.id).populate("category");        

        try {
            res.render('shop/productDetails',{
                locals,
                product,
              
                
            })
            
        } catch (error) {
            console.log(error);
        }

    },

   
}



