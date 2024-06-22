const express = require('express');
const router =express.Router();

//controller

const shopController = require('../controller/shopController')


//productlist
router.get("/product-list",shopController.getProductList )

//prduct details
router.get("/product-details/:id", shopController.getProductDetails)
router.get("/dummy", shopController.dummy)



module.exports = router