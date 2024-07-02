const express = require('express');
const router = express.Router();

const cartController = require('../controller/cartController');


router.get("/cart" , cartController.getCart);
router.post("/cart", cartController.addToCart)

router.post("/update-quantity", cartController.updateQuantity)

router.post("/remove-from-cart", cartController.removeFromCart)


module.exports = router