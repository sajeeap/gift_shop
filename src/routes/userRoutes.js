const express = require('express');
const router=express.Router();

//authcontroller
const userController=require('../controller/userController');

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

module.exports = router;
