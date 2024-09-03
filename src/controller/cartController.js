const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");
const Wishlist = require("../model/whishlistSchema")
const Category = require("../model/categorySchema")

module.exports = {

    getCart: async (req, res) => {

       
        
        try {
           
            const user = req.session.user
            if (!user) {
                return res.status(401).json({ error: "Please log in to view your cart." });
            }
            const userId =user._id;
            let cart = await Cart.findOne({ userId }).populate("items.product_id");
            const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");
    
            let errors = [];
            let totalItems = 0;
            let totalPrice = 0;
    
            if (!cart) {
                cart = new Cart({
                    userId,
                    items: [],
                });
            } else {
                for (const item of cart.items) {
                    const product = item.product_id;
                    let itemTotal = 0;
                    let discountedPrice = product.price;
    
                    if (product) {
                        const category = await Category.findById(product.category);
    
                        if (category && category.onOffer) {
                            // Apply category discount
                            if (category.offerDiscountRate > 0) {
                                discountedPrice -= (discountedPrice * category.offerDiscountRate / 100);
                            }
                        }
    
                        if (product.onOffer) {
                            // Apply product-specific discount
                            if (product.offerDiscountRate > 0) {
                                discountedPrice -= (discountedPrice * product.offerDiscountRate / 100);
                            } else if (product.offerDiscountPrice > 0) {
                                discountedPrice -= product.offerDiscountPrice;
                            }
                        }
    
                        itemTotal = discountedPrice * item.quantity;
                        totalPrice += itemTotal;
                        totalItems += item.quantity;
    
                        if (discountedPrice < product.price) {
                            item.discountedPrice = discountedPrice;
                        } else {
                            delete item.discountedPrice; // No discount
                        }
    
                        item.itemTotal = itemTotal;
    
                        if (!product.isActive) {
                            errors.push(`The Product ${product.product_name} is not available!!`);
                        }
    
                        if (item.quantity > product.stock) {
                            item.outOfStock = true;
                            errors.push(`The Product ${product.product_name} is out of stock!!`);
                        } else {
                            item.outOfStock = false;
                        }
                    } else {
                        errors.push(`The Product ${item.product_id} is not found!!`);
                    }
                }
    
                await cart.save();
            }

            console.log(totalPrice);
    
            res.render("shop/cart", {
                user: req.session.user,
                cart: {
                    items: cart.items,
                    totalPrice,
                    totalItems,
                    errorMsg: errors,
                },
                wishlist
            });
    
        } catch (error) {
            console.error('Cart error:', error);
            res.status(500).json({ error: "An error occurred while fetching the cart." });
        }
    },
    addToCart: async (req, res) => {
        try {
            const { productId, quantity } = req.body;
    
            if (!productId) {
                return res.status(400).json({ error: "Product ID is required." });
            }
    
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ error: "Product not found." });
            }
    
            if (!quantity || quantity < 1) {
                return res.status(400).json({ error: "Quantity must be at least 1." });
            }
    
            if (quantity > product.stock) {
                return res.status(400).json({ error: "Quantity exceeds available stock." });
            }
    
            const userId = req.session.user?._id;
            if (!userId) {
                return res.status(401).json({ error: "User not authenticated." });
            }
    
            let cart = await Cart.findOne({ userId }).populate("items.product_id");
    
            if (!cart) {
                cart = new Cart({ userId, items: [] });
            }
    
            const existingItem = cart.items.find(item => item.product_id._id.toString() === productId.toString());
    
            if (existingItem) {
                const updatedQuantity = existingItem.quantity + quantity;
    
                if (updatedQuantity > product.stock) {
                    return res.status(400).json({ error: "Quantity exceeds available stock." });
                }
    
                existingItem.quantity = updatedQuantity;
    
                // Update itemTotal
                const category = await Category.findById(product.category);
    
                let productPrice = product.price;
                if (category?.onOffer && category.offerDiscountRate > 0) {
                    productPrice -= (productPrice * category.offerDiscountRate / 100);
                }
    
                if (product.onOffer) {
                    if (product.offerDiscountRate > 0) {
                        productPrice -= (productPrice * product.offerDiscountRate / 100);
                    } else if (product.offerDiscountPrice > 0) {
                        productPrice -= product.offerDiscountPrice;
                    }
                }
    
                existingItem.price = productPrice;
                existingItem.itemTotal = existingItem.quantity * productPrice;
            } else {
                // Add new item
                let productPrice = product.price;
                const category = await Category.findById(product.category);
    
                if (category?.onOffer && category.offerDiscountRate > 0) {
                    productPrice -= (productPrice * category.offerDiscountRate / 100);
                }
    
                if (product.onOffer) {
                    if (product.offerDiscountRate > 0) {
                        productPrice -= (productPrice * product.offerDiscountRate / 100);
                    } else if (product.offerDiscountPrice > 0) {
                        productPrice -= product.offerDiscountPrice;
                    }
                }
    
                const itemTotal = productPrice * quantity;
                cart.items.push({ product_id: product._id, quantity, price: productPrice, itemTotal });
            }
    
            // Update totals
            cart.items = cart.items.map(item => {
                item.itemTotal = item.quantity * item.price;
                return item;
            });
    
            const totalPrice = cart.items.reduce((sum, item) => sum + item.itemTotal, 0);
    
            await cart.save();
            res.json({ success: true, cart: { items: cart.items, totalPrice } });
    
        } catch (error) {
            console.error('Error adding to cart:', error);
            res.status(500).json({ error: "An error occurred while adding the product to the cart." });
        }
    },
    
    
    
// addToCart: async (req, res) => {
//     try {
//         const { productId, quantity } = req.body;

//         if (!productId) {
//             return res.status(400).json({ error: "Product ID is required." });
//         }

//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ error: "Product not found." });
//         }

//         if (!quantity || quantity < 1) {
//             return res.status(400).json({ error: "Quantity must be at least 1." });
//         }

//         if (quantity > product.stock) {
//             return res.status(400).json({ error: "Quantity exceeds available stock." });
//         }

//         const userId = req.session.user?._id;
//         if (!userId) {
//             return res.status(401).json({ error: "User not authenticated." });
//         }
       
//         let cart = await Cart.findOne({ userId }).populate("items.product_id");


        

//         if (!cart) {
//             cart = new Cart({ userId, items: [] });
//         }

//         console.log("cart//////////////////////",cart);

//         const existingItem = cart.items.find(item => item.product_id._id.toString() === productId.toString());
//         console.log("...........................................................................................", cart.items);
//         console.log("existing item////////////////////////////////////////////////////////////////", existingItem);
//         const productIdString = productId.toString();
//         console.log('Product ID:', productIdString);
      
//         if (existingItem) {
//             const updatedQuantity = existingItem.quantity + quantity;

           

//             if (updatedQuantity > product.stock) {
//                 return res.status(400).json({ error: "Quantity exceeds available stock." });
//             }

//             existingItem.quantity = updatedQuantity;

//             return res.status(500).json({ error : "existing item!!!!"})


//         } else {
//             let productPrice = product.price;
//             const category = await Category.findById(product.category);

//             if (category?.onOffer && category.offerDiscountRate > 0) {
//                 productPrice -= (productPrice * category.offerDiscountRate / 100);
//             }

//             if (product.onOffer) {
//                 if (product.offerDiscountRate > 0) {
//                     productPrice -= (productPrice * product.offerDiscountRate / 100);
//                 } else if (product.offerDiscountPrice > 0) {
//                     productPrice -= product.offerDiscountPrice;
//                 }
//             }

//             const itemTotal = productPrice * quantity;
//             cart.items.push({ product_id: productId, quantity, price: productPrice, itemTotal });
//         }

//         cart.items = cart.items.map(item => {
//             item.itemTotal = item.quantity * item.price;
//             return item;
//         });

//         const totalPrice = cart.items.reduce((sum, item) => sum + item.itemTotal, 0);

//         await cart.save();
//         res.json({ success: true, cart: { items: cart.items, totalPrice } });

//     } catch (error) {
//         console.error('Error adding to cart:', error);
//         res.status(500).json({ error: "An error occurred while adding the product to the cart." });
//     }
// },

    
    
    
    

    removeFromCart: async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ error: "Please log in to view your cart." });
        }

        try {
            const userId = req.session.user._id;
            const { itemId } = req.body;

            let cart = await Cart.findOne({ userId });
            if (!cart) {
                return res.status(404).json({ error: "Cart not found." });
            }

            cart.items = cart.items.filter(item => item._id.toString() !== itemId);
            await cart.save();

            res.redirect("/cart");
        } catch (error) {
            console.error('Error removing item from cart:', error);
            res.status(500).json({ error: "An error occurred while removing the item from the cart." });
        }
    },

    updateQuantity: async (req, res) => {
        try {
            const { itemId, newQuantity } = req.body;
            if (!Number.isInteger(newQuantity) || newQuantity < 1) {
                return res.status(400).json({ error: 'Invalid quantity.' });
            }
    
            let cart = await Cart.findOne({ userId: req.session.user._id || req.session.user }).populate("items.product_id");
    
            if (!cart) {
                return res.status(404).json({ error: 'Cart not found.' });
            }
    
            const itemToUpdate = cart.items.find(item => item._id.toString() === itemId);
            console.log("update item:", itemToUpdate);
    
            if (!itemToUpdate) {
                return res.status(404).json({ error: 'Item not found in cart.' });
            }
    
            const product = itemToUpdate.product_id;
    
            if (newQuantity > product.stock) {
                return res.status(400).json({ error: "Quantity exceeds available stock." });
            }
    
            itemToUpdate.quantity = newQuantity;
            itemToUpdate.itemTotal = newQuantity * product.price;
    
            let totalPrice = 0;
            cart.items.forEach(item => {
                item.itemTotal = item.quantity * item.product_id.price;
                totalPrice += item.itemTotal;
            });
    
            await cart.save();
    
            res.json({ success: true, cart: { items: cart.items, totalPrice } });
        } catch (error) {
            console.error('Error updating cart item quantity:', error);
            res.status(500).json({ error: 'Failed to update cart item quantity.' });
        }
    }
    
    
    
    





}

