const express = require('express')
const router = express.Router()

// Admin Controller
const adminController = require('../controller/adminController')
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController")
const {productUpload, upload } = require("../middleware/multer");


const { isAdminLoggedIn } = require("../middleware/authMiddleware");


router.get('/', isAdminLoggedIn, adminController.getDashboard)


//category management
router.get('/category', isAdminLoggedIn, categoryController.getCategory);

router.get('/add-category', isAdminLoggedIn, categoryController.getAddCategory);
router.post("/add-category",categoryController.addCategory)


router.get('/edit-category/:id', isAdminLoggedIn, categoryController.getEditCategory);
router.post('/edit-category/:id', isAdminLoggedIn, categoryController.editCategory);
router.get('/delete-category/:id', isAdminLoggedIn, categoryController.deleteCategory)





//product controller

router.get('/products', isAdminLoggedIn, productController.getProducts);
router.get('/edit-products', isAdminLoggedIn, productController.getEditProducts);
router.get('/delete-product/:id', isAdminLoggedIn, productController.deleteProduct);
router.get("/stocks",isAdminLoggedIn, productController.getStocks)
router.post("/update-stock", isAdminLoggedIn, productController.updateStocks)

router
  .route("/add-product")
  .get(isAdminLoggedIn, productController.getAddProducts)
  .post(
    isAdminLoggedIn,
    productUpload.fields([
      { name: "images", maxCount: 3 },
      { name: "primaryImage", maxCount: 1 }
    ]),
    productController.addProducts
  );


  router
  .route("/edit-product/:id")
  .get(isAdminLoggedIn, productController.getEditProducts)
  .post(
    isAdminLoggedIn,
    productUpload.fields([
      { name: 'primaryImage', maxCount: 1 },
      { name: 'image2', maxCount: 1 },
      { name: 'image3', maxCount: 1 }
    ]),
    productController.editProduct
  );


  //user managment
  router
  .route("/users")
  .get(isAdminLoggedIn,adminController.getUserList)

 

  router.route("/users/toggle-block/:id").patch(isAdminLoggedIn,adminController.toggleBlock);



module.exports = router