const express = require('express');
const router =express.Router();

//controller

const shopController = require('../controller/shopController');
const checkOutController = require("../controller/checkoutController")


//getHome
router.get('/', shopController.userHome);

//productlist
router.get("/product-list",shopController.getProductList )

//prduct details
router.get("/product-details/:id", shopController.getProductDetails)

//checkout
router.get("/checkout", checkOutController.getCheckOut )




module.exports = router