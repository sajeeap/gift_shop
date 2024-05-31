const adminLayout = "./layouts/adminLayouts";

const User = require("../model/userSchema");



module.exports = {
  getDashboard: async (req, res) => {
    const locals = {
      title: "Gift shop - Dashboard",
    };
    
    res.render("admin/dashboard", {
      locals,
      layout: adminLayout,
    });
  },

};
