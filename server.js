const express = require('express');
const WebSocket = require('ws');
const chatRouter = require('./routes/chat')
const chatRoomModel = require('./models/chatRoomModel.js');
const memberModel = require('./models/memberModel.js')

const path = require('path');
const fs = require('fs')
var admin = require("firebase-admin");
var serviceAccount = require("./fcm/chatroom-fbdcf-firebase-adminsdk-3rrh4-53fbc8583e.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const app = express();
const port = 3000; 
const server = app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/chat', chatRouter)

app.get('/uploads/:filename', function(req, res) {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    fs.readFile(filePath, function(err, data) {
      if (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
      } else {
        res.contentType('image/jpeg');
        res.send(data);
      }
    });
  });

const clientRegistry = new Map();
const hostRegistry = new Map();
const wsRegistry = new Map();

const wsServer = new WebSocket.Server({ server : server });

wsServer.on('connection', ws => {

    let type = "0" 

    ws.on('close', async () => {

        const data = wsRegistry.get(ws)
        
        if(data){
            const chatRoom = await chatRoomModel.find({roomId: data.roomId})

            if(chatRoom.length != 0){
            
                const host = hostRegistry.get(data.roomId)
                const client = clientRegistry.get(data.roomId)
    
                if(chatRoom[0].status == "2"){
    
                    await chatRoomModel.updateOne({roomId: data.roomId},{status: "1"})
    
                    if(host && client){
                        if(host.memberId == data.memberId){
    
                            clientRegistry.delete(data.roomId)
                            hostRegistry.delete(data.roomId)
                            hostRegistry.set(data.roomId, client)    
                            wsRegistry.delete(ws)
                        }            
                    }
                }else if(chatRoom[0].status == "1"){
    
                    await chatRoomModel.updateOne({roomId: data.roomId}, {status: "0"})
                    if(host){
                        if(host.memberId == data.memberId){
                            hostRegistry.delete(data.roomId)
                            wsRegistry.delete(ws)
                        }      
                    }
                }
            }
        }
    })
    ws.on('message', async msg => { 
        const data = JSON.parse(msg)
        const roomId = data.roomId
        type = data.type
        console.log("onMessage : ", data)
        const chatRoom = await chatRoomModel.find({roomId: roomId})
        if(chatRoom.length == 0){
            ws.send(JSON.stringify({message: "Error"}))
        }else{
            if(type == "0"){
                switch(chatRoom[0].status){
                    case "0":{
                        const temp = {
                            memberId: data.memberId,
                            ws: ws
                        }
                        hostRegistry.set(roomId, temp)
                        wsRegistry.set(ws, {roomId: roomId, memberId: data.memberId})

                        const check = await chatRoomModel.find({roomId: roomId})

                        if(check[0].chatData.length != 0){
                            console.log("enter room again")
                            const updateData = {
                                status: "1",
                                $set: {"chatData.$[element].isRead" : true}
                            }
                            const filter = {
                                arrayFilters: [ { "element.senderId" : data.friendId}],
                                multi: true
                            }
                            await chatRoomModel.updateOne({roomId: roomId}, updateData, filter)
                        }else{
                            const updateData = {
                                status: "1",
                            }
                            await chatRoomModel.updateOne({roomId: roomId}, updateData)
                        }          

                        break
                    }
                    case "1":{
                        const temp = {
                            memberId: data.memberId,
                            ws: ws
                        }
                        wsRegistry.set(ws, {roomId: roomId, memberId: data.memberId})
                        clientRegistry.set(roomId, temp)

                        const check = await chatRoomModel.find({roomId: roomId})

                        if(check[0].chatData.length != 0){
                            console.log("enter room again")
                            const updateData = {
                                status: "2",
                                $set: {"chatData.$[element].isRead" : true}
                            }
                            const filter = {
                                arrayFilters: [ { "element.senderId" : data.friendId}],
                                multi: true
                            }
                            await chatRoomModel.updateOne({roomId: roomId}, updateData, filter)
                            const host = hostRegistry.get(roomId)
                            if(host){
                                host.ws.send(JSON.stringify({message: "read", type:2, senderId: data.friendId, isImage: false, time:data.time}))
                            }
                        }else{
                            const updateData = {
                                status: "2"
                            }
                            await chatRoomModel.updateOne({roomId: roomId}, updateData)
                        }             
                        break
                    }
                }
            }else if(type == "1"){        
                if(chatRoom[0].status == "2"){
                    const host = hostRegistry.get(roomId)
                    const client = clientRegistry.get(roomId)
                    if(host && client){
                        if(host.memberId == data.friendId){
                            host.ws.send(JSON.stringify({id: data.id, message: data.message,type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time, isUnSend: false}))
                        }
                        if(client.memberId == data.friendId){
                            client.ws.send(JSON.stringify({id: data.id, message: data.message,type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time, isUnSend: false}))
                        }
                    }
                }
                if(chatRoom[0].status == "1"){ //當前聊天室只有一人才寄送fcm 
                    console.log("finding friend")             
                    const friend = await memberModel.find({memberId: data.friendId})
                    console.log('friend', friend)
                    if(friend.length != 0){      
                        console.log("sending fcm")             
                        sendFcm(friend[0].fcm_token, data.message, data.name)
                    }
                }
                const chatData = {
                    $push : {
                        chatData :{
                            id: data.id,
                            message: data.message,
                            senderId: data.memberId,
                            isImage: data.isImage,
                            isRead: false,
                            time: data.time,
                            isUnSend: data.isUnSend
                        }
                    }
                }
                await chatRoomModel.updateOne({roomId: roomId}, chatData)
            }
            else if(type == "2"){        
                console.log("onRead id : "+data.memberId)
                const updateChat = {
                    $set: {"chatData.$[element].isRead" : true}
                }
                const filter = {
                    arrayFilters: [ { "element.senderId" : data.friendId}],
                    multi: true
                }
                await chatRoomModel.updateOne({roomId: roomId}, updateChat, filter)
                const host = hostRegistry.get(roomId)
                const client = clientRegistry.get(roomId)
                if(host && client){
                    console.log("has host and client")
                    console.log("client memberId : "+client.memberId+" host memberId : "+host.memberId+" data memberId : "+ data.friendId)
                    if(host.memberId == data.friendId){
                        host.ws.send(JSON.stringify({message: data.message, type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time}))
                        console.log("sending host")
                    }
                    if(client.memberId == data.friendId){
                        console.log("sending client")
                        client.ws.send(JSON.stringify({message: data.message, type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time}))

                    }
                }            
            }else if(type == "3"){
                console.log("onUnSend id : "+data.memberId)
                
                const host = hostRegistry.get(roomId)
                const client = clientRegistry.get(roomId)
                if(host && client){
                    console.log("has host and client")
                    console.log("client memberId : "+client.memberId+" host memberId : "+host.memberId+" data memberId : "+ data.friendId)
                    if(host.memberId == data.friendId){
                        host.ws.send(JSON.stringify({message: data.message, type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time}))
                        console.log("sending host")
                    }
                    if(client.memberId == data.friendId){
                        console.log("sending client")
                        client.ws.send(JSON.stringify({message: data.message, type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time}))

                    }
                }        
            }
        }
    })
});

function sendFcm(fcmToken, message, name){
    const data = {
        token: fcmToken,
        notification: {
            title: name,
            body: message
        }
      } 
      admin.messaging().send(data)
      .then((response) => {
        // Response 是一個字串型別的 message ID.
        console.log('Successfully sent message:', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
      });
}


