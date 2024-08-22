const User = require("../model/userSchema");
const Coupon = require("../model/couponSchema");
const adminLayout = "./layouts/adminLayouts";
const Cart = require("../model/cartSchema");

module.exports = {
  //user side

  applyCoupon: async (req, res) => {
    try {
      let { coupon_code } = req.body;
      
  
      const couponCode = await Coupon.findOne({ coupon_code: coupon_code });
      console.log("coupon:::::::::::::::::::::::::::::", couponCode);
      if (!couponCode) {
        return res.status(404).json({ success: false, message: "Coupon not found" });
      }
  
      const currentDate = new Date();
      const expiryDate = new Date(couponCode.expiry_date);
  
      if (currentDate > expiryDate || !couponCode.isActive) {
        return res.status(400).json({ success: false, message: "Coupon expired or inactive." });
      }
  
      const userId = req.session.user?._id || req.session.user;
      const userCart = await Cart.findOne({ userId: userId });
      if (!userCart) {
        return res.status(404).json({ success: false, message: "User Cart not found." });
      }
      console.log("cart,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",userCart);
  
    // Calculate cart total dynamically
    const cartTotal = userCart.items.reduce((acc, item) => acc + item.itemTotal, 0);
      
      console.log("total,///////////////////", cartTotal);
      if (cartTotal < couponCode.min_purchase) {
        return res.status(400).json({
          success: false,
          message: "Your cart total is less than the minimum purchase amount.",
        });
      }
      
  
      console.log(`Cart Total///////////////////: ${cartTotal}, Min Purchase;;;;;;;;;;;;;;;;;;;;: ${couponCode.min_purchase}`);

      if (userCart.coupon && userCart.coupon.toString() === couponCode._id.toString()) {
        return res.status(400).json({ success: false, message: "Coupon already in use." });
      }
  
      let discountAmount = cartTotal * (couponCode.discount_amount / 100);
      userCart.couponDiscount = discountAmount;
      userCart.coupon = couponCode._id;
      await userCart.save();
  
      return res.status(200).json({
        success: true,
        message: "Coupon successfully applied.",
        coupon: couponCode,
        discountAmount,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ success: false, message: "An error occurred." });
    }
  },
  
  removeCoupon: async (req, res) => {
    try {
      const userId = req.session.user?._id || req.session.user;
      const cart = await Cart.findOne({ userId: userId });
  
      if (!cart) {
        return res.status(404).json({ success: false, message: "Cart not found." });
      }
      cart.coupon = null;
      cart.couponDiscount = 0;
      await cart.save();
      return res.status(200).json({ success: true, message: "Coupon removed successfully" });
    } catch (error) {
      console.error("Error removing coupon:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
  

  

  //admin
  getCoupon: async (req, res) => {
    try {
      const locals = {
        title: "Promocodes",
      };
      let perPage = 6;
      let page = req.query.page || 1;

      const promocodes = await Coupon.find()
        .sort({ createdAt: -1 })
        .skip(perPage * page - perPage)
        .limit(perPage)
        .exec();

      const count = await Coupon.find().countDocuments();

      const nextPage = parseInt(page) + 1;
      const hashNextPage = nextPage <= Math.ceil(count / perPage);

      res.render("admin/coupon/coupon", {
        locals,
        layout: adminLayout,
        current: page,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        nextPage: hashNextPage ? nextPage : null,
        promocodes,
      });
    } catch (error) {
      console.error("You got an error from get coupon : ", error);
      req.flash("error", "Unexpected error on coupon");
      res.redirect("/admin");
    }
  },

  getAddCoupon: async (req, res) => {
    try {
      const locals = {
        title: "Add- Promocodes",
      };

      res.render("admin/coupon/addCoupon", {
        layout: adminLayout,
        locals,
      });
    } catch (error) {
      console.error("You got an error from add coupon : ", error);
      req.flash("error", "Unexpected error on add coupon");
      res.redirect("/admin/coupon");
    }
  },

  addCoupon: async (req, res) => {
    try {
      const {
        coupon_code,
        description,
        min_purchase,
        discount_amount,
        expiry_date,
      } = req.body;
  
      if (
        !coupon_code ||
        !description ||
        !min_purchase ||
        !discount_amount ||
        !expiry_date
      ) {
        req.flash("error", "You need to fill all the required fields");
        return res.redirect("/admin/add-promocodes");
      }
  
      if (discount_amount > 70) {
        req.flash("error", "Discount amount cannot exceed 70%");
        return res.redirect("/admin/add-promocodes");
      }
  
      const coupon = await Coupon.findOne({ coupon_code: coupon_code });
      if (coupon) {
        req.flash("error", "Coupon already exists");
        return res.redirect("/admin/add-promocodes");
      }
  
      const isActive = new Date(expiry_date) > new Date();
  
      const addCoupon = new Coupon({
        coupon_code,
        description,
        min_purchase,
        discount_amount,
        expiry_date,
        isActive,
      });
  
      await addCoupon.save();
      req.flash("success", "Coupon successfully added");
      return res.redirect("/admin/promocodes");
    } catch (error) {
      console.error("Error in add coupon:", error);
      req.flash("error", "Unexpected error when creating coupon");
      res.redirect("/admin/add-promocodes");
    }
  },
  

  getEditCoupon: async (req, res) => {
    try {
      const locals = {
        title: "Edit- Promocodes",
      };

      const couponId = req.params.id;
      const coupon = await Coupon.findById(couponId);

      if (!coupon) {
        req.flash("error", "Coupon not found");
        return res.redirect("/admin/promocodes");
      }

      res.render("admin/coupon/editCoupon", {
        coupon,
        layout: adminLayout,
        locals,
      });
    } catch (error) {
      console.error("You got an error from edit coupon : ", error);
      req.flash("error", "Unexpected error when creating  edit coupon");
      res.redirect("/admin/edit-promocodes");
    }
  },
  editCoupon: async (req, res) => {
    try {
      const {
        coupon_code,
        description,
        min_purchase,
        discount_amount,
        expiry_date,
      } = req.body;
      console.log("Updating coupon", coupon_code, discount_amount, expiry_date);
  
      if (discount_amount > 70) {
        req.flash("error", "Discount amount cannot exceed 70%");
        return res.redirect(`/admin/edit-promocodes/${req.params.id}`);
      }
  
      const existingCoupon = await Coupon.findOne({ coupon_code: coupon_code });
      if (existingCoupon && existingCoupon._id.toString() !== req.params.id) {
        req.flash("error", "Coupon already exists");
        return res.redirect(`/admin/edit-promocodes/${req.params.id}`);
      }
  
      const isActive = new Date(expiry_date) > new Date();
  
      const updatingCoupon = {
        coupon_code,
        description,
        min_purchase,
        discount_amount,
        expiry_date,
        isActive,
      };
  
      const couponId = req.params.id;
      const updatedCoupon = await Coupon.findByIdAndUpdate(
        couponId,
        updatingCoupon,
        { new: true }
      );
      if (updatedCoupon) {
        req.flash("success", "Coupon successfully updated");
        return res.redirect("/admin/promocodes");
      } else {
        req.flash("error", "Error updating coupon");
        return res.redirect("/admin/promocodes");
      }
    } catch (error) {
      console.error("Error in edit coupon:", error);
      req.flash("error", "Unexpected error when editing coupon");
      res.redirect(`/admin/edit-promocodes/${req.params.id}`);
    }
  },
  

  deleteCoupon: async (req, res) => {
    try {
      const couponId = req.params.id;

      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        req.flash("error", "Coupon not found");
        return res.redirect("/admin/promocodes");
      }

      await Coupon.findByIdAndDelete(couponId);
      req.flash("success", "Coupon Successfully deleted");
      return res.redirect("/admin/promocodes");
    } catch (error) {
      console.error("You got an error from edit coupon : ", error);
      req.flash("error", "Unexpected error when deleting coupon");
      res.redirect(`/admin/delete-promocodes/${req.params.id}`);
    }
  },
};
