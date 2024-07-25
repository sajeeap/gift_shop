const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../model/userSchema');
require('dotenv').config();

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `http://localhost:${process.env.APP_PORT}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            return done(null, user);
        } else {
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
                user.googleId = profile.id;
                await user.save();
                return done(null, user);
            } else {
                const newUser = new User({
                    googleId: profile.id,
                    firstName: profile.name.givenName,
                    lastName: profile.name.familyName,
                    email: profile.emails[0].value,
                    isVerified: true,
                    isBlocked: false,
                    isAdmin: false,
                });

                user = await newUser.save();
                return done(null, user);
            }
        }
    } catch (err) {
        return done(err, null);
    }
}));

// // Facebook Strategy
// passport.use(new FacebookStrategy({
//     clientID: process.env.FACEBOOK_CLIENT_ID,
//     clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
//     callbackURL: `http://localhost:${process.env.APP_PORT}/auth/facebook/callback`,
//     profileFields: ['id', 'emails', 'name'] // This ensures you get email and name
// }, async (accessToken, refreshToken, profile, done) => {
//     try {
//         let user = await User.findOne({ facebookId: profile.id });

//         if (user) {
//             return done(null, user);
//         } else {
//             user = await User.findOne({ email: profile.emails[0].value });

//             if (user) {
//                 user.facebookId = profile.id;
//                 await user.save();
//                 return done(null, user);
//             } else {
//                 const newUser = new User({
//                     facebookId: profile.id,
//                     firstName: profile.name.givenName,
//                     lastName: profile.name.familyName,
//                     email: profile.emails[0].value,
//                     isVerified: true,
//                     isBlocked: false,
//                     isAdmin: false,
//                 });

//                 user = await newUser.save();
//                 return done(null, user);
//             }
//         }
//     } catch (err) {
//         return done(err, null);
//     }
// }));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;