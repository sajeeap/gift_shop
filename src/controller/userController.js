const Category = require('../model/categorySchema');
const Product = require("../model/productSchema");
const User = require("../model/userSchema")
const bcrypt = require('bcrypt');
module.exports = {

    getProfile: async (req, res) => {

        try {
            const userId = req.session.user; // Retrieve userId from session

            // Find user by userId
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).send('User not found');
            }

            // Render profile page with updated user data
            res.render('user/profile', {
                user
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

    
}