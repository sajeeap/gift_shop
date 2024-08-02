const Product = require("../model/productSchema");
const Category = require("../model/categorySchema");
const Offer = require("../model/offerSchema");
const adminLayout = "./layouts/adminLayouts";

 module.exports = {

    getOffers: async (req, res) => {
        res.render("admin/offer", {
          offers: [],
          referral: {},
          layout: adminLayout
        });
      },
      getProductOffers: async (req, res) => {
        const products = await Product.find().sort({ createdAt: -1 })
        const offers = await Offer.find({});
        res.render("admin/offer/product", {
          products,
          layout: adminLayout
        });
      },

      getCategoryOffers: async (req, res) => {
        const categories = await Category.find().sort({ createdAt: -1 })
    
        res.render("admin/offer/category", {
          categories,
          layout: adminLayout
        });
      },
      addProdOffer: async (req, res) => {
        const productId = req.params.id;
        const { offerDiscountRate } = req.body;
    
        if (!productId || offerDiscountRate === undefined) {
            return res.status(400).json({ success: false, message: "Missing parameters" });
        }
    
        const discountRate = Number(offerDiscountRate);
        if (isNaN(discountRate) || discountRate <= 0 || discountRate > 95) {
            return res.status(400).json({
                success: false,
                message: "Discount rate should be a positive number between 1 and 95",
            });
        }
    
        try {
            const product = await Product.findById(productId);
    
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
    
            const sellingPrice = Number(product.price);
            console.log('Product ID:', productId);
            console.log('Product selling price:', product.sellingPrice);

            
    
            if (isNaN(sellingPrice) || sellingPrice <= 0) {
                return res.status(400).json({ success: false, message: "Invalid product selling price" });
            }
    
            const discountAmount = Math.ceil((sellingPrice * discountRate) / 100);
            const offerDiscountPrice = sellingPrice - discountAmount;
    
            if (isNaN(offerDiscountPrice) || offerDiscountPrice < 0) {
                return res.status(400).json({ success: false, message: "Invalid discount calculation" });
            }
    
            product.offerDiscountPrice = offerDiscountPrice;
            product.offerDiscountRate = discountRate;
            product.onOffer = true;
    
            await product.save();
    
            return res.status(200).json({ success: true, message: "Offer added successfully" });
        } catch (error) {
            console.error('Error in addProdOffer:', error);
            return res.status(500).json({ success: false, message: "Internal Server Error", error });
        }
    },
    

      
    
    addCatOffer: async (req, res) => {
      const categoryId = req.params.id;
      const { offerDiscountRate } = req.body;
  
      if (!categoryId || offerDiscountRate === undefined) {
          return res.status(400).json({ success: false, message: "Missing parameters" });
      }
  
      const discountRate = Number(offerDiscountRate);
      if (isNaN(discountRate) || discountRate <= 0 || discountRate > 95) {
          return res.status(400).json({
              success: false,
              message: "Discount rate should be a positive number between 1 and 95",
          });
      }
  
      try {
          const category = await Category.findById(categoryId);
          if (!category) {
              return res.status(404).json({ success: false, message: "Category not found" });
          }
  
          const productsInCategory = await Product.find({ category: categoryId });
          if (!productsInCategory || productsInCategory.length === 0) {
              return res.status(404).json({ success: false, message: "No products found in this category" });
          }
  
          category.offerDiscountRate = discountRate;
          category.onOffer = true;
  
          for (const product of productsInCategory) {
              if (!product.onOffer) {
                  const sellingPrice = Number(product.price);
                  if (isNaN(sellingPrice) || sellingPrice <= 0) {
                      console.error(`Invalid selling price for product ID: ${product._id}`);
                      continue;
                  }
  
                  const discountAmount = Math.ceil((sellingPrice * discountRate) / 100);
                  const offerPrice = sellingPrice - discountAmount;
                  
                  if (isNaN(offerPrice) || offerPrice < 0) {
                      console.error(`Invalid offer price calculation for product ID: ${product._id}`);
                      continue;
                  }
  
                  product.offerDiscountPrice = offerPrice;
                  product.offerDiscountRate = discountRate;
                  product.onOffer = true;
  
                  await product.save();
              }
          }
  
          await category.save();
  
          return res.status(200).json({ success: true, message: "Offer added successfully" });
      } catch (error) {
          console.error(error);
          return res.status(500).json({ success: false, message: "Internal Server Error", error });
      }
  },
  
      toggleActiveCatOffer: async (req, res) => {
        const categoryId = req.params.id;
    
        try {
          const category = await Category.findById(categoryId);
    
          if (!category) {
            return res
              .status(404)
              .json({ success: false, message: "Category not found" });
          }
    
          const productsInCategory = await Product.find({ category: categoryId });
          if (!productsInCategory) {
            return res.status(404).json({
              success: false,
              message: "Products not found in this category",
            });
          }
    
          if (productsInCategory.length === 0) {
            return res.status(404).json({
              success: false,
              message: "No products found in this category",
            });
          }
    
    
          if (category.offerDiscountRate <= 0) {
            return res.status(400).json({
              success: false,
              message: "Discount rate should be a positive number between 1 and 95",
            });
          }
    
          category.onOffer = !category.onOffer;
    
          await category.save();
    
          for (const product of productsInCategory) {
            if (product.offerDiscountRate === category.offerDiscountRate) {
              product.onOffer = category.onOffer;
              await product.save();
            }
          }
    
          return res.status(200).json({
            success: true,
            message: category.onOffer ? "Offer enabled" : "Offer disabled",
          });
        } catch (error) {
          console.error(error);
          return res
            .status(500)
            .json({ success: false, message: "Internal Server Error", error });
        }
      },
    
    
      toggleActiveProdOffer: async (req, res) => {
        const productId = req.params.id;
    
        try {
            const product = await Product.findById(productId);
    
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
    
            if (isNaN(product.offerDiscountRate) || product.offerDiscountRate <= 0 || product.offerDiscountRate > 95) {
                return res.status(400).json({
                    success: false,
                    message: "Discount rate should be a positive number between 1 and 95",
                });
            }
    
            product.onOffer = !product.onOffer;
    
            await product.save();
    
            return res.status(200).json({
                success: true,
                message: product.onOffer ? "Offer enabled" : "Offer disabled",
            });
        } catch (error) {
            console.error('Error in toggleActiveProdOffer:', error);
            return res.status(500).json({ success: false, message: "Internal Server Error", error });
        }
    },
    
    }
      