const mongoose = require("mongoose");
const Product = require("../model/productSchema");
const Cart = require("../model/cartSchema");
const User = require("../model/userSchema");
const Address = require("../model/addressSchema");
const Wishlist = require("../model/whishlistSchema");
const Order = require("../model/orderSchema");
const Wallet = require("../model/walletSchema");
const Coupon = require("../model/couponSchema");
const crypto = require("crypto");
const razorpayInstance = require("../config/razorPay");


function generateShortId(length = 8) {
  return crypto.randomBytes(length).toString('hex').slice(0, length).toUpperCase();
}

module.exports = {
  getCheckOutPage: async (req, res) => {
    try {
      const userId = req.session.user._id;
      const addresses = await Address.find({ customer_id : userId})
  
      const address = await Address.findOne({
        customer_id: userId,
        default: true,
        delete: false,
      });
  
      let cart = await Cart.findOne({ userId }).populate("items.product_id");
      const wishlist = await Wishlist.findOne({
        user_id: req.session.user,
      }).populate("products");
  
      // Fetch wallet balance
      const wallet = await Wallet.findOne({ userId: userId });
      const walletBalance = wallet ? wallet.balance : 0;
  
      // Fetch active coupons
      const coupons = await Coupon.find({
        isActive: true,
        expiry_date: { $gt: new Date() },
      });
  
      let totalItems = 0;
      let totalPrice = 0;
      let couponDiscount = 0;
      let couponDiscountPercentage = 0;
  
      if (cart) {
        for (const item of cart.items) {
          let total = 0;
          if (!item.itemTotal) {
            total = item.price * item.quantity;
          } else {
            total = item.itemTotal;
          }
          totalPrice += total;
          totalItems += item.quantity;
        }
      }
  
      // Fetch applied coupon code
      let appliedCouponCode = "";
      if (cart && cart.coupon) {
        const coupon = await Coupon.findById(cart.coupon);
        if (coupon) {
          appliedCouponCode = coupon.coupon_code;
          couponDiscountPercentage = coupon.discount_amount;
          couponDiscount = (totalPrice * coupon.discount_amount) / 100; // Calculate percentage discount
        }
      }
  
      // Calculate discounted total price
      const discountedTotalPrice = totalPrice - couponDiscount;
  
      res.render("shop/checkout", {
        user: req.session.user,
        addresses,
        address,
        cart,
        wishlist,
        totalPrice,
        discountedTotalPrice,
        totalItems,
        walletBalance,
        coupons,
        appliedCouponCode,
        couponDiscount,
        couponDiscountPercentage,
        useWallet: false, // Default value for the wallet checkbox
      });
    } catch (error) {
      console.error("Error getting checkout page:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get checkout page",
        error: error.message,
      });
    }
  },

 

  placeOrder: async (req, res) => {
    try {
        const { paymentoptions, address } = req.body;

        if (!paymentoptions) {
            return res.status(400).json({ success: false, message: "Please select a payment method" });
        }
        if (!address) {
            return res.status(400).json({ success: false, message: "Please select an address" });
        }

        let shippingAddress = await Address.findById(address);
        if (!shippingAddress) {
            return res.status(404).json({ success: false, message: "Shipping address not found" });
        }

        const userId = req.session.user._id;
        const user = await User.findById(userId);
        const userCart = await Cart.findOne({ userId });

        if (!user || !userCart) {
            return res.status(404).json({ success: false, message: "User or cart not found" });
        }

        // Format the shipping address
        shippingAddress = {
            name: shippingAddress.name,
            house_name: shippingAddress.house_name,
            locality: shippingAddress.locality,
            area_street: shippingAddress.area_street,
            phone: shippingAddress.phone,
            zipcode: shippingAddress.zip_code,
            state: shippingAddress.state,
            landmark: shippingAddress.landmark,
            city: shippingAddress.city,
            address: shippingAddress.address,
            formattedAddress: `${shippingAddress.name}, ${shippingAddress.house_name}(H), ${shippingAddress.locality}, ${shippingAddress.city}, ${shippingAddress.state}, PIN: ${shippingAddress.zip_code}`,
        };

        const items = [];
        let totalPrice = 0;

        // Check stock availability
        for (let i = 0; i < userCart.items.length; i++) {
            const item = userCart.items[i];
            const product = await Product.findById(item.product_id);

            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for product ${product.product_name}` });
            }

            const itemTotal = item.price * item.quantity;
            items.push({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                itemTotal: itemTotal,
                order_id: `${userId}-${Date.now()}-${i}` // Generate a unique order ID for each item
            });
            totalPrice += itemTotal;

            // Reduce stock
            product.stock -= item.quantity;
            await product.save();
        }

        let appliedCouponCode = null;
        let couponDiscount = 0;
        let couponDiscountPercentage = 0;
        if (userCart.coupon) {
            const coupon = await Coupon.findById(userCart.coupon);
            if (coupon) {
                appliedCouponCode = coupon.coupon_code;
                couponDiscountPercentage = coupon.discount_amount; // Update the discount percentage
                couponDiscount = (coupon.discount_amount / 100) * totalPrice; // Calculate discount amount
            }
        }

        const discountedTotalPrice = totalPrice - couponDiscount;

        // Check if COD is selected and the order total exceeds $1000
        if (paymentoptions === "COD" && discountedTotalPrice > 1000) {
            return res.status(400).json({
                success: false,
                message: "Cash on Delivery is not available for orders above $1000. Please choose another payment method.",
            });
        }

        // Handle wallet transactions
        const wallet = await Wallet.findOne({ userId: userId });
        let walletBalance = wallet ? wallet.balance : 0;
        let amountToBePaid = discountedTotalPrice;

        if (paymentoptions === "Wallet") {
            if (walletBalance >= discountedTotalPrice) {
                walletBalance -= discountedTotalPrice;
                amountToBePaid = 0;
            } else if (walletBalance > 0) {
                amountToBePaid -= walletBalance;
                walletBalance = 0;
            }
        }

        // Save wallet transaction
        if (wallet) {
            wallet.transactions.push({
                amount: discountedTotalPrice,
                type: "Debit",
                date: new Date(),
                message: "Order payment"
            });
            await wallet.save();
        }

        // Update wallet balance
        if (wallet) {
            await Wallet.findOneAndUpdate({ userId: userId }, { balance: walletBalance });
        }

        // Set order status and payment status
        const status = paymentoptions === "COD" || paymentoptions === "Wallet" ? "Placed" : "Pending";
        const paymentStatus = paymentoptions === "COD" ? "Pending" : "Paid";
        const orderId = generateShortId(); // Generate a unique order ID

        const order = new Order({
            orderId: orderId,
            customer_id: userId,
            items: items,
            totalPrice: totalPrice,
            discountedTotalPrice: discountedTotalPrice,
            paymentMethod: paymentoptions,
            paymentStatus: paymentStatus, // Initially set to Pending
            status: status,
            shippingAddress: shippingAddress,
            appliedCoupon: appliedCouponCode,
            couponDiscount: couponDiscount,
            couponDiscountPercentage: couponDiscountPercentage,
            paymentId: null // Initialize paymentId as null
        });

        await order.save();
        await Cart.findOneAndDelete({ userId });

        const wishlist = await Wishlist.findOne({ user_id: req.session.user }).populate("products");
        let cart = "cart is empty";

        return res.status(201).json({
            success: true,
            orderId,
            message: "Order placed successfully",
            paymentRequired: amountToBePaid > 0,
        });

        // return res.status(201).render("shop/orderConfirm", {
        //   user: req.session.user,
        //   order,
        //   wishlist,
        //   cart,
        // });

    } catch (error) {
        console.error("Error placing order:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to place order",
            error: error.message,
        });
    }
},

 
  

  successOrder: async(req,res)=>{
    const order = await Order.findOne({ orderId: req.params.id }); 
    const wishlist = await Wishlist.findOne({ user_id:req.session.user }).populate("products");
    let cart = await Cart.findOne({userId:req.session.user}).populate("items");
    

    try {
      res.render('shop/orderConfirm', {
        user: req.session.user,
        order,
        wishlist,
        cart,
      })

    } catch (error) {
      console.log(error);
    }
  },
 


  verifyPayment: async (req, res) => {
    try {
        const { paymentId, orderId } = req.body;  // Include orderId in the request
  
        if (!paymentId || !orderId) {
            return res.status(400).json({ success: false, message: "Missing required payment details" });
        }
  
        // Find the order using the provided orderId
        const order = await Order.findOne({ orderId, customer_id: req.session.user._id });
  
        if (!order) {
            return res.status(404).json({ success: false, message: "Invalid Order ID" });
        }
  
        // Update the order with the payment ID and mark it as paid
        order.paymentId = paymentId;
        order.paymentStatus = "Paid";  // Update the payment status to "Paid"
        order.status = "Placed";  // Update the order status to "Placed"
        await order.save();
  
        return res.status(200).json({ success: true, message: "Payment verified successfully" });
    } catch (error) {
        console.error("Error verifying payment:", error);
        return res.status(500).json({ success: false, message: "Failed to verify payment", error: error.message });
    }
  },


  
  
 
  // verifyPayment: async (req, res) => {
  // try {
  //     const { paymentId, orderId } = req.body;  // Include orderId in the request

  //     if (!paymentId || !orderId) {
  //         return res.status(400).json({ success: false, message: "Missing required payment details" });
  //     }

  //     // Find the order using the provided orderId
  //     const order = await Order.findOne({ orderId, customer_id: req.session.user._id });

  //     if (!order) {
  //         return res.status(404).json({ success: false, message: "Invalid Order ID" });
  //     }

  //     // Update the order with the payment ID and mark it as paid
  //     order.paymentId = paymentId;
  //     order.paymentStatus = "Paid";
  //     await order.save();

  //     return res.status(200).json({ success: true, message: "Payment verified successfully" });
  // } catch (error) {
  //     console.error("Error verifying payment:", error);
  //     return res.status(500).json({ success: false, message: "Failed to verify payment", error: error.message });
  // }
  // },
 
  

  // verifyPayment: async (req, res) => {
  //   try {
  //     const payment_id = req.body.paymentId;
  //     console.log("paymentId.................................... 1", payment_id);
      
  
  //     if (payment_id) {
  //       // Find the order that is being paid for (you might need to pass the order ID in the request as well)
  //       const order = await Order.findOne({ customer_id: req.session.user._id, status: "Placed" });
  
  //       if (order) {
  //         // Update the order with the payment ID
  //         order.paymentId = payment_id;
  //         order.paymentStatus = "Paid"; // Update the payment status as well
  //         await order.save();
  
  //         res.json({ success: true });
  //       } else {
  //         res.status(404).json({ success: false, message: "Order not found" });
  //       }
  //     } else {
  //       res.status(400).json({ success: false, message: "Payment ID is missing" });
  //     }
  //   } catch (error) {
  //     console.error("Error verifying payment:", error);
  //     res.status(500).send("Internal Server Error");
  //   }
  // },
  

}