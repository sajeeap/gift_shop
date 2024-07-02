const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");

module.exports = {

    getCart: async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ error: "Please log in to view your cart." });
        }

        try {
            const userId = req.session.user._id;
            let cart = await Cart.findOne({ userId }).populate("items.product_id");

            let errors = [];
            let totalPrice = 0;
            let totalItems = 0;

            if (!cart) {
                cart = new Cart({
                    userId,
                    items: [],
                });
            } else {
                for (const item of cart.items) {
                    const product = item.product_id; 
                   

                    if (!product) {
                        errors.push(`The Product ${item.product_id} is not found!!`);
                        continue;
                    }

                    if (!product.isActive) {
                        errors.push(`The Product ${product.product_name} is not available!!`);
                        continue;
                    }

                    // if (item.quantity > product.stock) {
                    //     item.outOfStock = true;
                    //     errors.push(`The Product ${product.product_name} is out of stock!!`);
                    // } else {
                    //     item.outOfStock = false;
                    // }

                    const itemTotal = product.price * item.quantity;
                    item.itemTotal = itemTotal;
                    totalPrice += itemTotal;

                    totalItems += item.quantity;

                }

                await cart.save();
            }

            res.render("shop/cart", {
                user: req.session.user,
                cart: {
                    items: cart.items,
                    totalPrice,
                    totalItems,
                    errorMsg: errors,
                }
            });

        } catch (error) {
            console.error('Cart error:', error);
            res.status(500).json({ error: "An error occurred while fetching the cart." });
        }
    },


    addToCart: async (req, res) => {
        try {
            const { productId, quantity } = req.body;
            console.log('Received productId:', productId); // 

            // Ensure productId is valid
            if (!productId) {
                return res.status(400).json({ error: "Product ID is required." });
            }

            // Fetch the product from the database
            const product = await Product.findById(productId);
            console.log("got the product", product);

            // Check if product exists
            if (!product) {
                return res.status(404).json({ error: "Product not found." });
            }

            if (!quantity || quantity < 1) {
                return res.status(400).json({ error: "Quantity must be at least 1." });
            }

            // Check if product is in stock
            if (product.stock <= 0) {
                return res.status(400).json({ error: "Product is out of stock." });
            }

            // Get the userId from session (assuming you have this set in a middleware)
            const userId = req.session.user._id;

            // Find or create a cart for the user
            let cart = await Cart.findOne({ userId }).populate("items.product_id");



            if (!cart) {
                cart = new Cart({ userId, items: [] });
            }





            // Check if the product already exists in the cart
            const existingItem = cart.items.find(item => item.product_id._id.toString() === productId.toString());

            console.log(cart.items);


            if (existingItem) {
                // If product already exists, return an error
                return res.json({ error: 'exist' });
            } else {
                // Add new item to the cart
                cart.items.push({ product_id: productId, quantity: quantity, price: product.price });
            }





            // Save the cart
            await cart.save();
            res.json({ success: true });

        } catch (error) {
            console.error('Error adding to cart:', error);
            res.status(500).json({ error: "An error occurred while adding the product to the cart." });
        }


    },

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
        const { itemId, newQuantity } = req.body;

        try {
            let cart = await Cart.findOne({ userId: req.session.user._id }).populate("items.product_id");

            if (!cart) {
                return res.status(404).json({ error: 'Cart not found.' });
            }

            const itemToUpdate = cart.items.find(item => item._id.toString() === itemId);

            if (!itemToUpdate) {
                return res.status(404).json({ error: 'Item not found in cart.' });
            }

            itemToUpdate.quantity = newQuantity;

            let totalPrice = 0;
            cart.items.forEach(item => {
                const itemTotal = item.product_id.price * item.quantity;
                item.itemTotal = itemTotal;
                totalPrice += itemTotal;
            });

            await cart.save();

            res.json({ success: true, cart: { items: cart.items, totalPrice } });
        } catch (error) {
            console.error('Error updating cart item quantity:', error);
            res.status(500).json({ error: 'Failed to update cart item quantity.' });
        }
    }






}

