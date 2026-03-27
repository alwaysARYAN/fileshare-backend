require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const favoriteRoutes = require("./routes/favorites");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Atlas Connected"))
.catch(err => console.log(err));

const authRoutes = require("./routes/auth");
const uploadRoutes = require("./routes/upload");

app.use("/api", authRoutes);
app.use("/api", uploadRoutes);
app.use("/api", favoriteRoutes);

app.get("/test", (req, res) => {
    res.send("Server Test Working");
});

app.get("/", (req, res) => {
    res.send("Secure File Sharing Server Running");
});

app.listen(process.env.PORT || 5000, () => {
    console.log("Server running");
});