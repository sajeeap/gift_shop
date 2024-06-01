const express = require('express')
const router = express.Router()

// Admin Controller
const adminController = require('../controller/adminController')
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController")
const { productUpload, upload } = require("../middleware/multer");


const { isAdminLoggedIn } = require("../middleware/authMiddleware");

// Common Middleware for Admin Routes
router.use((req, res, next) => {
    if (req.user && req.user.isAdmin) {
        res.locals.admin = req.user;
    }
  
    next();
});

router.get('/', isAdminLoggedIn, adminController.getDashboard)
// router.route("/category").get(categoryController.getCategory);
router.get('/category', isAdminLoggedIn, categoryController.getCategory);

router.get('/add-category', isAdminLoggedIn, categoryController.getAddCategory);
router.post("/add-category",categoryController.addCategory)


router.get('/edit-category/:id', isAdminLoggedIn, categoryController.getEditCategory);
router.post('/edit-category/:id', isAdminLoggedIn, categoryController.editCategory);
router.get('/delete-category/:id', isAdminLoggedIn, categoryController.deleteCategory)


router.get('/products', isAdminLoggedIn, productController.getProducts);
router.get('/edit-products', isAdminLoggedIn, productController.getEditProducts);
router.get('/delete-product/:id', isAdminLoggedIn, productController.deleteProduct);

router
  .route("/add-product")
  .get(isAdminLoggedIn,productController.getAddProducts)
  .post(
    isAdminLoggedIn,
    productUpload.fields([
      { name: "images", maxCount: 3 },
      { name: "primaryImage" },
    ]),
    productController.addProducts
  );

  router
  .route("/edit-product/:id")
  .get(isAdminLoggedIn,productController.getEditProducts)
  .post(
    isAdminLoggedIn,
    productUpload.fields([
      { name: "primaryImage" },
      { name: "secondaryImages", maxCount: 1 },
      { name: "secondaryImages1", maxCount: 1 },
    ]),
    productController.editProduct
  );





module.exports = router