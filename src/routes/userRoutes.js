const express = require('express');
const router=express.Router();

//authcontroller
const userController=require('../controller/userController');
const {isLoggedIn} = require('../middleware/authMiddleware');


//getHome
router.get('/', userController.userHome);

module.exports = router;
