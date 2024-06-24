// isLoggedIn , isLoggedOut
// isAdmin
const User = require("../model/userSchema");
const OTP = require('../model/otpSchema')
const jwt = require('jsonwebtoken');



const jwtSecret = process.env.JWT_SECRET;

module.exports = {

   isAuthenticated : (req, res, next) => {
    if (req.session.userId) {
        // User is authenticated, continue with the request
        next();
    } else {
        // User is not authenticated, set flash message and redirect to login or send JSON response
        req.flash('error', 'User not authenticated');
        return res.status(401).json({ message: 'User not authenticated' });
    }
}, 
  //admin login
  isAdminLoggedIn: (req, res, next) => {
    if (req.session && req.session.admin) {
      next()
    } else {
      req.flash('error', 'Not Authorized')
      res.redirect('/admin/login');
    }
  },






  // checkBlockedUser: async (req, res, next) => {
  //   if (req.session.user) {
  //     const user = await User.findById({ _id: req.user.id });
  //     if (user.isBlocked) {
  //       delete req.session.user;
  //       req.flash("error", "user is blocked ");
  //       return res.redirect("/login");
  //     }
  //   }
  //   next();
  // },

 checkBlockedUser : async (req, res, next) => {
    try {
        // Ensure req.session.user contains the user ID after successful login
        if (req.session.user) {
            const user = await User.findById(req.session.user);

            if (user && user.isBlocked) {
                // If user is blocked, log them out and redirect to login with error message
                req.logout((err) => {
                    if (err) {
                        console.error('Error logging out:', err);
                    }
                    req.flash("error", "User is blocked by the admin");
                    res.clearCookie("connect.sid");
                    return res.redirect("/login");
                });
            } else {
                // User is not blocked, proceed to the next middleware
                next();
            }
        } else {
            // If req.session.user is not set, proceed to the next middleware
            next();
        }
    } catch (error) {
        console.error('Error checking blocked user:', error);
        req.flash("error", "Server error");
        res.redirect("/login");
    }
}



}