const express = require('express');
const router = express.Router();

//authcontroller
const authController = require('../controller/authController');

const { isLoggedOut } = require('../middleware/logoutMiddileware');

//user

router.get('/login', isLoggedOut, authController.getUserLogin);
router.get('/register', isLoggedOut, authController.getUserRegister);

router.post('/login', authController.userLogin);
router.post('/register', authController.userRegister);

// router
//   .route("/verifyOtp")
//   .get( isLoggedOut, authController.getVerifyOtp )
//   .post(authController.verifyOtp);

/*GET verifyotp */
router
  .route("/verifyOtp")
  .get(authController.getVerifyOtp)
  .post(authController.verifyOtp);

/*GET forgetpassword */

router
  .route("/forgetPass")
  .get(authController.getForgetPassword)
  .post(authController.forgetPassword);

/*GET ForgetPassotp */

router
  .route("/forget-otp-verify")
  .get(authController.getForgetPasswordverify)
  .post(authController.forgetOtpVerify);

/*GET ResetPass */

router
  .route("/resetPass")
  .get(authController.getResetPassword)
  .post(authController.resetPassword);

  router.get('/resend-otp',authController.resendOtp)




  router.get("/logout", authController.getUserLogout);
  




//admin

router
.route('/admin/register')
.get(authController.getAdminRegister)
.post(authController.adminRegister)

/* GET admin login */

router
.route('/admin/login')
.get(authController.getAdminLogin)
.post(authController.adminLogin)

router.get('/admin/logout', authController.AdminLogout);








module.exports = router;


