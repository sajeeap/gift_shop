const express = require('express');
const router =express.Router();

//controller

const shopController = require('../controller/shopController')


//getHome
router.get('/', shopController.userHome);

//productlist
router.get("/product-list",shopController.getProductList )

//prduct details
router.get("/product-details/:id", shopController.getProductDetails)




module.exports = router