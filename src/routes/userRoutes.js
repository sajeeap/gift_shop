const express = require('express');
const router=express.Router();

//authcontroller
const userController=require('../controller/userController');
const {isLoggedIn} = require('../middleware/authMiddleware');
const shopController = require("../controller/shopController")



//getHome
router.get('/', userController.userHome);

//productlist
// router.get("/product-list",shopController.getProductList )
router.get("/product-Details")

module.exports = router;
