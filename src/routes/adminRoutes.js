const express = require('express')
const router = express.Router()

// Admin Controller
const adminController = require('../controller/adminController')
const categoryController = require("../controller/categoryController");
const productController = require("../controller/productController")
const orderController = require("../controller/orderController")
const { productUpload, upload } = require("../middleware/multer");
const coupenController = require("../controller/couponController")
const salesReportController = require("../controller/reportController")
const offerController = require("../controller/offerController")


const { isAdminLoggedIn } = require("../middleware/authMiddleware");
const couponController = require('../controller/couponController');


router.get('/', isAdminLoggedIn, adminController.getDashboard)

//chart controller
router.get('/order-analysis',adminController.ChartCtrl);


//category management
router.get('/category', isAdminLoggedIn, categoryController.getCategory);

router.get('/add-category', isAdminLoggedIn, categoryController.getAddCategory);
router.post("/add-category", categoryController.addCategory)


router.get('/edit-category/:id', isAdminLoggedIn, categoryController.getEditCategory);
router.post('/edit-category/:id', isAdminLoggedIn, categoryController.editCategory);
router.get('/delete-category/:id', isAdminLoggedIn, categoryController.deleteCategory)





//product controller

router.get('/products', isAdminLoggedIn, productController.getProducts);
router.get('/edit-products', isAdminLoggedIn, productController.getEditProducts);
router.get('/delete-product/:id', isAdminLoggedIn, productController.deleteProduct);
router.get("/stocks", isAdminLoggedIn, productController.getStocks)
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
  .get(isAdminLoggedIn, adminController.getUserList)

router
  .route("/users/toggle-block/:id")
  .patch(isAdminLoggedIn, adminController.toggleBlock);

  

//order mangment 
router
  .route("/orders")
  .get(isAdminLoggedIn, orderController.getOrder)

router
  .route("/manage-status/:id")
  .post(isAdminLoggedIn, orderController.manageOrderStatus)

  router
  .route("/view-orders/:id")
  .get(isAdminLoggedIn, orderController.getAdminOrderDetails)


  //coupen routes

  router
  .route("/promocodes")
  .get(isAdminLoggedIn, coupenController.getCoupon)

  router
  .route("/add-promocodes")
  .get(isAdminLoggedIn, coupenController.getAddCoupon)
  .post(isAdminLoggedIn,coupenController.addCoupon)

  router
  .route("/edit-promocodes/:id")
  .get(isAdminLoggedIn, coupenController.getEditCoupon)
  .post(isAdminLoggedIn,coupenController.editCoupon)

  router.get('/delete-promocodes/:id', isAdminLoggedIn, couponController.deleteCoupon)


  //sales report
 // Route to get sales report
router.get('/sales-report', salesReportController.getSalesReport);

// Route to export sales report to Excel
router.get('/sales-report/export/excel', salesReportController.exportToExcel);

// Route to export sales report to PDF
router.get('/sales-report/export/pdf', salesReportController.exportToPdf);


//offer managemnt
// Category Offer
router.get('/category-offers', offerController.getCategoryOffers)
router.get('/category-details/:id', categoryController.getCategoryDetails)
router.patch('/category-offer/:id', offerController.addCatOffer)
router.patch('/toggle-active-category/:id', offerController.toggleActiveCatOffer)

// Product Offer
router.get('/product-offers', offerController.getProductOffers)
router.get('/product-details/:id', productController.getProdDetails)
router.patch('/product-offer/:id', offerController.addProdOffer)
router.patch('/toggle-active-product/:id', offerController.toggleActiveProdOffer)


router.get("/return",orderController.getReturn)

module.exports = router;
  
















module.exports = router