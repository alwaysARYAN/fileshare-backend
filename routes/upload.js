const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");

const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const File = require("../models/File");

/* ================= CLOUDINARY SETUP ================= */

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

/* ================= MULTER STORAGE ================= */

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "fileshare",
    resource_type: "auto"
  }
});

const upload = multer({ storage });

/* ================= UPLOAD FILE ================= */

router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

  const newFile = new File({
    name: req.file.originalname,
    size: req.file.size,
    url: result.secure_url,
    owner: req.user.userId
});


    await newFile.save();

    res.json({
      message: "File uploaded successfully",
      file: newFile
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= GET FILES ================= */

router.get("/files", auth, async (req, res) => {
  try {

    const userId = req.user.userId;

    const myFiles = await File.find({
      owner: userId,
      deletedFor: { $ne: userId }
    })
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

    const sharedFiles = await File.find({
      sharedWith: userId,
      deletedFor: { $ne: userId }
    })
    .populate("owner", "name email")
    .populate("sharedWith", "name email");

    res.json({ myFiles, sharedFiles });

  } catch (err) {
    console.error("FILES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= DELETE PERMANENT ================= */

router.delete("/delete-permanent/:filename", auth, async (req, res) => {
  try {

    const filename = decodeURIComponent(req.params.filename);
    const userId = req.user.userId;

    const file = await File.findOne({ name: filename });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.owner.equals(userId)) {

      await File.deleteOne({ name: filename });

      return res.json({ message: "Deleted permanently (owner)" });

    } else {

      file.deletedFor = file.deletedFor.filter(
        id => id.toString() !== userId
      );

      file.sharedWith = file.sharedWith.filter(
        id => id.toString() !== userId
      );

      await file.save();

      return res.json({ message: "Deleted permanently (only for you)" });
    }

  } catch (err) {
    console.error("DELETE PERMANENT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= VIEW FILE ================= */

router.get("/view/:filename", async (req, res) => {
  try {

    const filename = decodeURIComponent(req.params.filename);

    const file = await File.findOne({ name: filename });

    if (!file) {
      return res.status(404).send("File not found");
    }

    res.redirect(file.path); // 🔥 Cloudinary URL redirect

  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* ================= DOWNLOAD FILE ================= */

router.get("/download/:filename", async (req, res) => {
  try {

    const file = await File.findOne({ name: req.params.filename });

    if (!file) {
      return res.status(404).send("File not found");
    }

    res.redirect(file.path);

  } catch (err) {
    res.status(500).send(err.message);
  }
});

/* ================= DELETE FILE ================= */

router.delete("/delete/:filename", auth, async (req, res) => {
  try {

    const filename = decodeURIComponent(req.params.filename);

    await File.updateOne(
      { name: filename },
      {
        $addToSet: {
          deletedFor: new mongoose.Types.ObjectId(req.user.userId)
        }
      }
    );

    res.json({ message: "Moved to trash" });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= TRASH ================= */

router.get("/trash", auth, async (req, res) => {
  try {

    const userId = req.user.userId;

    const files = await File.find()
      .populate("owner", "name email")
      .populate("sharedWith", "name email");

    const trashFiles = files.filter(file =>
      file.deletedFor &&
      file.deletedFor.some(id => id.toString() === userId)
    );

    res.json(trashFiles);

  } catch (err) {
    console.error("TRASH ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= RESTORE ================= */

router.post("/restore", auth, async (req, res) => {
  try {

    const { fileName } = req.body;
    const userId = req.user.userId;

    const file = await File.findOne({ name: fileName });

    file.deletedFor = file.deletedFor.filter(
      id => id.toString() !== userId
    );

    await file.save();

    res.json({ message: "Restored" });

  } catch (err) {
    console.error("RESTORE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= RENAME ================= */

router.post("/rename", auth, async (req, res) => {
  try {

    const oldName = req.body.oldName;
    const newName = req.body.newName;

    await File.updateOne(
      { name: oldName },
      { $set: { name: newName } }
    );

    res.json({ message: "File renamed successfully" });

  } catch (err) {
    console.error("RENAME ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= SHARE ================= */

router.post("/share", auth, async (req, res) => {
  try {

    const { fileName, email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const file = await File.findOne({
      name: fileName,
      owner: req.user.userId
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (!file.sharedWith.includes(user._id)) {
      file.sharedWith.push(user._id);
      await file.save();
    }

    res.json({ message: "File shared successfully" });

  } catch (err) {
    console.error("SHARE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= PUBLIC LINK ================= */

router.post("/public-link", auth, async (req, res) => {
  try {

    const { fileName } = req.body;

    const file = await File.findOne({
      name: fileName,
      owner: req.user.userId
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (!file.publicLink) {
      const crypto = require("crypto");
      file.publicLink = crypto.randomBytes(16).toString("hex");
      await file.save();
    }

    res.json({
      link: file.path // 🔥 direct cloudinary link
    });

  } catch (err) {
    console.error("PUBLIC LINK ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ================= STORAGE ================= */

router.get("/storage", auth, async (req, res) => {
  try {

    const files = await File.find({ owner: req.user.userId });

    let totalBytes = 0;

    files.forEach(file => {
      totalBytes += file.size;
    });

    const usedMB = totalBytes / (1024 * 1024);
    const maxMB = 100;

    res.json({
      used: usedMB.toFixed(2),
      percent: ((usedMB / maxMB) * 100).toFixed(2)
    });

  } catch (err) {
    console.error("STORAGE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;