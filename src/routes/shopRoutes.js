const express = require('express')
const router =express.Router()



//controller

const shopController = require('../controllers/shopController')


router.get('/shop',shopController.getShop)
router.get('/product/:id',shopController.getProduct)







module.exports = router