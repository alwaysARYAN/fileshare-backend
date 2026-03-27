const jwt = require("jsonwebtoken");

module.exports = function(req,res,next){

const header = req.headers.authorization;

if(!header){
return res.status(401).json({error:"No token"});
}

const token = header.split(" ")[1];   // remove "Bearer"

try{

const decoded = jwt.verify(token,"secretkey");

req.user = decoded;

next();

}catch(err){

res.status(401).json({error:"Invalid token"});

}

};