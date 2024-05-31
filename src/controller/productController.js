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
            const existProduct = await Product.findOne({ name: req.body.productName.toLowerCase() });

            if (existProduct) {
                return res.status(400)
                    .json({ success: false, message: "Product already exist" });
            }

            if (!req.files || !req.files.images || !req.files.primaryImage) {
                return res.status(400).json({ success: false, message: "Images are required" });
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

            let primaryImage;
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
                name: req.body.productName.toLowerCase(),
                category: req.body.categoryName,
                description: req.body.productDespt,
                stock: req.body.productStock,
                price: req.body.price,
                primaryImages: primaryImage,
                secondaryImages: secondaryImages
            });
            await product.save();

            req.flash("success", "Product added successfully");
            res.redirect('/admin/products');

        } catch (error) {
            console.log(error)
            // res.status(500).json({ message: 'Server error' });
            req.flash('error', error.message)
            return res.redirect('/admin/add-Products')
        }
    },

    getEditProducts: async (req, res) => {
        const locals = {
            title: 'Products'
        }

        res.render("admin/products/editproducts", {
            locals,
            layout: adminLayout
        })
    }
}