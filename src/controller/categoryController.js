const adminLayout = "./layouts/adminLayouts";
const User = require("../model/userSchema");
const Category = require("../model/categorySchema");
const sharp = require('sharp');
const path = require('path')
const fs = require('fs');

module.exports = {
    getCategory: async (req, res) => {

        const locals = {
            title: 'Category',
        }

        let perPage = 6;
        let page = req.query.page || 1;

        const categories = await Category.find().sort({ createdAt: -1 })
            .skip(perPage * page - perPage)
            .limit(perPage)
            .exec();

        const count = await Category.find().countDocuments({});
        const nextPage = parseInt(page) + 1;
        const hasNextPage = nextPage <= Math.ceil(count / perPage);


        console.log(categories);
        res.render("admin/categories/category", {
            locals,
            layout: adminLayout,
            categories,
            current: page,
            count,
            perPage,
            pages: Math.ceil(count / perPage),
            nextPage: hasNextPage ? nextPage : null,

        })


    },



    getAddCategory: async (req, res) => {

        const locals = {
            title: 'Add Category',
        }

        res.render("admin/categories/addCategory", {
            locals,
            layout: adminLayout,
        })


    },

    addCategory: async (req, res) => {
        try {
            console.log(req.body);
            const name = req.body.category_name.trim().toLowerCase();
            const { description } = req.body;

            // Check if the category already exists
            const category = await Category.findOne({ name });
            if (category) {
                req.flash("error", "Category already exists");
                return res.redirect("/admin/add-category");
            }

            // Initialize images array
            let images = [];

            // Check if files exist and process them
            if (req.files && req.files.images) {
                req.files.images.forEach((file) => {
                    // Push image details into the images array
                    images.push({
                        name: file.filename,
                        path: file.path
                    });
                });
            }

            // Process image cropping for each image in the array (optional, based on your needs)
            if (images.length > 0) {
                for (const image of images) {
                    await sharp(path.join(__dirname, "../../public/uploads/category-images/") + image.name)
                        .resize(500, 500)
                        .toFile(path.join(__dirname, "../../public/uploads/category-images/crp/") + image.name);
                }
            }

            // Create a new category
            const newCategory = new Category({
                name,
                description,
                images,  // Save the images array
            });

            // Save the new category
            await newCategory.save();
            req.flash("success", "Category successfully saved");
            return res.redirect("/admin/category");
        } catch (error) {
            console.error(error);
            req.flash("error", "An error occurred while adding the category");
            return res.redirect("/admin/add-category");
        }
    },


    // getEditCategory : async (req,res)=>{

    //     const locals =  {
    //         title : 'Edit Category',
    //     }
    //     res.render("admin/categories/editCategory", {
    //         locals,
    //         layout: adminLayout,
    //     })


    // },


    // addCategory: async (req, res) => {
    //     try {
    //       const { category_name, description } = req.body;

    //       // Check if the category already exists
    //       const existingCategory = await Category.findOne({ name: category_name.trim().toLowerCase() });
    //       if (existingCategory) {
    //         req.flash("error", "Category already exists");
    //         return res.redirect("/admin/add-category");
    //       }

    //       // Prepare the image data
    //       const imageFile = req.files?.category_image?.[0];
    //       let imageData = {};

    //       if (imageFile) {
    //         imageData = {
    //           filename: imageFile.filename,
    //           originalname: imageFile.originalname,
    //           path: `/uploads/category-images/${imageFile.filename}`,

    //         };
    //       }
    //       console.log("image data showing",imageData);


    //       // Create a new category with image data
    //       const newCategory = new Category({
    //         name: category_name.trim().toLowerCase(),
    //         description: description || '',
    //         image: imageData,
    //         isActive: true,
    //       });

    //       console.log("new category 1111111111111111111111111111111111111111111", newCategory);


    //       // Save the category to the database
    //       await newCategory.save();
    //       console.log("new category 2222222222222222222222222222222222222222222222222222", newCategory);

    //       req.flash("success", "Category added successfully!");
    //       return res.redirect("/admin/category");
    //     } catch (error) {
    //       console.error("Error adding category:", error);
    //       req.flash("error", "Error adding category. Please try again.");
    //       res.redirect("/admin/add-category");
    //     }
    //   },


    // getEditCategory : async (req,res)=>{

    //     const locals =  {
    //         title : 'Edit Category',
    //     }
    //     res.render("admin/categories/editCategory", {
    //         locals,
    //         layout: adminLayout,
    //     })


    // },

    getEditCategory: async (req, res) => {
        try {
            const categoryId = req.params.id;
            const category = await Category.findById(categoryId);

            if (!category) {
                req.flash('error', 'Category not found');
                return res.redirect('/admin/category');
            }

            const locals = {
                title: 'Edit Category',
            };

            res.render('admin/categories/editCategory', {
                locals,
                category,
                layout: adminLayout,
                messages: req.flash(),
            });
        } catch (error) {
            console.error(error);
            req.flash('error', 'Server error');
            res.redirect('/admin/category');
        }
    },



    editCategory: async (req, res) => {
        try {
            const { status, description } = req.body;
            const name = req.body.category_name.trim().toLowerCase();
            const category = await Category.findOne({ name: name });
    
            // Check if category with the same name already exists
            if (category && category._id.toString() !== req.params.id) {
                req.flash("error", "Category with this name already exists");
                return res.redirect(`/admin/edit-category/${req.params.id}`);
            }
    
            // Retrieve the existing category to update images
            const existingCategory = await Category.findById(req.params.id);
            let images = existingCategory.images; // Default to existing images
    
            // Check if new images were uploaded
            if (req.files && req.files.images && req.files.images.length > 0) {
                images = [{
                    name: req.files.images[0].filename,
                    path: req.files.images[0].path
                }];
    
                // Ensure the cropped image directory exists
                const croppedDir = path.join(__dirname, "../../public/uploads/category-images/crp/");
                if (!fs.existsSync(croppedDir)) {
                    fs.mkdirSync(croppedDir, { recursive: true });
                }
    
                // Process the uploaded image with sharp (resize and save)
                await sharp(req.files.images[0].path)
                    .resize(500, 500)
                    .toFile(path.join(croppedDir, req.files.images[0].filename)); 
            }
    
            // Prepare updated category data
            const updatedCategory = {
                name: name,
                isActive: status === "true" ? true : false,
                description: description,
                images: images 
            };
    
            // Find the category by ID and update it
            const id = req.params.id;
            const update_category = await Category.findByIdAndUpdate(
                id,
                updatedCategory,
                { new: true }
            );
    
            if (update_category) {
                req.flash("success", "Category successfully updated");
                return res.redirect("/admin/category");
            } else {
                req.flash("error", "Category not found");
                return res.redirect("/admin/category");
            }
    
        } catch (error) {
            console.error(error);
            req.flash("error", "Server error");
            return res.redirect(`/admin/edit-category/${req.params.id}`);
        }
    },

    deleteCategory: async (req, res) => {
        try {
            const categoryId = req.params.id;

            // Find the category by ID
            const category = await Category.findById(categoryId);

            // If category doesn't exist, redirect with error message
            if (!category) {
                req.flash('error', 'Category not found');
                return res.redirect('/admin/category');
            }



            // Delete the category
            await Category.findByIdAndDelete(categoryId);

            // Redirect with success message
            req.flash('success', 'Category successfully deleted');
            return res.redirect('/admin/category');
        } catch (error) {
            console.error(error);
            req.flash('error', 'Server error');
            res.redirect('/admin/category');
        }
    },

    getCategoryDetails: async (req, res) => {
        const categoryId = req.params.id
        try {
            const category = await Category.findOne({ _id: categoryId });

            if (!category) {
                return res.status(404).json({ error: "Category not found" });
            }

            return res.status(200).json({
                success: true,
                category
            });
        } catch (error) {
            console.log("Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }

    },

}