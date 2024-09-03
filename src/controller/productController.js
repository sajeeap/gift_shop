const sharp = require('sharp')
const adminLayout = "./layouts/adminLayouts";
const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");
const path = require('path')
const fs = require('fs');


module.exports = {
  getProducts: async (req, res) => {
    const locals = {
      title: 'Products'
    }

    let perPage = 6;
    let page = req.query.page || 1;
    const product = await Product.find().populate('category').sort({ createdAt: -1 })
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();
    const count = await Product.find().countDocuments({});
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

    res.render("admin/products/products", {
      locals,
      layout: adminLayout,
      current: page,
      perPage,
      pages: Math.ceil(count / perPage),
      count,
      nextPage: hasNextPage ? nextPage : null,
      product
    })
  },

  getAddProducts: async (req, res) => {
    const locals = {
      title: 'Products'
    }

    const categories = await Category.find({ isActive: true })

    console.log(categories);



    res.render("admin/products/addProducts", {
      locals,
      layout: adminLayout,
      categories
    })
  },


  addProducts: async (req, res) => {
    try {
      const { productName, categoryName, productDespt, productStock, price } = req.body;
  
      // Validate required fields
      const errors = {};
      if (!productName) errors.productName = "Product title is required.";
      if (!categoryName) errors.categoryName = "Category is required.";
      if (!productDespt) errors.productDespt = "Product description is required.";
      if (!productStock || isNaN(productStock) || parseInt(productStock, 10) < 0) errors.productStock = "Valid stock quantity is required.";
      if (!price || isNaN(price) || parseFloat(price) < 0) errors.price = "Valid price is required.";
  
      if (Object.keys(errors).length > 0) {
        req.flash("errors", errors);
        return res.redirect("/admin/add-product");
      }
  
      // Check if product already exists
      const existingProduct = await Product.findOne({
        product_name: productName.toLowerCase(),
      });
      if (existingProduct) {
        req.flash("error", "Product already exists");
        return res.redirect("/admin/add-product");
      }
  
      // Ensure req.files is defined and contains the expected fields
      if (!req.files || !req.files.images || !req.files.primaryImage) {
        req.flash("error", "Images are required");
        return res.redirect("/admin/add-product");
      }
  
      // Process secondary images
      const secondaryImages = [];
      for (const file of req.files.images) {
        const outputPath = path.join(__dirname, "../../public/uploads/products-images/crp/", file.filename);
        
        // Resize and save secondary images
        await sharp(path.join(__dirname, "../../public/uploads/products-images/", file.filename))
          .resize(500, 500)
          .toFile(outputPath);
        
        secondaryImages.push({
          name: file.filename,
          path: outputPath,
        });
      }
  
      // Process primary image
      const primaryImageFile = req.files.primaryImage[0];
      const primaryImagePath = path.join(__dirname, "../../public/uploads/products-images/crp/", primaryImageFile.filename);
  
      await sharp(path.join(__dirname, "../../public/uploads/products-images/", primaryImageFile.filename))
        .resize(500, 500)
        .toFile(primaryImagePath);
  
      const primaryImage = {
        name: primaryImageFile.filename,
        path: primaryImagePath,
      };
  
      // Create new product
      const product = new Product({
        product_name: productName.toLowerCase(),
        category: categoryName,
        description: productDespt,
        stock: parseInt(productStock, 10),
        price: parseFloat(price),
        primaryImage: primaryImage,
        secondaryImages: secondaryImages,
      });
  
      // Save product to database
      await product.save();
      req.flash("success", "Product added successfully");
      res.redirect("/admin/products");
  
    } catch (error) {
      console.error(error);
  
      // Handle different types of errors
      if (error instanceof multer.MulterError) {
        req.flash("error", "File upload error: " + error.message);
      } else {
        req.flash("error", "Server error: " + error.message);
      }
  
      // Remove uploaded files if error occurs
      if (req.files) {
        req.files.images.forEach(file => fs.unlinkSync(path.join(__dirname, "../../public/uploads/products-images/", file.filename)));
        if (req.files.primaryImage) {
          fs.unlinkSync(path.join(__dirname, "../../public/uploads/products-images/", req.files.primaryImage[0].filename));
        }
      }
  
      res.redirect("/admin/add-product");
    }
  },

  getEditProducts: async (req, res) => {
    const locals = {
      title: 'Products'
    }

    const product = await Product.findById(req.params.id).populate('category')
    const categories = await Category.find({ isActive: true })

    res.render("admin/products/editProducts", {
      locals,
      layout: adminLayout,
      product,
      categories,
      
     
     

    })
  },

  editProduct: async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      const existProduct = await Product.findOne({
        name: req.body.productName.toLowerCase(),
      });
      if (existProduct) {
        return res
          .status(400)
          .json({ success: false, message: "Product already exist" });
      }

      // Handle primary image
      let primaryImage = product.primaryImages;
      if (req.files.primaryImage) {
        primaryImage = [{
          name: req.files.primaryImage[0].filename,
          path: req.files.primaryImage[0].path
        }];

        await sharp(req.files.primaryImage[0].path)
          .resize(500, 500)
          .toFile(path.join(__dirname, '../../public/uploads/products-images/crp/', req.files.primaryImage[0].filename));
      }

      // Handle secondary images
      let secondaryImages = [];
      if (req.files.image2) {
        await sharp(req.files.image2[0].path)
          .resize(500, 500)
          .toFile(path.join(__dirname, '../../public/uploads/products-images/crp/', req.files.image2[0].filename));
        secondaryImages.push({
          name: req.files.image2[0].filename,
          path: req.files.image2[0].path
        });
      } else if (product.secondaryImages[0]) {
        secondaryImages.push(product.secondaryImages[0]);
      }

      if (req.files.image3) {
        await sharp(req.files.image3[0].path)
          .resize(500, 500)
          .toFile(path.join(__dirname, '../../public/uploads/products-images/crp/', req.files.image3[0].filename));
        secondaryImages.push({
          name: req.files.image3[0].filename,
          path: req.files.image3[0].path
        });
      } else if (product.secondaryImages[1]) {
        secondaryImages.push(product.secondaryImages[1]);
      }

      // Update the product
      const updateProduct = {
        product_name: req.body.productName,
        category: req.body.categoryName,
        description: req.body.productDespt,
        price: req.body.price,
        isDeleted: req.body.status === "true",
        stock: req.body.productStock,
        primaryImages: primaryImage,
        secondaryImages: secondaryImages,
      };

      await Product.findByIdAndUpdate(productId, updateProduct, { new: true });
      req.flash("success", "Product edited successfully");
      res.redirect('/admin/products');
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  },


  deleteProduct: async (req, res) => {
    try {
      const productId = req.params.id;

      // Find the category by ID
      const product = await Product.findById(productId);

      // If category doesn't exist, redirect with error message
      if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/admin/products');
      }

      // Delete the category
      await Product.findByIdAndDelete(productId);

      // Redirect with success message
      req.flash('success', 'Product successfully deleted');
      return res.redirect('/admin/products');
    } catch (error) {
      console.error(error);
      req.flash('error', 'Server error');
      res.redirect('/admin/products');
    }
  },

  getStocks: async (req, res) => {

    try {
      const products = await Product.find()

        .sort({ createdAt: -1 })
        .populate("category")
        .exec()

      res.render("admin/products/stocks", {
        products,
        layout: adminLayout,
      })

    } catch (error) {

      res.status(500).json({ message: "Internal server error" });

    }
  },

  updateStocks: async (req, res) => {

    const { productId, newStock } = req.body;

    try {


      if (newStock < 0) {
        return res.json({ success: false, error: 'Stock value cannot be negative.' });
      }


      await Product.findByIdAndUpdate(productId, { stock: newStock });
      res.json({ success: true });


    } catch (error) {

      console.error(error);
      res.json({ success: false });


    }
  },

  // get product details for Offer
  getProdDetails: async (req, res) => {
    const productId = req.params.id;
    try {
      const product = await Product.findOne({ _id: productId });

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      return res.status(200).json({ success: true, product });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  },

}