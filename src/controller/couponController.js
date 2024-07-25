const User = require("../model/userSchema");
const Coupon = require("../model/couponSchema");
const adminLayout = "./layouts/adminLayouts";

module.exports = {


    //user side

    






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
        expiring_date,
      } = req.body;

      if (
        !coupon_code &&
        !description &&
        !min_purchase &&
        !discount_amount &&
        !expiring_date
      ) {
        req.flash("error", " You need to fill all the requiring fields");
        return res.redirect("/admin/add-promocodes");
      }

      const coupon = await Coupon.findOne({ coupon_code: coupon_code });
      if (coupon) {
        req.flash("error", "Coupon already exist");
        return res.redirect("/admin/add-promocodes");
      }
      const isActive = new Date(expiring_date) > new Date();

      const addCoupon = new Coupon({
        coupon_code,
        description,
        min_purchase,
        discount_amount,
        expiring_date,
        isActive,
      });

      await addCoupon.save();
      req.flash("success", "Coupon successfully added");
      return res.redirect("/admin/promocodes");
    } catch (error) {
      console.error("You got an error from add coupon : ", error);
      req.flash("error", "Unexpected error when creating  add coupon");
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
        expiring_date,
      } = req.body;
      console.log(
        "updating coupon",
        coupon_code,
        discount_amount,
        expiring_date
      );

      const existingCoupon = await Coupon.findOne({ coupon_code: coupon_code });
      if (existingCoupon && existingCoupon._id.toString() !== req.params.id) {
        req.flash("error", "Coupon already exist");
        return res.redirect(`/admin/edit-promocodes/${req.params.id}`);
      }
      const isActive = new Date(expiring_date) > new Date();

      const updatingCoupon = {
        coupon_code: coupon_code,
        description: description,
        min_purchase: min_purchase,
        discount_amount: discount_amount,
        expiring_date: expiring_date,
        isActive: isActive,
      };

      const couponId = req.params.id;
      const updatedCoupon = await Coupon.findByIdAndUpdate(
        couponId,
        updatingCoupon,
        { new: true }
      );
      if (updatedCoupon) {
        req.flash("success", " Coupon Successfully Updated");
        return res.redirect("/admin/promocodes");
      } else {
        req.flash("error", "Error during updaring Coupon");
        return res.redirect("/admin/promocodes");
      }
    } catch (error) {
      console.error("You got an error from edit coupon : ", error);
      req.flash("error", "Unexpected error when creating  edit coupon");
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
