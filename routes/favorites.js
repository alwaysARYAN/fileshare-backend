const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");

/* TOGGLE FAVORITE */
router.post("/favorite", auth, async (req, res) => {
try {

const { fileName } = req.body;

/* 🔥 FIX */
const userId = req.user.id || req.user.userId;

const user = await User.findById(userId);

if(!user){
return res.status(404).json({ message: "User not found" });
}

if(user.favorites.includes(fileName)){
  user.favorites = user.favorites.filter(f => f !== fileName);
}else{
  user.favorites.push(fileName);
}

await user.save();

res.json({
  message: "Favorite updated",
  favorites: user.favorites
});

} catch(err){
console.error("POST /favorite error:", err);
res.status(500).json({ message: "Server error" });
}
});


/* GET FAVORITES */
router.get("/favorites", auth, async (req, res) => {
try {

/* 🔥 FIX */
const userId = req.user.id || req.user.userId;

const user = await User.findById(userId);

if(!user){
return res.status(404).json({ message: "User not found" });
}

res.json({
  favorites: user.favorites || []
});

} catch(err){
console.error("GET /favorites error:", err);
res.status(500).json({ message: "Server error" });
}
});

module.exports = router;