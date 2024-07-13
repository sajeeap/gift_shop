
const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");
const User = require("../model/userSchema")
const path = require('path');
const Cart = require("../model/cartSchema");
const Wishlist =require("../model/whishlistSchema")
const Review = require("../model/reviewSchema")



module.exports = {

    userHome: async (req, res) => {
        const locals = {
            title: "Home Page",
        }

        
        const products = await Product.find().populate('category').sort({ createdAt: -1 })
        const wishlist = await Wishlist.findOne({ user_id:req.session.user }).populate("products");
        
        
        let cart = await Cart.findOne({userId:req.session.user}).populate("items");

        
        

        try {
            res.render('index', {
                locals,
                user: req.session.user,
                products,
                wishlist,
                cart
            })

        } catch (error) {
            console.log(error);
        }
    },

    getProductList: async (req, res) => {
        const locals = {
            title: "All Product",
        }

        const userId = req.session.user
        const user = await User.findById(userId);

        

    
        let perPage = 12;
        let page = req.query.page || 1;
        let sortOption = req.query.sort || 'createdAt';
        let sortOrder = parseInt(req.query.order) || -1;
        let categoryFilter = req.query.category || '';
    
        // Construct sorting object
        let sort = {};
        sort[sortOption] = sortOrder;
    
        // Build filter query
        let filter = {};
        if (categoryFilter) {
            filter['category.name'] = categoryFilter;
        }
    
        let count = await Product.countDocuments(filter);
        let nextPage = parseInt(page) + 1;
        let hasNextPage = nextPage <= Math.ceil(count / perPage);
    
        const products = await Product.find(filter)
            .populate('category')
            .sort(sort)
            .skip(perPage * page - perPage)
            .limit(perPage)
            .exec();
    
        const categories = await Category.find({ isActive: true });
        const wishlist = await Wishlist.findOne({ user_id:req.session.user }).populate("products");
        let cart = await Cart.findOne({ userId }).populate("items");
    
        try {
            res.render('shop/productList.ejs', {
                locals,
                user: req.session.user,
                products,
                categories,
                nextPage: hasNextPage ? nextPage : null,
                currentCategory: categoryFilter,
                currentSort: sortOption,
                currentOrder: sortOrder,
                cart,
                wishlist
            });
        } catch (error) {
            console.log(error);
        }
    },

    getProductDetails: async (req, res) => {

        const locals = {
            title: "Product Details",
        }

        const product = await Product.findById(req.params.id).populate("category");
        const wishlist = await Wishlist.findOne({ user_id:req.session.user }).populate("products");
        let cart = await Cart.findOne({userId:req.session.user}).populate("items");

        const reviews = await Review.find({ product_id: req.params.id }).populate("userId");

        try {
            res.render('shop/productDetails', {
                locals,
                product,
                user: req.session.user,
                wishlist,
                cart,
                reviews 


            })

        } catch (error) {
            console.log(error);
        }

    },




}



