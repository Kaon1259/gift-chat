const path = require('path');
const { col } = require('sequelize');
const Room = require(path.join(__dirname, '..', 'schemas', 'room'));
const Chat = require(path.join(__dirname, '..', 'schemas', 'chat'));
const Friendship = require(path.join(__dirname, '..', 'schemas', 'friendShip'));
const {getSid, addAttendee, removeAttendee, updateAttendeeSocketId, getAttandeeSocketId, removeChattingRoomInfo} = require(path.join(__dirname, 'redisController'));
require('dotenv').config();


exports.renderIndex = async(req, res, next) =>{

    if(req.isAuthenticated && req.isAuthenticated()){
        console.log(`로그인되어 메인페이지로 전환합니다.`);
        return exports.renderMain(req, res, next);
    }
    else{
        return res.render('index', {title: 'GIF 채팅 - 홈'});
    }
}

exports.renderMain = async(req, res, next)=> {
    try{
        const rooms = await Room.find({status:'on'})
            .sort({ createdAt: -1 })   // 최신순 정렬 (내림차순)   오름차순 : 1
            .limit(10);         

        return res.render('main', {rooms, title: 'GIF 채팅방', activeMenu: 'rooms'});
    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.renderRoom = async(req, res, next) =>{
    res.render('room', {title: 'GIF 채팅방 생성'})
}

exports.createRoom = async(req, res, next)=>{
    try{
        const {title, max, password} = req.body;
        console.log(`createRoom = ${title}, ${max}, ${password}, ${req.session.color}`);

        const newRoom = await Room.create({
            title: title,
            max : max,
            owner: req.user.nick, 
            ownerId: req.user._id,
            ownerColor: req.session.color,
            password: password,
        });

        const  io = req.app.get('io');
        if(io){
            io.of('/room').emit('newRoom', newRoom);
            if(password){
                res.redirect(`/room/${newRoom._id}?password=${password}`);
            }else{
                res.redirect(`/room/${newRoom._id}`);
            }
        }
        else{
            console.log(`createRoom io is not exist`);
        }
    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.enterRoom = async(req, res, next) => {
    try{
        const roomId = req.params.id; //room id
        const password = req.query.password;
        console.log(`enterRoom ; ${roomId}, ${password}`);
        
        const userColor =  req.session.color; 
        const nick = req.user.nick;
        const meId = req.user._id;
        const socketId = req.session.socketId;

        const room = await Room.findOne({_id: roomId});

        if(!room){
            return res.redirect('/?error=존재하지 않는 방 입니다.')
        }

        if(room.password && room.password !== password){
            return res.redirect('/?error=비밀번호가 틀렸습니다.')
        }

        const io = req.app.get('io');
        const {rooms} = io.of('/chat').adapter;

        if(room.max <= rooms.get(roomId)?.size){
            return res.redirect('/?error=허용 인원을 초과했습니다.')
        }

        //get chatting messages...
        const chats = await Chat.find({ room: roomId })
                        .sort('createdAt')
                        .lean();
        
        let friendBy = new Map();
        friendBy = await getFriends(chats, meId);

        console.log(`friendBy map size: ${friendBy.size} ${Array.from(friendBy.entries()).map(([k,v])=>`${k}:${v}`).join(', ')}`);

        //redis에 등록
        enterTheRoom(req, roomId, meId, nick, socketId);

        const chatsWithFriendFlag = chats.map(c => {
            console.log(`Processing chat from userId: ${c.userId}`);
            const addresseeStr = c.userId ? String(c.userId) : null;
            const status = addresseeStr != meId ? (addresseeStr ? friendBy.get(addresseeStr) : undefined) : null;

            console.log(`chat ${c.user} userId: ${addresseeStr}, friendship status: ${status}: ${status === 'accepted'}`);

            return {
                    ...c,
                    isFriend: status === 'accepted',   // 요구사항: accepted이면 친구 플래그 true
                    friendStatus: status || null,      // 상태값 넘김(없으면 null)
                    };
        });

        return res.render('chat', {
            room,
            title: room.title,
            max: room.max,
            createdAt: new Date(room.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            chats: chatsWithFriendFlag,
            nick:  nick,
            color: userColor,
            glimpse: false,
            gif:'chat.png',
        });

    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.enterGlimpse = async(req, res, next) => {
    try{
        const id = req.params.id;
        const password = req.query.password;
        console.log(`enterGlimpse ; ${id}, ${password}`);

        const room = await Room.findOne({_id: id});

        if(!room){
            return res.redirect('/?error=존재하지 않는 방 입니다.')
        }

        if(room.password && room.password !== password){
            return res.redirect('/?error=비밀번호가 틀렸습니다.')
        }

        const io = req.app.get('io');
        const {rooms} = io.of('/chat').adapter;
        if(room.max <= rooms.get(id)?.size){
            return res.redirect('/?error=허용 인원을 초과했습니다.')
        }

        //get chatting messages...
        const chats = await Chat.find({ room: room._id }).sort('createdAt');
        
        const userColor =  req.session.color; 
        const nick = req.user.nick;
        
        return res.render('chat', {
            room,
            title: room.title,
            max: room.max,
            createdAt: new Date(room.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            chats,
            nick:  nick,
            color: userColor,
            glimpse: true,
            // user:,
        });

    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.removeRoom = async(req, res, next) =>{
    try{
        const { id } = req.params; //roomId
        const { password } = req.body; 
        
        console.log(`removeRoom id = ${id}/${password}`);

        //룸에 접속한 인원이 있으면 삭제할 수 없음
        if(checkExistAttendeesInTheRoom(req, id) === true){
            console.log(`checkExistAttendeesInTheRoom = true`)
            return res.status(201).json({message:'채널에 참석자가 있습니다.'});
        }

        if(id){
            const result = await Room.updateOne(
                { _id: id, password: password },  // 🔍 조건 (id + password 일치)
                { $set: { status: 'off' } }       // 🔧 업데이트 내용
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({message:'일치하는 방이 없습니다.'});
            }

            if (result.modifiedCount === 1) {
                console.log(`방(${id}) 상태가 'off'로 변경되었습니다.`);
                return res.status(200).json({message:'방이 삭제 되었습니다.'});
            }

            const removed = await removeRoomInfo(req, id);
            console.log(`removeRoomInfo : ${removed}`);

        }
        return res.status(404).json({message:'방 정보가 없습니다.'});
    }catch(err){
        console.log(`removeRoom error = ${err}`);
        return res.status(404).json({message:err});
    }
}

exports.sendChat = async(req, res, next)=>{
    try{
        const roomId = req.params.id;
        const nick = req.user.nick;
        const userId = req.user._id;
        const color = req.session.color;
        const chatData = req.body.chat;

        const chat = await Chat.create({
            room: roomId,
            user: nick,
            userId: userId,
            color: color,
            from: nick,
            chatType: process.env.LOCAL_CHAT || 'local',
            chat: chatData,
        });

        let friendBy = new Map();
        friendBy = await getFriendsByAccepted(roomId, userId);
        const friendsObj = Object.fromEntries(friendBy);

        console.log(`sendChat: ${req.params.id} : ${req.body.chat}, color:${chat.color} socketId:${req.session.socketId}`);
        req.app.get('io').of('/chat').to(req.params.id).emit('chat', {chat, friends:friendsObj, socketId: req.session.socketId || null,});
        res.send('ok');
    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.broadcastChat = async(req, res, next)=>{
    try{
        const roomId = req.params.id;
        const nick = req.user.nick;
        const userId = req.user._id;
        const color = req.session.color;
        const chatData = req.body.chat;
        const socketId = req.session.socketId;

        const chat = await Chat.create({
            room: roomId,
            user: nick,
            userId: userId,
            color: color,
            from: nick,
            chatType: 'broadcast',
            chat: chatData,
        });

        let friendBy = new Map();
        friendBy = await getFriendsByAccepted(roomId, userId);
        const friendsObj = Object.fromEntries(friendBy);

        console.log(`broadcastchat: ${req.params.id} : ${req.body.chat}, color:${chat.color} socketId:${req.session.socketId}`);
        req.app.get('io').of('/chat').emit('broadcastchat', { chat, friends:friendsObj, socketId: socketId || null });
        res.send('ok');
    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.sendGif = async(req, res, next) =>{
    try{
        const roomId = req.params.id;
        const nick = req.user.nick;
        const userId = req.user._id;
        const color = req.session.color;
        const chatData = req.body.chat;
        const fileName = req.file.filename;

        const chat = await Chat.create({
            room: roomId,
            user: nick,
            userId: userId,
            color: color,
            from:nick,
            chat: chatData,
            gif: fileName,
        });

        console.log(`sendGif : ${req.params.id} : ${req.file.filename}`);
        req.app.get('io').of('/chat').to(req.params.id).emit('chat', {chat, socketId:  req.session.socketId || null});
        res.send('ok');
    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.whisperChat = async(req, res, next)=>{
    try{
        const { targetSocketId, targetSocketUser, sourceSocketUser} = req.body;

        const user = req.user ? req.user : res.locals.user;
        const roomId = req.params.id;
        const nick = user.nick;
        const userId = user._id;
        const color = req.session.color;
        const chatData = req.body.chat;

        console.log(`whisperChat: ${chatData} : from: ${sourceSocketUser} : ${nick}-> to:${targetSocketUser}`);

        const chat = await Chat.create({
            room: roomId,
            user: nick,
            userId: userId,
            color: color,
            chatType: 'whisper',
            from: sourceSocketUser,  
            to: targetSocketUser,
            chat: chatData,
        });

        let friendBy = new Map();
        friendBy = await getFriendsByAccepted(roomId, userId);
        const friendsObj = Object.fromEntries(friendBy);

        const io = req.app.get('io');
        const chatIo = io.of('/chat');
        
        // 4. 소켓 ID를 이용해 대상 소켓 객체를 찾습니다.
        const targetSocket = chatIo.sockets.get(targetSocketId);
        
        // 5. 대상 소켓이 존재하는지 확인하고 귓속말 이벤트 전송
        if (targetSocket) {
            // ⭐️ 6. io.of('/chat').emit 대신, 찾은 targetSocket 객체에 'whisper' 이벤트를 보냅니다.
            //const senderUser = req.session.color;
            targetSocket.emit('whisper', {
                fromUser: sourceSocketUser,
                fromSocketId: req.session.socketId, // 발신자 소켓 ID (필요시)
                chat: chatData
            });

            targetSocket.emit('whisper', {
                fromUser: sourceSocketUser,
                fromSocketId: req.session.socketId, // 발신자 소켓 ID (필요시)
                chat: chatData,
                friends:friendsObj
            });

            console.log(`[Whisper 성공] ${sourceSocketUser} -> ${targetSocketId}: ${chatData}`);
            res.send('ok');
        } else {
            console.log(`[Whisper 실패] 대상 소켓 ID ${targetSocketId}를 찾을 수 없습니다. (접속 끊김)`);
            // 대상이 없음을 클라이언트에 알릴 수 있습니다.
            res.status(404).send('대상이 현재 접속 중이 아닙니다.');
        }

    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.leave = async(req, res, next) =>{
    const roomId = req.params.id;
    const {userId, nick} = req.body;

    console.log(`leave:roomId = ${roomId}`);

    try{
        if(roomId){
            if(userId){
                leaveTheRoom(req, roomId, userId)
            }
        
            req.app.get('io').of('/chat').to(roomId).emit('leave', {roomId, chat:`${nick}님이 나가셨습니다.` });
            return res.status(200).json({message:'방에서 나갔습니다.'})
        }
        return res.status(500).json({message:'잘못된 요청 입니다.'})
    }catch(err){
        console.log(`leave: error ${err}`);
        next(err);
    }
}

exports.enterIntoTheChat = async(req, res, next) =>{
    const roomId = req.params.id;
    const {userId, socketId} = req.body;

    console.log(`enterIntoTheChat:roomId = ${roomId}/${socketId}`);

    try{
        if(roomId && userId && socketId){
            const result = updateUserSocketIdInRoom(req, roomId, userId, socketId);
            console.log(`enterIntoTheChat : 결과 - ${result}`);

            return res.status(200).json({message:'접속 정보를 수정 완료하였습니다.'})
        }
        return res.status(400).json({message:'잘못된 요청 입니다.'})
    }catch(err){
        console.log(`enterIntoTheChat: error ${err}`);
        next(err);
    }

}

exports.getChatAttendeeSocket = async(req, res, next) =>{
    const roomId = req.params.id;
    const {userId} = req.body;

    console.log(`getChatAttendeeSocket:roomId = ${roomId}/${userId}`);

    try{
        if(roomId && userId ){
            const socketId = await getChatAttandeeSocketId(req, roomId, userId);
            console.log(`getChatAttendeeSocket : 결과 - ${socketId}`);

            return res.status(200).json({socketId})
        }
        return res.status(400).json({data:'잘못된 요청 입니다.'})
    }catch(err){
        console.log(`enterIntoTheChat: error ${err}`);
        next(err);
    }
}

const generateRandomColor = async() => {
    // 0부터 16777215 (FFFFFF의 10진수 값) 사이의 정수를 생성
    const randomHex = Math.floor(Math.random() * 16777215).toString(16);
    
    // 6자리로 패딩 (예: 'a3b1c' -> '0a3b1c')
    const paddedHex = randomHex.padStart(6, '0');
    
    // 앞에 #을 붙여 반환
    return `#${paddedHex}`;
};


async function getFriends(chats, meId) {
    //get chatting messages...     
    const addresseeIdSet = new Set();
    const requesterIdSet = new Set();
    
    chats.forEach(chat => {
    if(chat.userId){
        if(!addresseeIdSet.has(chat.userId.toString()) && chat.userId.toString() !== meId.toString()){
            addresseeIdSet.add(chat.userId.toString());
        }

        if(!requesterIdSet.has(chat.userId.toString()) && chat.userId.toString() !== meId.toString()){
            requesterIdSet.add(chat.userId.toString());
            }
        }
    });

    const addresseeIds = Array.from(addresseeIdSet);
    const requesterIds = Array.from(requesterIdSet);

    let friendBy = new Map(); 
    if(addresseeIds.length > 0){
        console.log(`addresseeIds: ${addresseeIds.join(', ')}`);
        console.log(`requesterIds: ${requesterIds.join(', ')}`);

        const friendships = await Friendship.find({
                 $or: [
                // ① 내가 수신자(addressee)인 경우
                { addressee: meId, requester: { $in: requesterIds } },

                // ② 내가 발신자(requester)인 경우
                { requester: meId, addressee: { $in: addresseeIds } },
            ],
            }).select('requester addressee status');

        console.log(`Friendships found: ${friendships.length}`);

            friendships.forEach(friendship => {
            console.log(`friendship found: requester=${friendship.requester} addressee=${friendship.addressee}, status=${friendship.status}`);
                
            if (friendship.requester.toString() === meId.toString()) {
                friendBy.set(friendship.addressee.toString(), friendship.status);
            }else if (friendship.addressee.toString() === meId.toString()) {
                friendBy.set(friendship.requester.toString(), friendship.status);
            }
        });
    }

    console.log(`friendBy map size: ${friendBy.size} ${Array.from(friendBy.entries()).map(([k,v])=>`${k}:${v}`).join(', ')}`);

    return friendBy;
}



async function getFriendsByAccepted(roomId, meId) {
    //get chatting messages...     
    //get chatting messages...
    const chats = await Chat.find({ room: roomId })
                        .sort('createdAt')
                        .lean();
    if(!chats){
        return [];
    } 

    const addresseeIdSet = new Set();
    const requesterIdSet = new Set();
    
    chats.forEach(chat => {
    if(chat.userId){
        if(!addresseeIdSet.has(chat.userId.toString()) && chat.userId.toString() !== meId.toString()){
            addresseeIdSet.add(chat.userId.toString());
        }

        if(!requesterIdSet.has(chat.userId.toString()) && chat.userId.toString() !== meId.toString()){
            requesterIdSet.add(chat.userId.toString());
            }
        }
    });

    const addresseeIds = Array.from(addresseeIdSet);
    const requesterIds = Array.from(requesterIdSet);

    let friendBy = new Map(); 
    if(addresseeIds.length > 0){
        console.log(`addresseeIds: ${addresseeIds.join(', ')}`);
        console.log(`requesterIds: ${requesterIds.join(', ')}`);

        const friendships = await Friendship.find({
                status: 'accepted',
                $or: [
                // 내가 수신자
                { addressee: meId, requester: { $in: requesterIds } },
                // 내가 발신자
                { requester: meId, addressee: { $in: addresseeIds } },
                ],
        })
        .select('requester addressee status')
        .lean();

        console.log(`Friendships found: ${friendships.length}`);

            friendships.forEach(friendship => {
            console.log(`friendship found: requester=${friendship.requester} addressee=${friendship.addressee}, status=${friendship.status}`);
                
            if (friendship.requester.toString() === meId.toString()) {
                friendBy.set(friendship.addressee.toString(), friendship.status);
            }else if (friendship.addressee.toString() === meId.toString()) {
                friendBy.set(friendship.requester.toString(), friendship.status);
            }
        });
    }

    console.log(`friendBy map size: ${friendBy.size} ${Array.from(friendBy.entries()).map(([k,v])=>`${k}:${v}`).join(', ')}`);

    return friendBy;
}

async function enterTheRoom(req, roomId, userId, nick, socketId){
    const redisClient = req.app.get('redisClient');

    if(redisClient){
        addAttendee(redisClient, roomId, String(userId), String(nick), String(socketId) , (err, ok) => {
            if (err) console.error(err);
            else console.log('등록 완료');
        });
    }
}

async function leaveTheRoom(req, roomId, userId){
    const redisClient = req.app.get('redisClient');

    if(redisClient){
        removeAttendee(redisClient, roomId, String(userId), (err, ok) => {
            if (err) console.error(err);
            else console.log('완료');
        });
    }
}


async function updateUserSocketIdInRoom(req, roomId, userId, socketId){
    const redisClient = req.app.get('redisClient');

    if(redisClient){
        updateAttendeeSocketId(redisClient, roomId, String(userId), String(socketId), (err, ok) => {
            if (err) console.error(err);
            else console.log('완료');

            return ok;
        });
    }
    else{
        console.log(`Redis Client Not Exist`);
    }

    return false;
} 


async function getChatAttandeeSocketId(req, roomId, userId){
    const redisClient = req.app.get('redisClient');

    if(redisClient){
        const socketId = await getAttandeeSocketId(redisClient, roomId, String(userId));

        console.log(`getChatAttandeeSocketId = ${socketId}`);
        return socketId;
    }
    else{
        console.log(`Redis Client Not Exist`);
    }

    return null;
} 

async function removeRoomInfo(req, roomId){
    const redisClient = req.app.get('redisClient');

    if(redisClient){
        const result = await removeChattingRoomInfo(redisClient, roomId);

        console.log(`removeRoomInfo = ${result}`);
        return result;
    }
    else{
        console.log(`Redis Client Not Exist`);
    }

    return 0;
} 


async function checkExistAttendeesInTheRoom(req, roomId){
    try{
        const io = req.app.get('io');
        const { rooms } = io.of('/chat').adapter;
        const room = rooms.get(roomId);

        const attendeesCount = room ? room.size : 0;
        console.log(`checkExistAttendeesInTheRoom:${roomId} 에 연결된 소켓 수:`, attendeesCount);

        return attendeesCount > 0 ? true : false;
        
    }catch(err){
        console.log(`checkExistAttendeesInTheRoom ${err}`)
    }
    return false;
}