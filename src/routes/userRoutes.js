const express = require('express');
const router = express.Router();

//authcontroller
const userController = require('../controller/userController');

const shopController = require("../controller/shopController")

const authMiddleware = require('../middleware/authMiddleware');







//user profile
router
    .route("/profile")
    .get(userController.getProfile)
    .post(userController.editProfile)

//change password
router
    .route("/change-password")
    .post(userController.changePassword)

//whishlist
router
    .route("/whishlist")
    .get(userController.getWhishlist)


//address
router
    .route("/address")
    .get(userController.getAddress)



module.exports = router;
