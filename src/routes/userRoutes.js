const express = require('express');
const router = express.Router();

//authcontroller
const userController = require('../controller/userController');

const shopController = require("../controller/shopController")

const authMiddleware = require('../middleware/authMiddleware');
const checkOutController = require("../controller/checkoutController")
const orderController = require("../controller/orderController")


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
    .get(userController.getWishlist)
router
    .route("/add-to-wishlist")
    .post(userController.addToWishlist)
router
    .route("/remove-from-whishlist")
    .post(userController.removeFromWishlist)



//address
router
    .route("/address")
    .get(userController.getAddress)
router
    .route("/add-address")
    .post(userController.addAddress)
router
    .route("/edit-address")
    .post(userController.editAddress)
router
    .route("/delete-address")
    .post(userController.deleteAddress)
router
    .route("/set-default-address")
    .post(userController.setDefaultAddress)


//checkout
router.get("/checkout", checkOutController.getCheckOutPage )
router.post("/place-order", checkOutController.placeOrder)
router.get("/success-order", checkOutController.successOrder)

// router.get('/order-details/:orderId', orderController.getOrderDetails)
// router.get('/profile', orderController.getOrderDetails)

//User order managemnt
router.get("/profile", orderController.getUserOrders)












module.exports = router;
