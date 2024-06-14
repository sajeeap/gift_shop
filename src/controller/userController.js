const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");

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
    }
}