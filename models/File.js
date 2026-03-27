const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({

name:String,
size:Number,
path:String,

owner:{
type:mongoose.Schema.Types.ObjectId,
ref:"User"
},

sharedWith:[{
type:mongoose.Schema.Types.ObjectId,
ref:"User"
}],

/* ✅ ADD THIS */
deletedFor: [{
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: []
}],

publicLink:{
type:String,
default:null
},

createdAt: {
  type: Date,
  default: Date.now
},

isDeleted: {
  type: Boolean,
  default: false
},

deletedAt: {
  type: Date,
  default: null
}

});

module.exports = mongoose.model("File",fileSchema);