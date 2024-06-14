const adminLayout = "./layouts/adminLayouts";

const User = require("../model/userSchema");
const Product = require("../model/productSchema");



module.exports = {
  getDashboard: async (req, res) => {
    const locals = {
      title: "Gift shop - Dashboard",
    };

    const users = await User.find();
    const products = await Product.find()

    const userCount = await User.find().countDocuments()
    const productCount =await Product.find().countDocuments()
    
    res.render("admin/dashboard", {
      locals,
      userCount,
      productCount,
      layout: adminLayout,
    });
  },

  getUserList: async(req,res)=>{
    
    const locals = {
      title: "Customers",
    };

    const users = await User.aggregate([{ $sort : {createdAt : -1 } } ]).exec();
    res.render("admin/users/users",{

      locals,
      users,
      
      layout: adminLayout

    } 

    )
  },

  
toggleBlock: async (req, res) => {
  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    res
      .status(200)
      .json({
        message: user.isBlocked
          ? "User blocked successfully"
          : "User unblocked successfully",
      });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
},
}