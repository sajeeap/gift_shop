
const bcrypt = require("bcrypt");
const OTP = require("../model/otpSchema");
const nodemailer = require("nodemailer");

const sendOtpEmail = async ({ _id, email }, res) => {
  try {
    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;

    console.log("otp: ", otp);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user:process.env.USER_EMAIL,
        pass:process.env.USER_PASS,
      }
    });

    const mailOptions = {
      from:process.env.USER_EMAIL,
      to: email,
      subject: "Email Verification from Gift Shop",
      html: ` <p>Your OTP for verification is ${otp}. Don't share your OTP!</p><p>The OTP is valid for 30 seconds.</p>`,
    };

    const hashedOtp = await bcrypt.hash(otp, 10);

    const existingOtpData = await OTP.findOne({ userId: _id });

    if (existingOtpData) {
      await OTP.deleteOne({ userId: _id });
    }

    const otpdata = new OTP({
      userId: _id,
      otp: hashedOtp,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 1000), // 30 seconds expiration
    });

    await otpdata.save();

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        res.status(500).send("Error sending email");
      } else {
        console.log("Email sent: ", info.response);
        res.status(200).send("OTP sent successfully");
      }
    });
  } catch (error) {
    console.error("Error in sendOtpEmail:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {sendOtpEmail};


