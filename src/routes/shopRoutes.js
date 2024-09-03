const express = require('express');
const router =express.Router();

//controller

const shopController = require('../controller/shopController');
const checkOutController = require("../controller/checkoutController")
const reviewController = require("../controller/reviewController")




//getHome
router.get('/', shopController.userHome);

//productlist
router.get("/product-list",shopController.getProductList );
router.get('/product-list/search',shopController.getSearchSuggestions)

//prduct details
router.get("/product-details/:id", shopController.getProductDetails)
router.get("/product-stock/:id", shopController.stockcheck)

router.post("/product/:productId/review", )








module.exports = router