const express = require('express');
const WebSocket = require('ws');
const chatRouter = require('./routes/chat')
const chatRoomModel = require('./models/chatRoomModel.js');
const path = require('path');
const fs = require('fs')

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

        const chatRoom = await chatRoomModel.find({roomId: roomId})
        if(chatRoom.length == 0){
            ws.send(JSON.stringify({message: "Error"}))
        }else{
            if(type == 0){
                switch(chatRoom[0].status){
                    case "0":{
                        const temp = {
                            memberId: data.memberId,
                            ws: ws
                        }
                        hostRegistry.set(roomId, temp)
                        wsRegistry.set(ws, {roomId: roomId, memberId: data.memberId})
                        const updateData = {
                            status: "1",
                        }
                        await chatRoomModel.updateOne({roomId: roomId}, updateData)
                        break
                    }
                    case "1":{
                        const temp = {
                            memberId: data.memberId,
                            ws: ws
                        }
                        wsRegistry.set(ws, {roomId: roomId, memberId: data.memberId})
                        clientRegistry.set(roomId, temp)
                        const updateData = {
                            status: "2",
                        }
                        await chatRoomModel.updateOne({roomId: roomId}, updateData)
                        break
                    }
                }
            }else if(type == 1){        
                if(chatRoom[0].status == "2"){
                    const host = hostRegistry.get(roomId)
                    const client = clientRegistry.get(roomId)
                    if(host && client){
                        if(host.memberId == data.friendId){
                            host.ws.send(JSON.stringify({message: data.message,type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time}))
                        }
                        if(client.memberId == data.friendId){
                            client.ws.send(JSON.stringify({message: data.message,type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time}))
                        }
                    }
                }
                const chatData = {
                    $push : {
                        chatData :{
                            message: data.message,
                            senderId: data.memberId,
                            isImage: data.isImage,
                            isRead: false,
                            time: data.time
                        }
                    }
                }
                await chatRoomModel.updateOne({roomId: roomId}, chatData)
            }
            // else if(type == 2){        
            //     console.log("onRead id : "+data.memberId)
            //     const updateChat = {
            //         $set: {"chatData.$[element].isRead" : true}
            //     }
            //     const filter = {
            //         arrayFilters: [ { "element.senderId" : data.memberId}],
            //         multi: true
            //     }
            //     await chatRoomModel.findOneAndUpdate({roomId: roomId}, updateChat, filter)
            //     const host = hostRegistry.get(roomId)
            //     const client = clientRegistry.get(roomId)
            //     if(host && client){
            //         console.log("has host and client")
            //         if(host.memberId == data.friendId){
            //             host.ws.send(JSON.stringify({message: data.message, type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time}))
            //         }
            //         if(client.memberId == data.friendId){
            //             client.ws.send(JSON.stringify({message: data.message, type:data.type, senderId: data.memberId, isImage: data.isImage, time:data.time}))
            //         }
            //     }            
            // }
        }
    })
});


