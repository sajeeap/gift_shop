const adminLayout = "./layouts/adminLayouts";
const User = require("../model/userSchema");
const Category = require("../model/categorySchema");

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



            const category = await Category.findOne({ name: name })

            if (category) {
                req.flash("error", "Category already exist")

                return res.redirect("/admin/add-category")
            }

            const addCategory = new Category({ name, description })

            await addCategory.save()
            req.flash("success", "Category successfully saved")

            return res.redirect("/admin/category")

        } catch (error) {

            console.error(error);

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
            console.log(req.body);
            const name = req.body.category_name.trim().toLowerCase();

            const category = await Category.findOne({ name: name });

            if (category && category._id.toString() !== req.params.id) {
                req.flash("error", "Category with this name already exists");
                return res.redirect(`/admin/edit-category/${req.params.id}`);
            }

            const updatedCategory = {
                name: name,
                isActive: status === "true" ? true : false,
                description: description
            };

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
          const category = await Category.findOne({_id: categoryId});
          
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