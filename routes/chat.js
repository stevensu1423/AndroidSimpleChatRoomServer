const express = require('express');
const router = express.Router();
const chatRoomModel = require('../models/chatRoomModel.js');
const memberModel = require('../models/memberModel.js')
const multer = require('multer');

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix +'.jpg'); 
    }
});

const upload = multer({ storage: storage });



router.post('/photos', upload.single('photo'), (req, res) => {
    const path = req.file.path
    const url = (req.protocol + '://' + req.get('host') +'/' + path.replace(/\\/g, '/'))

    res.json({
        status: 200,
        message: "成功",
        isImage: true,
        url: url
    });
});

router.get('/getChatList', async function (req, res, next) {
    const chatRoom = await chatRoomModel.find({open:"1", status: "1"})
    const json = {
        data : chatRoom
    }
    res.json(json)
});

router.post('/checkRoom', async function (req, res, next) {
    const id = req.body['roomId']
    const chatRoom = await chatRoomModel.find({roomId: id, status: "1"})
    if(chatRoom.length == 0){
        res.json({status: 400, message:"找不到房間或房間已滿"})
    }else{
        res.json({status: 200, message:"ok"})
    }
});

router.post('/getChatList', async function (req, res, next){
    const roomId = req.body['roomId']
    const senderId = req.body['senderId']
    const data = await chatRoomModel.find({roomId: roomId})


    if(data.length != 0){
        // const updateChat = {
        //     $set: {"chatData.$[element].isRead" : true}
        // }
        // const filter = {
        //     arrayFilters: [ { "element.senderId" : senderId}],
        //     multi: true
        // }
        // await chatRoomModel.updateOne({roomId: roomId}, updateChat, filter)
        // const newData = await chatRoomModel.find({roomId: roomId})
        const response = {
                status: 200,
                message: "成功",
                data: data[0].chatData
        }
            res.json(response)        
    }


})

router.post('/login', async function (req, res, next){
    const email = req.body['email']
    const password = req.body['password']

    const data = await memberModel.find({email: email})
    if(data.length == 0){
        res.json({
            status: 400,
            message: "帳號或密碼錯誤!"
        })
    }else{
        if(data[0].password == password){
            res.json({
                status: 200,
                message: "登入成功",
                userName: data[0].userName,
                memberId: data[0].memberId
            })
        }else{
            res.json({
                status: 400,
                message: "帳號或密碼錯誤!"
            })
        }
    }

})

router.post('/getChatHistory', async function (req, res, next){
    const MymemberId = req.body['memberId']

    const data = await chatRoomModel.find({hostId: MymemberId})
    if(data.length == 0){
        res.json({
            status: 400,
            message: "帳號或密碼錯誤!"
        })
    }else{
        if(data[0].password == password){
            res.json({
                status: 200,
                message: "登入成功",
                userName: data[0].userName,
                memberId: data[0].memberId
            })
        }else{
            res.json({
                status: 400,
                message: "帳號或密碼錯誤!"
            })
        }
    }

})

router.post('/register', async function (req, res, next){
    const email = req.body['email']
    const userName = req.body['userName'];
    const password = req.body['password'];
    const data = await memberModel.find({ email: email});
    if(data.length > 0){
        const json = {
            status: 400,
            message: "帳號已經被使用過了"
        }
        res.json(json)
    }else{
        let memberId = Math.floor(Math.random() * 90000000) + 10000000;
        const memberData = {
            memberId: memberId,
            email: email,
            userName: userName,
            password: password
        }
        await memberModel.create(memberData)
        const data = await memberModel.find({ email: email});
        res.json({
            status: 200,
            message: "註冊成功!",
            userName: data[0].userName,
            memberId: data[0].memberId
        })
    }
})

router.post('/addFriend', async function (req, res, next){
    const email = req.body['email']
    const memberId = req.body['myMemberId']
    const name = req.body['myName']
    const firendData = {memberId: memberId, name: name, mType: "request"}
    const myData = await memberModel.find({memberId: memberId})
    const data = await memberModel.find({ email: email});

    if(data.length == 0){
        const json = {
            status: 400,
            message: "找不到此人"
        }
        res.json(json)
    }else if(data[0].memberId == memberId){
        const json = {
            status: 400,
            message: "你不能邀請自己"
        }
        res.json(json)
    }else{
        const isHasFriendRequest = myData[0].friendRequest.find(function(ele){
            return ele.memberId === data[0].memberId
        })
        if(isHasFriendRequest != undefined){
            const roomId = generateUniqueString(8)

            const myUpdateData = {
                $push : { friends: {memberId: data[0].memberId, name: data[0].userName, roomId: roomId, mType: "friend"}},
                $pull : { friendRequest : {memberId: data[0].memberId, name: data[0].userName, mType: "request"}}
            }
        
            const requestUpdateData = {
                $push : { friends: {memberId: myData[0].memberId, name: myData[0].userName, roomId: roomId, mType: "friend"}},
            }
        
            const createRoomData = {
                roomId: roomId,
                status: 0,
            }
        
            await memberModel.updateOne({memberId: myData[0].memberId}, myUpdateData)
            await memberModel.updateOne({memberId: data[0].memberId}, requestUpdateData)
            await chatRoomModel.create(createRoomData)
            res.json({
                status: 200,
                message: "已成為好友!",
            })
        }else{
        const friendRequestExist = data[0].friendRequest.find(function(ele){
            return ele.memberId === memberId && ele.name === name   
        })
        const friendsExist = data[0].friends.find(function(ele){
            return ele.memberId === memberId && ele.name === name
        })
        if(friendRequestExist != undefined  || friendsExist != undefined){
            res.json({
                status: 400,
                message: "你們已經是朋友了或已經發出邀請了!",
            })
        }else{
            const updateData = {
                $push: { friendRequest : firendData }
            }
            await memberModel.updateOne({email: email}, updateData)
            res.json({
                status: 200,
                message: "邀請成功!",
            })
        }
        }
    }
})

router.post('/myFriendRequest',async function(req, res, next){
    const memberId = req.body['memberId']
    let response
    const data = await memberModel.find({ memberId: memberId});
    if(data.length > 0){
        if(data[0].friendRequest == undefined){
            response = {
                status: 200,
                message: "成功",
                data: []
            }
        }else{
            response = {
                status: 200,
                message: "成功",
                data: data[0].friendRequest
            }
        }
    }
    
    res.json(response)
    
})

router.post('/friendConfirm', async function(req, res, next){
    const memberId = req.body['memberId']
    const requestId = req.body['requestId']
    const myName = req.body['myName']
    const requestName = req.body['requestName']
    const roomId = generateUniqueString(8)

    const myUpdateData = {
        $push : { friends: {memberId: requestId, name: requestName, roomId: roomId, mType: "friend"}},
        $pull : { friendRequest : {memberId: requestId, name: requestName, mType: "request"}}
    }

    const requestUpdateData = {
        $push : { friends: {memberId: memberId, name: myName, roomId: roomId, mType: "friend"}},
    }

    const createRoomData = {
        roomId: roomId,
        status: 0,
        chatData: []
    }

    await memberModel.updateOne({memberId: memberId}, myUpdateData)
    await memberModel.updateOne({memberId: requestId}, requestUpdateData)
    await chatRoomModel.create(createRoomData)

    res.json({
        status: 200,
        message: "OK"
    })


})

router.post('/myFriends', async function(req, res, next){
    const memberId = req.body['memberId']
    const data = await memberModel.find({memberId: memberId})
    if(data.length > 0){
        res.json({
            status: 200,
            message: "成功",
            data: data[0].friends
        })
    }else{
        res.json({
            status: 400,
            message: "找不到會員",
            data: []
        })
    }
})

router.post('/unSendMessage', async function(req, res, next){
    const roomId = req.body['roomId']
    const senderId = req.body['senderId']
    const chatId = req.body['chatId']

    const data = await chatRoomModel.find({roomId: roomId})
    if(data.length > 0){
        if(data[0].chatData.length > 0){
            const updateData = {
                $set: {"chatData.$[element].isUnSend" : true}
            }
            const filter = {
                arrayFilters: [ { "element.senderId" : senderId, "element.id" : chatId}],
                multi: true
            }
            await chatRoomModel.updateOne({roomId: roomId}, updateData, filter)
        }
    }
    res.json({
        status: 200,
        message: "ok",
        data: []
    })
})

function generateUniqueString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
  
    while (result.length < length) {
      const randomChar = characters.charAt(Math.floor(Math.random() * characters.length));
      if (!result.includes(randomChar)) {
        result += randomChar;
      }
    }
  
    return result;
}

router.use(express.json());



module.exports = router;
