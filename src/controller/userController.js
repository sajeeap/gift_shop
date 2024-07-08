const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");
const User = require("../model/userSchema")
const bcrypt = require('bcrypt');
const Address = require("../model/addressSchema")
const Wishlist = require("../model/whishlistSchema")


const setDefaultAddress = async (req, res) => {
    try {
        const { addressId } = req.body;
        const customerId = req.session.user._id;

        await Address.updateMany({ customer_id: customerId, default: true }, { $set: { default: false } });
        await Address.findByIdAndUpdate(addressId, { $set: { default: true } })

        res.status(200).json({ success: true, message: "Default address set successfully" })
    } catch (error) {
        console.error("Error setting default address", error);
        res.status(500).json({ success: false, message: "Server Error" });

    }

}

module.exports = {

    getProfile: async (req, res) => {

        try {
            const userId = req.session.user; // Retrieve userId from session

            // Find user by userId
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).send('User not found');
            }

            //Get Addresses
            const addresses = await Address.find({
                customer_id: req.session.user._id,
                delete: false
            });

            if (!addresses) {
                throw new Error('No addresses found for the user.');
            }

            // Render profile page with updated user data
            res.render('user/profile', {
                user,
                addresses
            });

        } catch (error) {
            console.error('Error fetching profile:', error);
            res.status(500).send('An error occurred while fetching the profile');
        }

    },

    editProfile: async (req, res) => {
        try {
            const userId = req.session.user; // Retrieve userId from session

            // Find user by userId
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Update user's profile 
            const { firstName, lastName } = req.body;
            user.firstName = firstName || user.firstName;
            user.lastName = lastName || user.lastName;

            await user.save();

            // Send success response
            res.status(200).json({ message: 'Profile updated successfully' });
        } catch (error) {
            console.error('Error updating profile:', error);

            res.status(500).json({
                message: 'An error occurred while updating the profile',
                error: error.message,
            });
        }
    },


    //change password 
    changePassword: async (req, res) => {

        const { currentPassword, newPassword, confirmPassword } = req.body;

        try {
            // Check if the new passwords match
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ success: false, message: 'New passwords do not match' });
            }

            // Retrieve the user ID from the session
            const userId = req.session.user;

            // Find the user by ID
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Check if the current password is correct
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Current password is incorrect' });
            }

            // Validate new password complexity (optional, can be done client-side)
            if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 8 characters long and contain at least one uppercase letter and one digit'
                });
            }

            // Hash the new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 12);

            // Update the user's password
            user.password = hashedNewPassword;
            await user.save();

            // Send success response
            return res.status(200).json({ success: true, message: 'Password successfully changed' });

        } catch (error) {
            console.error('Error changing password:', error);
            return res.status(500).json({ success: false, message: 'An error occurred while changing the password' });
        }


    },


    //whishlist

    getWishlist: async (req, res) => {
        try {
            const locals = {
                title: "Wishlist",
            };

            if (!(req.session.user || req.session.user._id)) {
                console.error("User not logged in or session expired!");
                return res.status(401).json({ message: "User not logged in or session expired" });
            }

            const user = await User.findById(req.session.user._id);
            if (!user) {
                console.error("User not found!");
                return res.status(404).json({ message: "User not found!" });
            }

            const wishlist = await Wishlist.findOne({ user_id: user._id }).populate("products");


            let products;
            if (wishlist && wishlist.products) {
                products = wishlist.products;
            } else {
                products = [];
            }



            res.render("user/wishlist", {
                locals,
                wishlist,
                products,
                user
            });

        } catch (error) {
            console.error("Error fetching wishlist", error.message);
            res.status(500).json({ message: "Server error" });
        }
    },

    addToWishlist: async (req, res) => {
        try {
            const userId = req.session.user._id;
            if (!userId) {
                return res.status(401).json({ success: false, message: "User not logged in or session expired" });
            }

            let wishlist = await Wishlist.findOne({ user_id: userId });
            if (!wishlist) {
                wishlist = new Wishlist({ user_id: userId, products: [] });
            }

            const productId = req.body.productId;
            if (wishlist.products.includes(productId)) {
                return res.status(400).json({ success: false, message: "Product already in the wishlist" });
            }

            wishlist.products.push(productId);
            await wishlist.save();

            res.status(200).json({ success: true, message: "Product added to wishlist successfully" });

        } catch (error) {
            console.error("Error adding product to wishlist", error);
            res.status(500).json({ success: false, message: "Server Error" });
        }
    },


    removeFromWishlist: async (req, res) => {
        try {
            const userId = req.session.user._id;
            if (!userId) {
                return res.status(401).json({ success: false, message: "User not logged in or session expired" });
            }

            const { productId } = req.body;

            const wishlist = await Wishlist.findOne({ user_id: userId });
            if (!wishlist) {
                return res.status(404).json({ success: false, message: "Wishlist not found" });
            }

            wishlist.products.pull(productId);
            await wishlist.save();

            res.status(200).json({ success: true, message: "Product removed successfully!" });

        } catch (error) {
            console.error("Error removing product from wishlist", error);
            res.status(500).json({ success: false, message: "Server Error" });
        }
    },




    //Address



    getAddress: async (req, res) => {
        try {
            if (!req.session.user || !req.session.user._id) {
                throw new Error('User not logged in or session expired.');
            }

            const addresses = await Address.find({
                customer_id: req.session.user._id,
                delete: false
            });

            if (!addresses) {
                throw new Error('No addresses found for the user.');
            }

            res.render("user/profile", {
                addresses,
                user: req.session.user
            });
        } catch (err) {
            console.error('Error fetching addresses:', err);
            res.status(500).json({ message: 'Server Error' });
        }
    },
    addAddress: async (req, res) => {
        try {
            const userId = req.session.user._id;

            const address = new Address({
                customer_id: userId,
                name: req.body.name,
                address_type: req.body.addressType,
                zip_code: req.body.zipCode,
                locality: req.body.locality,
                house_name: req.body.houseName,
                area_street: req.body.areaStreet,
                town: req.body.town,
                state: req.body.state,
                landmark: req.body.landmark
            });

            await address.save();
            return res.status(200).json({ success: true, message: 'Address added successfully' });
        } catch (err) {
            console.error('Error adding address:', err);
            res.status(500).json({ success: false, message: 'Failed to add address' });
        }
    },
    editAddress: async (req, res) => {
        try {
            const userId = req.session.user._id;

            const addressId = req.body.addressId;
            const updateAddress = {
                customer_id: userId,
                name: req.body.name,
                address_type: req.body.addressType,
                zip_code: req.body.zipCode,
                locality: req.body.locality,
                house_name: req.body.houseName,
                area_street: req.body.areaStreet,
                town: req.body.town,
                state: req.body.state,
                landmark: req.body.landmark
            };

            await Address.findByIdAndUpdate(addressId, updateAddress, { new: true });
            return res.status(200).json({ success: true, message: 'Address updated successfully' });
        } catch (error) {
            console.error('Error editing address:', error);
            res.status(500).json({ success: false, message: 'Failed to edit address' });
        }
    },
    deleteAddress: async (req, res) => {
        try {
            const addressId = req.body.addressId;

            await Address.findByIdAndDelete(addressId);
            return res.status(200).json({ success: true, message: "Address deleted successfully !!!" })
        } catch (err) {
            console.error('Error deleting address:', err);
            res.status(500).json({ success: false, message: 'Failed to delete address' });
        }
    },


    setDefaultAddress


}