const bcrypt = require('bcrypt');
const adminLayout = './layouts/authLayout'
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;



/**
 * Models
 */
const User = require("../model/userSchema");
const OTP = require("../model/otpSchema");

const { sendOtpEmail } = require("../helper/userVerificationHelper");

module.exports={
  //user
  //login
  getUserLogin:(req,res)=>{
   const locals = {
    title:"Login",
   };
   res.render("auth/user/login",{
    locals,
    
   });
  },
 


  getUserRegister: async (req, res) => {
    console.log(req.locals);
    res.render("auth/user/register");
  },

  userRegister: async (req, res) => {

    const {firstName,lastName,email,password,confirmPassword} = req.body;
   
    console.log(req.body);

    const existUser = await User.findOne({ email });
    if (existUser) {
      req.flash("error", "Email already in use");
      return res.redirect("/register");
    }

    
    const hashpwd=await bcrypt.hash(password,12);
    const user=await User.create({
              firstName,
              lastName,
              email,
              password:hashpwd,
            });

    try {
      const savedUser = await user.save();
      if (!savedUser) {
        req.flash("error", "user registered unsuccessfully");
        return res.redirect("/register");
      } else {
        req.session.verifyToken = savedUser._id;
        const isOtpSent = sendOtpEmail(savedUser, res);
        if (isOtpSent) {
          req.flash(
            "success",
            "user registered successfully, please verify your email"
          );
          return res.redirect("/verifyOtp");
        } 
        // else {
        //   req.flash(
        //     "error",
        //     "User registration unsuccessfull, please try to logged in"
        //   );
        //   return res.redirect("/login");
        // }
      }

      console.log();
    } catch (error) {
      console.log(error), req.flash("error", "user registered unsuccessfully");
      return res.redirect("/register");
    }
  },



  
  userLogin: async (req, res) => {
        console.log(req.body);
        const { email, password } = req.body;
        const user = await User.findOne({ email, isAdmin: false });
        console.log(user);
        if (!user) {
          req.flash("error", "User does not exit or invalid credentials");
          return res.redirect("/login");
        }
    
        let isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          req.flash("error", "invalid credential");
          return res.redirect("/login");
        }

        if (user.isBlocked) {
          req.flash('error', 'User is blocked by the admin');
          return res.redirect('/login');
      }

        req.session.user = user;
        req.flash("success", "user successfully logged in");
        return res.redirect("/");
      },
     

  
  /**
   * User Verification
   */

  getVerifyOtp: async (req, res) => {
        if (!req.session.verifyToken) {
          return res.redirect("/");
        }
        res.render("auth/user/verifyOtp");
      },
      // 
      verifyOtp: async (req, res) => {
        console.log(req.body);
        try {
            // Check if verifyToken exists in session
            if (!req.session.verifyToken) {
                req.flash("error", "Verification token not found");
                return res.redirect("/");
            }
    
            const userId = req.session.verifyToken;
            const otpData = await OTP.findOne({ userId: userId });
    
            // Check if OTP data exists
            if (!otpData) {
                req.flash("error", "OTP data not found");
                return res.redirect("/verifyOtp");
            }
    
            // Compare OTP
            const validOtp = await bcrypt.compare(req.body.otp, otpData.otp);
    
            // Check if OTP is valid
            if (!validOtp) {
                req.flash("error", "Invalid OTP");
                return res.redirect("/verifyOtp");
            }
    
            // Update user verification status
            let user = await User.findOne({ _id: otpData.userId });
            user.isVerified = true;
            await user.save();
    
            // Success response
            req.flash("success", "User verification successful");
            delete req.session.verifyToken; // Clear the verification token from session
            return res.redirect("/login"); // Redirect to login page after successful OTP verification
        } catch (error) {
            console.error(error);
            req.flash("error", "Internal server error");
            return res.redirect("/verifyOtp");
        }
    },

    getForgetPassword: async (req, res) => {
      res.render("auth/user/forgetPass.ejs");
    },
    getResetPassword: async (req, res) => {
      res.render("auth/user/resetPass.ejs");
    },
    getForgetPasswordverify: async (req, res) => {
      if (!req.session.forgetToken) {
        return res.redirect("/");
      }
      res.render("auth/user/forgetOtp.ejs");
    },
    
    forgetPassword: async (req, res) => {
      console.log(req.body);
      try {
        const { email } = req.body;
        const user = await User.findOne({ email , isAdmin:false});
        if (!user) {
          req.flash("error", "User email does not exist");
          return res.redirect("/forgetPass");
        } else {
          const isOtpSent = sendOtpEmail(user, res);
          console.log(isOtpSent);
          req.session.forgetToken = user._id;
          return res.redirect("/forget-otp-verify");
        }
      } catch (err) {
        console.error(err);
        req.flash("error", "An error occurred");
        return res.redirect("/forgetPass");
      }
    },
    resetPassword: async (req, res) => {
      console.log(req.body);
      try {
        const {  password, confirmPassword } = req.body;
         // Check if passwords match
        if (password !== confirmPassword) {
          req.flash("error", "password doesnot match");
          return res.redirect("/resetPass");
        }

        // Get userId from session
        const userId = req.session.forgetToken;

        // Hash the password
        const hashpwd=await bcrypt.hash(password,12);
        
        // Update the user's password
        const user = await User.updateOne(
          { _id: userId },
          { $set: { password: hashpwd } }
        );
        if (user) {
          console.log(user);
          req.flash("success", "Password successfully reset");
          return res.redirect("/login");
        } else {
          req.flash("error", "password not reseted please try again");
          return res.redirect("/resetPass");
        }
      } catch (err) {
        console.error(err);
        req.flash("error", "An error occurred");
        return res.redirect("/resetPass");
      }
    },
    forgetOtpVerify: async (req, res) => {
      try {
        // Check if verifyToken exists in session
        if (!req.session.forgetToken) {
          // return res.status(401).json({ message: "Verification token not found" });
          req.flash("error", "session timed out");
          return res.redirect("/forget-otp-verify");
        }
  
        const userId = req.session.forgetToken;
        const otpData = await OTP.findOne({ userId: userId });
  
        // Check if OTP data exists
        if (!otpData) {
          // return res.status(404).json({ message: "OTP data not found" });
          req.flash("error", "OTP data not found");
          return res.redirect("/forget-otp-verify");
        }
  
        // Compare OTP
        const validOtp = await bcrypt.compare(req.body.otp, otpData.otp);
  
        // Check if OTP is valid
        if (!validOtp) {
          // return res.status(400).json({ message: "Invalid OTP" });
          req.flash("error", "Invalid OTP");
          return res.redirect("/forget-otp-verify");
        }
  
        // Success response
        req.flash(
          "success",
          "OTP verification successful, please change your password"
        );
        delete req.session.verifyToken; // Clear the verification token from session
        return res.redirect("/resetPass");
      } catch (error) {
        console.error(error); // Log the error for debugging purposes
        // return res.status(500).json({ message: "Internal server error" });
        req.flash("error", "Internal server error");
        return res.redirect("/forget-otp-verify");
      }
    },

    resendOtp: async (req, res) => {
      try {
        let userId;
        if (req.session.verifyToken) {
          userId = req.session.verifyToken;
        }
        if (req.session.forgetToken) {
          userId = req.session.forgetToken;
        }
        const user = await User.findOne({
          _id: userId,
          isAdmin: false,
        });
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "user not found",
          });
        }
  
        const isOtpSent = sendOtpEmail(user, res);
        if (isOtpSent) {
          return res.status(200).json({
            success: true,
            message: "otp send to mail",
          });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    },
  

    


    

    
  

  //admin
  getAdminLogin: (req, res) => {
    const locals = {
      title: "Admin Login",
    };

    res.render("auth/admin/login", {
      locals,
      layout: adminLayout,
    });
  },
  getAdminRegister: (req, res) => {
    const locals = {
      title: "Admin Register",
    };

    res.render("auth/admin/register", {
      locals,
      layout: adminLayout,
    });
  },


  adminRegister: async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;
  
    console.log(req.body); // Debugging line
  
    try {
      const existAdmin = await User.findOne({ email });
      if (existAdmin) {
        req.flash("error", "Email already in use");
        return res.redirect("/admin/register");
      }
      if (password !== confirmPassword) {
        req.flash("error", "Password not matching");
        return res.redirect("/admin/register");
      }
  
      // Ensure password and salt rounds are passed correctly
      const hashpwd = await bcrypt.hash(password, 12);
      const admin = new User({
        firstName,
        lastName,
        email,
        password: hashpwd,
        isAdmin: true,  // Assuming isAdmin field needs to be set
      });
  
      const savedAdmin = await admin.save();
      if (!savedAdmin) {
        req.flash("error", "Admin registration unsuccessful");
        return res.redirect("/admin/register");
      } else {
        req.flash("success", "Admin registered successfully");
        return res.redirect("/admin/login");
      }
    } catch (error) {
      console.error(error);
      req.flash("error", "Internal server error");
      return res.redirect("/admin/register");
    }
  },
  

 
  adminLogin: async (req, res) => {
    const { email, password } = req.body;
    console.log(req.body);
    const adminExist = await User.findOne({ email ,isAdmin:true});
    if (!adminExist) {
      req.flash("error", "Invalid credential");
      return res.redirect("/admin/login");
    }
    const isPassValid = await bcrypt.compare(password, adminExist.password);
    if (!isPassValid) {
      req.flash("error", "password not matching");
      return res.redirect("/admin/login");
    }

    // req.session.isAdmin = user.isAdmin;
    req.session.admin = adminExist;
    req.flash("success", "admin successfully logged in");
    return res.redirect("/admin");
  },

  getUserLogout:(req,res)=>{
    req.flash("success","You have been Logged out.")
    req.session.destroy();
    res.redirect("/");
  },
  AdminLogout:(req,res)=>{    
      
      req.flash("success","You have been Logged out.")
      req.session.destroy();
      res.redirect("/admin/login");
    
  },

  
  
}

