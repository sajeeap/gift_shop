const adminLayout = "./layouts/adminLayouts";

const User = require("../model/userSchema");
const Product = require("../model/productSchema");
const Order = require("../model/orderSchema")



module.exports = {
  getDashboard: async (req, res) => {
    const locals = {
      title: "Gift shop - Dashboard",
    };

    const users = await User.find();
    const products = await Product.find()

    const userCount = await User.find().countDocuments()
    const productCount = await Product.find().countDocuments()
    const orderCount = await Order.find().countDocuments()

    res.render("admin/dashboard", {
      locals,
      userCount,
      productCount,
      orderCount,
      layout: adminLayout,
    });
  },

  getUserList: async (req, res) => {

    const locals = {
      title: "Customers",
    };

    let perPage = 3;
    let page = req.query.page || 1;

    const users = await User.aggregate([{ $sort: { createdAt: -1 } }])
      .skip(perPage * page - perPage)
      .limit(perPage)
      .exec();

      const count = await Product.find().countDocuments({});
      const nextPage = parseInt(page) + 1;
      const hasNextPage = nextPage <= Math.ceil(count / perPage);


    res.render("admin/users/users", {

      locals,
      users,
      current: page,
      pages: Math.ceil(count /perPage),
      nextPage: hasNextPage ? nextPage : null,

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