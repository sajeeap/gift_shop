
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
        const categories = await Category.find({ isActive: true }).sort({ createdAt: -1 }).limit(6);
        console.log("pr", categories);
        
        const wishlist = await Wishlist.findOne({ user_id:req.session.user }).populate("products");
        
        
        let cart = await Cart.findOne({userId:req.session.user}).populate("items");

        
        

        try {
            res.render('index', {
                locals,
                user: req.session.user,
                products,
                wishlist,
                cart,
                categories
            })

        } catch (error) {
            console.log(error);
        }
    },

    getProductList: async (req, res) => {
        const locals = {
            title: "All Products",
        }
        const {search} = req.query
    
        const userId = req.session.user;
        const user = await User.findById(userId);
    
        let perPage = 6;
        let page = parseInt(req.query.page) || 1;
    
        let sortOption = req.query.sort ;
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
      


        if (search) {
            
    
            const categoryNames = await Category.find({ name: new RegExp(search, 'i'), isActive: true }).select('_id');
            const categoryIds = categoryNames.map(cat => cat._id);
    
            // Combine search filters
            filter.$or = [
              
              { category: { $in: categoryIds } },
              { product_name: new RegExp(search, 'i') }
            ];
          }
    
        let count = await Product.countDocuments(filter);
        let pages = Math.ceil(count / perPage);
        let nextPage = page + 1;
        let hasNextPage = nextPage <= pages;
    
        const products = await Product.find(filter)
            .populate('category')
            .sort(sort)
            .skip((perPage * page) - perPage)
            .limit(perPage)
            .exec();
    
        const categories = await Category.find({ isActive: true });
        const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");
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
                wishlist,
                current: page,
                pages: pages,
                search
            });
        } catch (error) {
            console.log(error);
        }
    },
    

    

    // getProductList: async (req, res) => {
    //     const locals = {
    //         title: "All Product",
    //     }

    //     const userId = req.session.user
    //     const user = await User.findById(userId);

        

    
    //     let perPage = 12;
    //     let page = req.query.page || 1;

        
    //     let sortOption = req.query.sort || 'createdAt';
    //     let sortOrder = parseInt(req.query.order) || -1;
    //     let categoryFilter = req.query.category || '';
    
    //     // Construct sorting object
    //     let sort = {};
    //     sort[sortOption] = sortOrder;
    
    //     // Build filter query
    //     let filter = {};
    //     if (categoryFilter) {
    //         filter['category.name'] = categoryFilter;
    //     }
    
    //     let count = await Product.countDocuments(filter);
    //     let nextPage = parseInt(page) + 1;
    //     let hasNextPage = nextPage <= Math.ceil(count / perPage);
    
    //     const products = await Product.find(filter)
    //         .populate('category')
    //         .sort(sort)
    //         .skip(perPage * page - perPage)
    //         .limit(perPage)
    //         .exec();
    
    //     const categories = await Category.find({ isActive: true });
    //     const wishlist = await Wishlist.findOne({ user_id:req.session.user }).populate("products");
    //     let cart = await Cart.findOne({ userId }).populate("items");
    
    //     try {
    //         res.render('shop/productList.ejs', {
    //             locals,
    //             user: req.session.user,
    //             products,
    //             categories,
    //             nextPage: hasNextPage ? nextPage : null,
    //             currentCategory: categoryFilter,
    //             currentSort: sortOption,
    //             currentOrder: sortOrder,
    //             cart,
    //             wishlist
    //         });
    //     } catch (error) {
    //         console.log(error);
    //     }
    // },

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

    stockcheck : async(req,res)=>{
        try {
            const product = await Product.findById(req.params.id);
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            res.json({ stock: product.stock });
        } catch (error) {
            console.error('Error fetching product stock:', error);
            res.status(500).json({ error: 'Failed to fetch product stock' });
        }
    },

    getSearchSuggestions: async (req, res) => {
        const query = req.query.query;
        const categoryFilter = req.session.category;
    
    
        if (!query) {
          return res.json([]);
        }
    
        try {
          let productSuggestions = [];
          let categorySuggestions = [];
          
    
          // If a category filter is applied, filter product suggestions by that category
          if (categoryFilter) {
            productSuggestions = await Product.find({
                product_name: new RegExp(query, 'i'),
              category: categoryFilter // Only include products in the selected category
            }).limit(4).select('product_name');
          } else {
            // If no category filter is applied, get suggestions from all products
            productSuggestions = await Product.find({
                product_name: new RegExp(query, 'i')
            }).limit(4).select('product_name');
    
            // Get category suggestions based on the query
            categorySuggestions = await Category.find({
              name: new RegExp(query, 'i'),
              isActive: true // Assuming you want only active categories
            }).limit(4).select('name');
    
           
          }
    
    
    
          // Combine and return suggestions
          const suggestions = [
            ...productSuggestions.map(p => p.product_name),
            ...categorySuggestions.map(c => c.name),
           
          ];
    
          res.json(suggestions);
        } catch (err) {
          console.error(err);
          res.status(500).json({ error: 'Server error' });
        }
      }




}



