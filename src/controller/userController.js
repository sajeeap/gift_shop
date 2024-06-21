const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");
const User = require("../model/userSchema")

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
    },

    getProfile : async(req,res)=>{
        const locals ={
            title : "Profile",
        }
        const user = await User.findById( req.user.id)
        res.render("user/profile", {
            locals,
            user
           

        })
    },

    editProfile : async(req,res)=>{
        try {

            console.log(req.body);
            const user = await User.findById( req.user.id)

            const {firstName , lastName } = req.body;

            user.firstName = firstName || user.firstName;
            user.lastName = lastName || user.lastName;

            await user.save()

            // Send a success response back to the client
             res.status(200).json({ message: "Profile updated successfully", user });
            
        } catch (error) {
            //Handle errors
            res.status(500).json({
                message : "An error occured while uploading the profile",
                error
                
            })
            
        }
    }
}