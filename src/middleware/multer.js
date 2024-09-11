const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination : (req, file, cb) =>{
        cb(null, path.join(__dirname, "../../public/uploads/images/"))
    },
    fileName : (req,file, cb) =>{
        const uniqueFileName = Date.now() + '-' + file.originalName;
        cb( null, uniquefileName )
    }
})

// Multer storage configuration
const categoryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../public/uploads/category-images/')); // Ensure this path matches where you want to store the images
    },
    filename: (req, file, cb) => {
      const uniqueFileName = Date.now() + '-' + file.originalname;
      cb(null, uniqueFileName);
    },
  });
  
  
  // Set up Multer for handling image uploads
  const categoryUpload = multer({
    storage: categoryStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
    },
    fileFilter: (req, file, cb) => {
      // Check file type (allow only images)
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
  });


const productStorage = multer.diskStorage({
    destination : ( req, file, cb ) => {
        cb( null, path.join(__dirname,'../../public/uploads/products-images/'))
    },
    filename : ( req, file, cb ) => {
        const uniqueFileName = Date.now() + '-' + file.originalname
        cb( null, uniqueFileName )
    }
})

module.exports  = {
    upload: multer({storage : storage}),
    productUpload: multer({storage : productStorage}),
    categoryUpload : multer({storage : categoryStorage}),
}