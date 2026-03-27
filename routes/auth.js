const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");

router.post("/register", async (req, res) => {

    const { name, email, password } = req.body;

    // ✅ CHECK IF USER ALREADY EXISTS
    const existingUser = await User.findOne({ email });

    if(existingUser){
        return res.status(400).send("User already exists");
    }

    // 🔐 HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // 👤 CREATE USER
    const newUser = new User({
        name,
        email,
        password: hashedPassword
    });

    await newUser.save();

    res.send("User Registered Successfully");

});

const jwt = require("jsonwebtoken");

router.post("/login", async (req, res) => {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).send("User not found");
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        return res.status(400).send("Invalid password");
    }

    const token = jwt.sign(
        { userId: user._id },
        "secretkey",
        { expiresIn: "1h" }
    );

    res.json({
        message: "Login successful",
        token: token
    });

});

const auth = require("../middleware/authMiddleware");

router.get("/profile", auth, async (req, res) => {

try {

const user = await User.findById(req.user.userId).select("-password");

res.json(user);

} catch (err) {

res.status(500).json({error:"Server error"});

}

});

module.exports = router;