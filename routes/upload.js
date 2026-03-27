const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const File = require("../models/File");
const mongoose = require("mongoose");

/* STORAGE CONFIG */

const storage = multer.diskStorage({
destination: function (req, file, cb) {
cb(null, path.join(__dirname, "../uploads"));
},

filename: function (req, file, cb) {

/* remove apostrophe from filename */
const cleanName = file.originalname.replace(/'/g,"");

cb(null, Date.now() + "-" + cleanName);

}

});

const upload = multer({ storage: storage });

/* UPLOAD FILE */

router.post("/upload", auth, upload.single("file"), async (req,res)=>{

try{

if(!req.file){
return res.status(400).json({error:"No file uploaded"});
}

const newFile = new File({
name:req.file.filename,
size:req.file.size,   // correct size in bytes
path:req.file.path,
owner:req.user.userId
});

await newFile.save();

res.json({
message:"File uploaded successfully",
file:req.file.filename
});

}catch(err){

res.status(500).json({error:err.message});

}

});

/* GET FILES (OWN + SHARED) */

router.get("/files", auth, async (req,res)=>{

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

});

/* DELETE PERMANENT (FIXED) */

router.delete("/delete-permanent/:filename", auth, async (req,res)=>{

const filename = decodeURIComponent(req.params.filename);
const userId = req.user.userId;

const file = await File.findOne({ name: filename });

if(file.owner.equals(userId)){
    
    const filePath = path.join(__dirname,"../uploads",filename);

    if(fs.existsSync(filePath)){
        fs.unlinkSync(filePath);
    }

    await File.deleteOne({ name: filename });

    return res.json({message:"Deleted permanently (owner)"});

}else{

    file.deletedFor = file.deletedFor.filter(
        id => id.toString() !== userId   // 🔥 FIX
    );

    file.sharedWith = file.sharedWith.filter(
        id => id.toString() !== userId
    );

    await file.save();

    return res.json({message:"Deleted permanently (only for you)"});
}
});
/* FILE PREVIEW */

router.get("/view/:filename",(req,res)=>{

const filename = decodeURIComponent(req.params.filename);

const filePath = path.join(__dirname,"../uploads",filename);

res.sendFile(filePath);

});
/* FILE DOWNLOAD */

router.get("/download/:filename", (req,res)=>{

const filePath = path.join(__dirname,"../uploads",req.params.filename);

res.download(filePath);

});



/* DELETE FILE */

router.delete("/delete/:filename", auth, async (req,res)=>{

try{

const filename = decodeURIComponent(req.params.filename);

console.log("DELETE HIT:", filename);

await File.updateOne(
  { name: filename },
  {
    $addToSet: {
      deletedFor: new mongoose.Types.ObjectId(req.user.userId)
    }
  }
);

res.json({ message: "Moved to trash" });

}catch(err){
console.error(err);
res.status(500).json({error:err.message});
}

});



router.get("/trash", auth, async (req,res)=>{

const userId = req.user.userId;

const files = await File.find()
.populate("owner", "name email")
.populate("sharedWith", "name email");

const trashFiles = files.filter(file =>
file.deletedFor && file.deletedFor.some(id => id.toString() === userId)
);

res.json(trashFiles);

});


/* RESTORE (FIXED) */

router.post("/restore", auth, async (req,res)=>{

const { fileName } = req.body;
const userId = req.user.userId;

const file = await File.findOne({ name: fileName });

file.deletedFor = file.deletedFor.filter(
id => id.toString() !== userId   // 🔥 FIX
);

await file.save();

res.json({message:"Restored"});

});

/* RENAME FILE */

router.post("/rename", auth, async (req,res)=>{

const oldName = decodeURIComponent(req.body.oldName);
const newName = decodeURIComponent(req.body.newName);

const oldPath = path.join(__dirname,"../uploads",oldName);
const newPath = path.join(__dirname,"../uploads",newName);

fs.renameSync(oldPath,newPath);

await File.updateOne(
{ name:oldName },
{ $set:{ name:newName } }
);

res.json({message:"File renamed successfully"});

});
/* SHARE FILE */

router.post("/share", auth, async (req,res)=>{

try{

const {fileName,email} = req.body;

const user = await User.findOne({email});

if(!user){
return res.status(404).json({error:"User not found"});
}

const file = await File.findOne({
name:fileName,
owner:req.user.userId
});

if(!file){
return res.status(404).json({error:"File not found"});
}

if(file.sharedWith.includes(user._id)){
return res.json({message:"Already shared"});
}

file.sharedWith.push(user._id);

await file.save();

res.json({message:"File shared successfully"});

}catch(err){

res.status(500).json({error:err.message});

}

});

router.post("/public-link", auth, async (req,res)=>{

const {fileName} = req.body;

const file = await File.findOne({
name:fileName,
owner:req.user.userId
});

if(!file){
return res.status(404).json({error:"File not found"});
}

if(!file.publicLink){

const crypto = require("crypto");

file.publicLink = crypto.randomBytes(16).toString("hex");

await file.save();

}

res.json({
link:`http://localhost:5000/api/public/${file.publicLink}`
});

});

/* STORAGE USAGE */

router.get("/storage", auth, async (req,res)=>{

const files = await File.find({owner:req.user.userId});

let totalBytes = 0;

files.forEach(file=>{
totalBytes += file.size;
});

/* convert bytes → MB */
const usedMB = totalBytes / (1024 * 1024);

const maxMB = 100; // storage limit

const percent = (usedMB / maxMB) * 100;

res.json({
used: usedMB.toFixed(2),
percent: percent.toFixed(2)
});

});

router.get("/public/:id", async (req,res)=>{

const file = await File.findOne({
publicLink:req.params.id
});

if(!file){
return res.status(404).send("File not found");
}

const filePath = path.join(__dirname,"../uploads",file.name);

res.sendFile(filePath);

});
module.exports = router;