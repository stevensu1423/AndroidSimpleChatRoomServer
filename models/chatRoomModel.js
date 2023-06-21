const mongoose = require('mongoose');
const mongoDB = '輸入你的MongoDB連結可為遠端或是本地';

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
    chatData : [{message: String, senderId: String, time: String, isImage: Boolean, isRead: Boolean}],
}
)
chat.set('collection','chat');
module.exports = mongoose.model('chat',chat);
