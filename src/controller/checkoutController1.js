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

const createRazorpayOrder = async (order_id, total) => {
  let options = {
    amount: total * 100, // amount in the smallest currency unit
    currency: "INR",
    receipt: order_id.toString(),
  };
  const order = await razorpayInstance.orders.create(options);
  return order;
};

const checkProductExistence = async (cartItem) => {
  const product = await Product.findById(cartItem.product_id._id);
  if (!product || !product.isActive) {
    throw new Error(`${product.product_name} is not available`);
  }
  return product;
};

const checkStockAvailability = async (cartItem) => {
  const product = await Product.findById(cartItem.product_id._id);
  const variant = product.variants.find(
    (variant) => variant._id.toString() === cartItem.variant.toString()
  );
  if (variant.stock < cartItem.quantity) {
    throw new Error(`${product.product_name} does not have enough stock`);
  }
  return product;
};

async function assignUniqueOrderIDs(items) {
  for (const item of items) {
    let isUnique = false;
    while (!isUnique) {
      const generatedOrderID = generateShortId();
      const existingOrder = await Order.findOne({
        "items.orderID": generatedOrderID,
      });
      if (!existingOrder) {
        item.orderID = generatedOrderID;
        isUnique = true;
      }
    }
  }
}

module.exports = {
  getCheckOutPage: async (req, res) => {
    try {
      const userId = req.session.user._id;
      const razorKeyId = process.env.RAZOR_PAY_KEY_ID;

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
          item.itemTotal = total;
          totalItems += item.quantity;
          totalPrice += total;
        }
      }

      res.render("shop/checkout", {
        user: req.session.user,
        cart,
        totalItems,
        totalPrice,
        address,
        wishlist,
        walletBalance,
        razorKeyId,
        coupons,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error loading checkout page");
    }
  },

  placeOrder: async (req, res) => {
    try {
      const { paymentMethod, addressId } = req.body;
      const userId = req.session.user._id;

      const address = await Address.findOne({ _id: addressId, customer_id: userId, delete: false });
      const cart = await Cart.findOne({ userId }).populate("items.product_id");

      if (!address) {
        return res.status(400).send("Invalid address");
      }

      if (!paymentMethod) {
        return res.status(400).send("Please select a payment method");
      }

      if (!cart || cart.items.length === 0) {
        return res.status(400).send("Your cart is empty");
      }

      const status = paymentMethod === "COD" || paymentMethod === "Wallet" ? "Confirmed" : "Pending";
      const paymentStatus = paymentMethod === "COD" || paymentMethod === "Wallet" ? "Paid" : "Pending";

      await Promise.all(cart.items.map(item => checkProductExistence(item)));
      await Promise.all(cart.items.map(item => checkStockAvailability(item)));

      let order = new Order({
        customer_id: userId,
        items: cart.items,
        totalPrice: cart.totalPrice,
        paymentMethod,
        paymentStatus,
        status,
        shippingAddress: address,
      });

      await assignUniqueOrderIDs(order.items);

      if (paymentMethod === "Wallet") {
        const wallet = await Wallet.findOne({ userId });
        if (wallet.balance < order.totalPrice) {
          return res.status(400).send("Insufficient wallet balance");
        }
        wallet.balance -= order.totalPrice;
        wallet.transactions.push({
          date: new Date(),
          amount: order.totalPrice,
          message: "Order placed successfully",
          type: "Debit",
        });
        await wallet.save();
      }

      if (paymentMethod === "COD") {
        await order.save();
        await Cart.clearCart(userId);
        return res.status(200).json({
          success: true,
          message: "Order placed successfully",
        });
      }

      if (paymentMethod === "Razor Pay") {
        await order.save();
        const razorpayOrder = await createRazorpayOrder(order._id, order.totalPrice);
        await Payment.create({
          payment_id: razorpayOrder.id,
          amount: order.totalPrice,
          currency: razorpayOrder.currency,
          order_id: order._id,
          status: razorpayOrder.status,
          created_at: new Date(),
        });
        return res.json({
          status: true,
          order: razorpayOrder,
          user: req.session.user,
        });
      }

      return res.status(400).send("Invalid payment method");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error placing order");
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const secret = process.env.RAZOR_PAY_KEY_SECRET;
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body.response;

      let hmac = crypto.createHmac("sha256", secret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      hmac = hmac.digest("hex");

      if (hmac === razorpay_signature) {
        const order = await Order.findOneAndUpdate(
          { _id: razorpay_order_id },
          {
            $set: { status: "Confirmed", paymentStatus: "Paid" },
          }
        );
        await Cart.clearCart(req.session.user._id);
        return res.json({ success: true });
      } else {
        return res.status(400).json({ success: false, message: "Payment verification failed" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Error verifying payment");
    }
  },

  orderConfirmation: async (req, res) => {
    res.render("shop/order-confirmation", { user: req.session.user });
  },

  orderErrors: async (req, res) => {
    res.render("shop/order-error", { user: req.session.user });
  },
};
