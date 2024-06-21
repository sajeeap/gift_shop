const express = require('express');
const router=express.Router();

//authcontroller
const userController=require('../controller/userController');
const {isLoggedIn, authenticateUser} = require('../middleware/authMiddleware');
const shopController = require("../controller/shopController")



//getHome
router.get('/', userController.userHome);

//productlist
router.get("/product-list",shopController.getProductList )
router.get("/product-Details")

//user profile
router
    .route("/profile")
    .get(authenticateUser,userController.getProfile)
    .post(userController.editProfile)

module.exports = router;
