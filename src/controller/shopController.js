
const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");
const path = require('path');


// module.exports={
//     getProductList : async (req,res)=>{
//         const locals={
//             title:"All Product",
//         }

//         const products = await Product.find().populate('category').sort({createdAt:-1})
//         const categories = await Category.find({ isActive: true })

//         try {
//             res.render('shop/productList.ejs',{
//                 locals,
//                 success: req.flash("success"),
//                 error: req.flash("error"),
//                 user: req.session.user,
//                 products,
//                 categories
//             })
            
//         } catch (error) {
//             console.log(error);
//         }
//     }
// }



module.exports = {
  getHome: async (req, res) => {
    let locals = {
      title: "UrbanDecor - Home",
      description: "Home Page",
    };
    res.render("index", {
      locals,
    });
  },
  getShop: async (req, res) => {
    let perPage = 6;
    let page = req.query.page || 1;
    const product = await Product.aggregate([{ $sort: { updatedAt: -1 } }])
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();
    const count = await Product.countDocuments();

    const products = await Product.find({ isDeleted: false });
    const categories = await Category.find({ isDeleted: false });
    console.log(products);

    res.render("shop/shop", {
      products,
      categories,
      current: page,
      pages: Math.ceil(count / perPage),
    });
  },
  getProduct: async (req, res) => {
    console.log(req.params);
    const product = await Product.findById(req.params.id).populate("category");
    console.log(product);
    const relatedProducts = await Product.find({
      category: product.category._id,
      isDeleted: false,
    }).limit(10);
    res.render("shop/product", {
      product,
      relatedProducts,
    });
  },
};