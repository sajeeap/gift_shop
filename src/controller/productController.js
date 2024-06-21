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
        const product = await Product.find().populate('category').sort({createdAt:-1})

        res.render("admin/products/products", {
            locals,
            layout: adminLayout,
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
        console.log(req.body);
        try {
          const existProduct = await Product.findOne({
            name: req.body.productName.toLowerCase(),
          });
          if (existProduct) {
            return res
              .status(400)
              .json({ success: false, message: "Product already exist" });
          }
    
          // Ensure req.files is defined and contains the expected fields
          if (!req.files || !req.files.images || !req.files.primaryImage) {
            return res
              .status(400)
              .json({ success: false, message: "Images are required" });
          }
    
          let secondaryImages = [];
          req.files.images.forEach((e) => {
            secondaryImages.push({
              name: e.filename,
              path: e.path,
            });
          });
    
          secondaryImages.forEach(async (e) => {
            await sharp(
              path.join(__dirname, "../../public/uploads/products-images/") + e.name
            )
              .resize(500, 500)
              .toFile(
                path.join(__dirname, "../../public/uploads/products-images/crp/") +
                  e.name
              );
          });
    
          let primaryImage = [];
          req.files.primaryImage.forEach((e) => {
            primaryImage = {
              name: e.filename,
              path: e.path,
            };
          });
    
          await sharp(
            path.join(__dirname, "../../public/uploads/products-images/") +
              primaryImage.name
          )
            .resize(500, 500)
            .toFile(
              path.join(__dirname, "../../public/uploads/products-images/crp/") +
                primaryImage.name
            );
    
          const product = new Product({
            product_name: req.body.productName.toLowerCase(),
            category: req.body.categoryName,
            description: req.body.productDespt,
            stock: req.body.productStock,
            price: req.body.price,
            primaryImages: primaryImage,
            secondaryImages: secondaryImages,
          });



          await product.save();
          req.flash("success", "Product added successfully");
          res.redirect("/admin/products");
        } catch (error) {
           
          console.log(error);
        //   res.status(500).json({ message: 'Server error' });
          req.flash("error", error.message);
          return res.redirect("/admin/add-product");
        }
      },

   
    // addProducts : async (req, res) => {
    //     console.log(req.body);
    //     try {
    //         const existProduct = await Product.findOne({ product_name: req.body.productName.toLowerCase() });
    
    //         if (existProduct) {
    //             return res.status(400)
    //                 .json({ success: false, message: "Product already exists" });
    //         }
    
    //         if (!req.files || !req.files.images || !req.files.primaryImage) {
    //             return res.status(400).json({ success: false, message: "Images are required" });
    //         }
    
    //         let secondaryImages = [];
    //         req.files.images.forEach((e) => {
    //           secondaryImages.push({
    //             name: e.filename,
    //             path: e.path,
    //           });
    //         });
      
    //         secondaryImages.forEach(async (e) => {
    //           await sharp(
    //             path.join(__dirname, "../../public/uploads/products-images/") + e.name
    //           )
    //             .resize(500, 500)
    //             .toFile(
    //               path.join(__dirname, "../../public/uploads/products-images/crp/") +
    //                 e.name
    //             );
    //         });
      
    //         let primaryImage;
    //         req.files.primaryImage.forEach((e) => {
    //           primaryImage = {
    //             name: e.filename,
    //             path: e.path,
    //           };
    //         });
      
    //         await sharp(
    //           path.join(__dirname, "../../public/uploads/products-images/") +
    //             primaryImage.name
    //         )
    //           .resize(500, 500)
    //           .toFile(
    //             path.join(__dirname, "../../public/uploads/products-images/crp/") +
    //               primaryImage.name
    //           );
      
    //         const product = new Product({
    //             product_name: req.body.productName.toLowerCase(),
    //             category: req.body.categoryName,
    //             description: req.body.productDespt,
    //             stock: req.body.productStock,
    //             price: req.body.price,
    //             primaryImages: primaryImage,
    //             secondaryImages: secondaryImages
    //         });
    //         await product.save();
    
    //         req.flash("success", "Product added successfully");
    //         res.redirect('/admin/products');
    
    //     } catch (error) {
    //         console.log(error)
    //        // res.status(500).json({ message: 'Server error' });
    //        req.flash('error', error.message)
    //        return res.redirect('/admin/add-product')
    //     }
    // },

    getEditProducts: async (req, res) => {
        const locals = {
            title: 'Products'
        }

        const product =await Product.findById(req.params.id).populate('category')
        const categories = await Category.find({ isActive: true })

        res.render("admin/products/editProducts", {
            locals,
            layout: adminLayout,
            product,
            categories

        })
    },

    editProduct: async (req,res) =>{
        try {
            console.log(req.body,req.files)
            const productId = req.params.id
            const product = await Product.findById(productId)
            if(!product){
                return res.status(404).json({message:"Product not found"})
            }

            let primaryImage = product.primaryImages
            if(req.files.primaryImage){
                 primaryImage = [{
                    name:req.files.primaryImage [0].filename,
                    path:req.files.primaryImage[0].path
                }]

                await sharp(req.files.primaryImage[0].path)
                .resize(500,500)
                .toFile(
                    path.join(__dirname,'../../public/uploads/products-images/crp/')+
                    req.files.primaryImage[0].filename
                
                )
            }
            let secondaryImages = product.secondaryImages
            for(let i=0;i<3;i++){
                if(req.files[`images${i}`]){
                 await sharp(req.files[`images${i}`][0].path)
                 .resize(500,500)
                 .toFile(
                    path.join(__dirname,'../../public/uploads/products-images/crp/')+
                    req.files[`images${i}`][0].filename
                 )
                 secondaryImages.push({
                    name:req.files[`images${i}`][0].filename,
                    path:req.files[`images${i}`][0].path
                    
                 })
                }
            }

            const updateProduct={
                product_name:req.body.productName,
                category:req.body.categoryName,
                description: req.body.productDespt,
                details:req.body.productDetails,
                price :req.body.price,
                isDeleted: req.body.status === "true" ? true : false,
                stock:req.body.productStock,
                primaryImages:primaryImage,
                secondaryImages:secondaryImages,
            }
            const{id}=req.params
           await Product.findByIdAndUpdate(id,updateProduct,{new:true})
            req.flash("success","product edited successfully")
            res.redirect('/admin/products')
        } catch (error) {
           console.log(error)
           res.status(500).json({message:"server error"}) 
        }
    },

    deleteProduct: async (req, res) => {
        try {
          const productId= req.params.id;
    
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
      }

}