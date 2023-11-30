const mongoose = require('mongoose');
const mongooseConfig = require('../mongooseConfig.json');
const mongoDB = mongooseConfig.url

mongoose.connect(mongoDB,{useNewUrlParser : true, useUnifiedTopology: true  });
mongoose.Promise = global.Promise;
//Get the default connection
const db = mongoose.connection;
const Schema=mongoose.Schema;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function(){})

const chat = new Schema(
{  
    roomId : String,
    status: String,
    chatData : [{id: String, message: String, senderId: String, time: String, isImage: Boolean, isRead: Boolean, isUnSend: Boolean}],
}
)
chat.set('collection','chat');
module.exports = mongoose.model('chat',chat);
