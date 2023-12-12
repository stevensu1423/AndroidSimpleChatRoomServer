const mongoose = require('mongoose');
const mongooseConfig = require('../mongooseConfig.json');
const mongoDB = mongooseConfig.url

mongoose.connect(mongoDB,{useNewUrlParser : true, useUnifiedTopology: true  });
mongoose.Promise = global.Promise;
//Get the default connection
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function(){})

const Schema = mongoose.Schema;

const Memberschema = new Schema(
   {
      memberId: {type: String, required : true},
      email : {type : String, required : true},
      userName: { type: String, max: 100 },
      password: { type: String, required: true, max: 100 },
      friends: [{memberId: String, name: String, roomId: String, mType: String}],
      friendRequest: [{memberId: String, name: String, mType: String}],
      fcm_token: {type: String}
   },{
      strict : false
   }
)


Memberschema.set('collection', 'memberdata'); 

module.exports = mongoose.model('memberdata', Memberschema);
module.exports.Memberschema=Memberschema;

