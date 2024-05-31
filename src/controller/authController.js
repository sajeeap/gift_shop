const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const adminLayout = './layouts/authLayout'
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
    success:req.flash("success"),
    error:req.flash("error"),
   });
  },
  //register
  // getUserRegister: (req,res)=>{
  //   const locals={
  //     title:"User Registration",
  //   };
  //   res.render("auth/user/register",{
  //      locals,
  //       success:req.flash('Success'),
  //       error:req.flash('error'),
  //   });
  // },


  // userRegister: async(req,res)=>{
  //   const {firstName,lastName,email,pwd,pwdConf} = req.body;

  //   const isExist = await User.findOne({email});

  //   if(isExist){
  //     req.flash("error","User already exist,Please login");
  //     console.log("User already exist ,please login");
  //     res.redirect('/login');
  //   }
  //   if(pwd <6 && pwdConf<6){
  //     req.flash("error","password is less than 6 characters");
  //     res.redirect("/register");
  //   }else{
  //     if(pwd===pwdConf){
  //       const hashpwd=await bcrypt.hash(pwd,12);

  //       const user=await User.create({
  //         firstName,
  //         lastName,
  //         email,
  //         password:hashpwd,
  //       });

  //       if(user){
  //         req.flash("success","User successfully created!");
  //         res.render("auth/user/verifyOtp")
  //       }else{
  //         req.flash("error","User not created");
  //         res.redirect("/register");
  //       }
  //     }else{
  //       req.flash("error","password does not match");
  //       console.log("password does not match");
  //       res.redirect("/register");
  //     }
  //   }
  // },

  getUserRegister: async (req, res) => {
    console.log(req.locals);
    res.render("auth/user/register");
  },
  userRegister: async (req, res) => {

    const {firstName,lastName,email,password,confirmPassword} = req.body;
   
    console.log(req.body);

    const existUser = await User.findOne({ email });
    if (existUser) {
      req.flash("success", "Email already in use");
      return res.redirect("/register");
    }
    if (password !== confirmPassword) {
      req.flash("error", "Password not matching");
      return res.redirect("/register");
    }

    // const hashedPassword = await bcrypt.hash(pwd, 10);
    // const user = new User({
    //   username,
    //   email,
    //   pwd,
    //   pwdConf,
    // });
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
        } else {
          req.flash(
            "error",
            "User registration unsuccessfull, please try to logged in"
          );
          return res.redirect("/login");
        }
      }
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
        res.render("auth/user/VerifyOtp");
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
        const user = await User.findOne({ email });
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
  

    


    

    
  

  //admin
  getAdminLogin: (req, res) => {
    const locals = {
      title: "Admin Login",
    };

    res.render("auth/admin/login", {
      locals,
      success: req.flash("success"),
      error: req.flash("error"),
      layout: adminLayout,
    });
  },
  getAdminRegister: (req, res) => {
    const locals = {
      title: "Admin Register",
    };

    res.render("auth/admin/register", {
      locals,
      success: req.flash("success"),
      error: req.flash("error"),
      layout: adminLayout,
    });
  },
  // POST /
  // adminRegister: async (req,res) => {
  //   const {  email, password, confirmPassword } = req.body;

  //   const isExist = await User.findOne({ email,isAdmin:true });

  //   if (isExist) {
  //     req.flash("error", "User already exists, Please login");
  //     console.log("User already exists, Please login");
  //     res.redirect("/admin/login");
  //   }

  //   if (password < 6 && confirmPassword < 6) {
  //     req.flash("error", "Password is less than 6 character");
  //     res.redirect("admin/register");
  //   } else {
  //     if (password === confirmPassword) {
  //       const hashpwd = await bcrypt.hash(password, 12);
  
  //       const user = new User({

          
  //         email,
  //         password: hashpwd,
  //         isAdmin: true
  //       });

  //       await user.save()


  
  //       if (user) {
  //         req.flash("success", "User successfully created!!");
  //         res.redirect("/admin/login");
  //       } else {
  //         req.flash("error", "User not created");
  //         res.redirect("/admin/register");
  //       }
  //     } else {
  //       req.flash("error", "Password does not match");
  //       console.log("Password does not match");
  //       res.redirect("/admin/register");
  //     }
  //   }
  // },

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
    req.session.destroy();
    res.redirect("/admin/login");
  },
  
}

// const { validationResult } = require("express-validator");
// const bcrypt = require("bcrypt");

// //model

// const User = require("../model/userSchema");
// const { sendOtpEmail } = require("../helper/userVerificationHelper");
// const OTP = require("../model/otpSchema");

// module.exports = {
//   getUserLogin: async (req, res) => {
//     console.log(req.locals);
//     res.render("auth/user/login");
//   },
//   getUserRegister: async (req, res) => {
//     console.log(req.locals);
//     res.render("auth/user/register");
//   },
//   userRegister: async (req, res) => {
//     const { username, email, password, confirmPassword } = req.body;
//     console.log(req.body);

//     const existUser = await User.findOne({ email });
//     if (existUser) {
//       req.flash("success", "Email already in use");
//       return res.redirect("/register");
//     }
//     if (password !== confirmPassword) {
//       req.flash("error", "Password not matching");
//       return res.redirect("/register");
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = new User({
//       username,
//       email,
//       password,
//       confirmPassword,
//     });

//     try {
//       const savedUser = await user.save();
//       if (!savedUser) {
//         req.flash("error", "user registered unsuccessfully");
//         return res.redirect("/register");
//       } else {
//         req.session.verifyToken = savedUser._id;
//         const isOtpSent = sendOtpEmail(savedUser, res);
//         if (isOtpSent) {
//           req.flash(
//             "success",
//             "user registered successfully, please verify your email"
//           );
//           return res.redirect("/otp-verify");
//         } else {
//           req.flash(
//             "error",
//             "User registration unsuccessfull, please try to logged in"
//           );
//           return res.redirect("/login");
//         }
//       }
//     } catch (error) {
//       console.log(error), req.flash("error", "user registered unsuccessfully");
//       return res.redirect("/register");
//     }
//   },

//   userLogin: async (req, res) => {
//     console.log(req.body);
//     const { email, password } = req.body;
//     const user = await User.findOne({ email, isAdmin: false });
//     if (!user) {
//       req.flash("error", "User does not exit or invalid credentials");
//       return res.redirect("/login");
//     }

//     isValid = await bcrypt.compare(password, user.password);
//     if (!isValid) {
//       req.flash("error", "invalid credential");
//       return res.redirect("/login");
//     }
//     req.session.user = user;
//     req.flash("success", "user successfully logged in");
//     return res.redirect("/");
//   },
//   getForgetPassword: async (req, res) => {
//     res.render("auth/user/forget-pass.ejs");
//   },
//   getResetPassword: async (req, res) => {
//     res.render("auth/user/reset-pass.ejs");
//   },
//   getForgetPasswordverify: async (req, res) => {
//     if (!req.session.forgetToken) {
//       return res.redirect("/");
//     }
//     res.render("auth/user/forgetOtp.ejs");
//   },
//   getVerifyOtp: async (req, res) => {
//     if (!req.session.verifyToken) {
//       return res.redirect("/");
//     }
//     res.render("auth/user/otp-verify.ejs");
//   },
//   verifyOtp: async (req, res) => {
//     console.log(req.body);
//     try {
//       // Check if verifyToken exists in session
//       if (!req.session.verifyToken) {
//         // return res.status(401).json({ message: "Verification token not found" });
//         req.flash("error", "verification token not found");
//         return res.redirect("/");
//       }

//       const userId = req.session.verifyToken;
//       const otpData = await OTP.findOne({ userId: userId });

//       // Check if OTP data exists
//       if (!otpData) {
//         // return res.status(404).json({ message: "OTP data not found" });
//         req.flash("error", "OTP data not found");
//         return res.redirect("/otp-verify");
//       }

//       // Compare OTP
//       const validOtp = await bcrypt.compare(req.body.otp, otpData.otp);

//       // Check if OTP is valid
//       if (!validOtp) {
//         // return res.status(400).json({ message: "Invalid OTP" });
//         req.flash("error", "Invalid OTP");
//         return res.redirect("/otp-verify");
//       }

//       // Update user verification status
//       let user = await User.findOne({ _id: otpData.userId });
//       user.isVerified = true;
//       await user.save();

//       // Success response
//       req.flash("success", "User verification successful");
//       delete req.session.verifyToken; // Clear the verification token from session
//       return res.redirect("/login");
//     } catch (error) {
//       console.error(error); // Log the error for debugging purposes
//       // return res.status(500).json({ message: "Internal server error" });
//       req.flash("error", "Internal server error");
//       return res.redirect("/otp-verify");
//     }
//   },
//   forgetPassword: async (req, res) => {
//     console.log(req.body);
//     try {
//       const { email } = req.body;
//       const user = await User.findOne({ email });
//       if (!user) {
//         req.flash("error", "User email does not exist");
//         return res.redirect("/forgetPass");
//       } else {
//         const isOtpSent = sendOtpEmail(user, res);
//         req.session.forgetToken = user._id;
//         return res.redirect("/forget-otp-verify");
//       }
//     } catch (err) {
//       console.error(err);
//       req.flash("error", "An error occurred");
//       return res.redirect("/forgetPass");
//     }
//   },
//   resetPassword: async (req, res) => {
//     console.log(req.body);
//     try {
//       const { password, confirmPassword } = req.body;
//       if (password !== confirmPassword) {
//         req.flash("error", "password doesnot match");
//         return res.redirect("/resetPass");
//       }
//       const userId = req.session.forgetToken;
//       const hashPass = await bcrypt.hash(password, 10);
//       const user = await User.updateOne(
//         { _id: userId },
//         { $set: { password: hashPass } }
//       );
//       if (user) {
//         req.flash("success", "Password successfully reset");
//         return res.redirect("/login");
//       } else {
//         req.flash("error", "password not reseted please try again");
//         return res.redirect("/resetPass");
//       }
//     } catch (err) {
//       console.error(err);
//       req.flash("error", "An error occurred");
//       return res.redirect("/resetPass");
//     }
//   },
//   forgetOtpVerify: async (req, res) => {
//     try {
//       // Check if verifyToken exists in session
//       if (!req.session.forgetToken) {
//         // return res.status(401).json({ message: "Verification token not found" });
//         req.flash("error", "session timed out");
//         return res.redirect("/forget-otp-verify");
//       }

//       const userId = req.session.forgetToken;
//       const otpData = await OTP.findOne({ userId: userId });

//       // Check if OTP data exists
//       if (!otpData) {
//         // return res.status(404).json({ message: "OTP data not found" });
//         req.flash("error", "OTP data not found");
//         return res.redirect("/forget-otp-verify");
//       }

//       // Compare OTP
//       const validOtp = await bcrypt.compare(req.body.otp, otpData.otp);

//       // Check if OTP is valid
//       if (!validOtp) {
//         // return res.status(400).json({ message: "Invalid OTP" });
//         req.flash("error", "Invalid OTP");
//         return res.redirect("/forget-otp-verify");
//       }

//       // Success response
//       req.flash(
//         "success",
//         "OTP verification successful, please change your password"
//       );
//       delete req.session.verifyToken; // Clear the verification token from session
//       return res.redirect("/resetPass");
//     } catch (error) {
//       console.error(error); // Log the error for debugging purposes
//       // return res.status(500).json({ message: "Internal server error" });
//       req.flash("error", "Internal server error");
//       return res.redirect("/forget-otp-verify");
//     }
//   },
//   getAdminRegister: async (req, res) => {
//     res.render("auth/admin/register.ejs");
//   },
//   getAdminLogin: async (req, res) => {
//     res.render("auth/admin/login.ejs");
//   },
//   adminRegister: async (req, res) => {
//     const { username, email, password, confirmPassword } = req.body;
//     console.log(req.body);
//     const exist = await User.findOne({ email });
//     if (exist) {
//       req.flash("error", "Email already exist");
//       return res.render("/admin/register");
//     }
//     if (password !== confirmPassword) {
//       req.flash("error", "password doesnot match");
//       return res.render("/admin/register");
//     }
//     const user = new User({
//       username,
//       email,
//       password,
//       isAdmin: true,
//     });

//     const adminSave = await user.save();
//     if (adminSave) {
//       req.flash("success", "admin registered successfully, please login");
//       return res.redirect("/admin/login");
//     } else {
//       req.flash("error", "admin registeration failed");
//       return res.redirect("/admin/register");
//     }
//   },
//   adminLogin: async (req, res) => {
//     const { email, password } = req.body;
//     console.log(req.body);
//     const adminExist = await User.findOne({ email ,isAdmin:true});
//     if (!adminExist) {
//       req.flash("error", "Invalid credential");
//       return res.redirect("/admin/login");
//     }
//     const isPassValid = await bcrypt.compare(password, adminExist.password);
//     if (!isPassValid) {
//       req.flash("error", "password not matching");
//       return res.redirect("/admin/login");
//     }

//     req.session.admin = adminExist;
//     req.flash("success", "admin successfully logged in");
//     return res.redirect("/admin");
//   },
// };