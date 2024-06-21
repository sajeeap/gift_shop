// isLoggedIn , isLoggedOut
// isAdmin
const User = require("../model/userSchema");
const OTP = require('../model/otpSchema')
const jwt = require('jsonwebtoken');



const jwtSecret = process.env.JWT_SECRET;

module.exports = {


    // isUser: (req,res,next) => {
    //     const token = req.cookies.jwt
    //     if(token){
    //         jwt.verify(token, jwtSecret, (err, decodedToken) => {
    //             if(err){
    //                 // return res.status(401).json({message: 'Not Authorized'})
    //                 req.flash('error', 'Not Authorized')
    //                 res.redirect('/login')
    //             } else {
    //                 if(decodedToken.role !== 'User') {
    //                     // return res.status(401).json({message: 'Not Authorized'})
    //                     req.flash('error', 'Not Authorized')
    //                     res.redirect('/login')
    //                 }else{
    //                     next()
    //                 }
    //             }
    //         })
    //     }
    // },

    authenticateUser : async (req, res, next) => {
      if (req.session && req.session.userId) {
          try {
              const user = await User.findById(req.session.userId);
              if (user) {
                  req.user = user;
                  next();
              } else {
                  res.status(401).send('User not found');
              }
          } catch (error) {
              next(error);
          }
      } else {
          res.status(401).send('You need to log in first');
      }
  },

    //user login
    isLoggedIn: (req,res,next) => {
        if(req.session && req.session.user){
            next()
        }else {
            // req.flash('error', 'Not Authorized')
            res.redirect('/login')
        }
    },

    //admin login
    isAdminLoggedIn: (req,res,next) => {
        if(req.session && req.session.admin){
            next()
        }else {
            req.flash('error', 'Not Authorized')
            res.redirect('/admin/login');
        }
    },
    
  
    
    
    

    // isAdmin: (req,res,next) => {
    //     const token = req.cookies.jwt
    //     if(token){
    //         jwt.verify(token, jwtSecret, (err, decodedToken) => {
    //             if(err){
    //                 // return res.status(401).json({message: 'Not Authorized'})
    //                 req.flash('error', 'Not Authorized')
    //                 res.redirect('/admin/login')
    //             } else {
    //                 if(decodedToken.role !== 'Admin') {
    //                     // return res.status(401).json({message: 'Not Authorized'})
    //                     req.flash('error', 'Not Authorized')
    //                     res.redirect('/admin/login')
    //                 }else{
    //                     next()
    //                 }
    //             }
    //         })
    //     }else {
    //         res.redirect('/admin/login')
    //     }
    // },

    checkBlockedUser: async (req, res, next) => {
        try {
          // Assuming user ID is stored in req.user.id after successful login
          if (req.user && req.user.id) {
            const user = await User.findById(req.user.id);
            if (user && user.isBlocked) {
              req.logout((err) => {
                if (err) {
                  console.log(err);
                } else {
                  req.flash("error", "User is blocked by the admin!!!!");
                  res.clearCookie("connect.sid");
                  return res.redirect("/login");
                }
              });
            } else {
              next();
            }
          } else {
            next();
          }
        } catch (error) {
          console.error(error);
          req.flash("error", "Server error");
          res.redirect("/login");
        }
      },


    
}