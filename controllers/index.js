const path = require('path');
const Room = require(path.join(__dirname, '..', 'schemas', 'room'));
const Chat = require(path.join(__dirname, '..', 'schemas', 'chat'));


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
        const rooms = await Room.find({});
        return res.render('main', {rooms, title: 'GIF 채팅방'});
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
            owner: req.user.nick, //req.session.color,
            ownerId: req.user._id,
            password: password,
        });

        const  io = req.app.get('io');
        io.of('/room').emit('newRoom', newRoom);
        if(password){
            res.redirect(`/room/${newRoom._id}?password=${password}`);
        }else{
            res.redirect(`/room/${newRoom._id}`);
        }
    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.enterRoom = async(req, res, next) => {
    try{
        const id = req.params.id;
        const password = req.query.password;
        console.log(`enterRoom ; ${id}, ${password}`);

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
            // user:,
        });

    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.removeRoom = async(req, res, next) =>{
    try{
        const id = req.params.id;
        if(id){
            await Room.deleteOne({_id: req.params.id})
            await Chat.deleteOne({room: id});
            return res.status(200).send('ok');
        }
        return res.status(500).send('server error');
    }catch(err){
        console.log(err);
        next(err);
    }
}

exports.sendChat = async(req, res, next)=>{
    try{
        const roomId = req.params.id;
        const nick = req.user.nick;
        const userId = req.user._id;
        const color = req.session.color;
        const chatData = req.body.chat;

        console.log(`sendChat; ${nick} : ${userId}`);

        const chat = await Chat.create({
            room: roomId,
            user: nick,
            userId: userId,
            color: color,
            chatType: 'local',
            chat: chatData,
        });

        console.log(`sendChat: ${req.params.id} : ${req.body.chat}, color:${chat.color} socketId:${req.session.socketId}`);
        req.app.get('io').of('/chat').to(req.params.id).emit('chat', {chat, socketId: req.session.socketId || null,});
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

        const chat = await Chat.create({
            room: roomId,
            user: nick,
            userId: userId,
            color: color,
            chatType: 'broadcast',
            chat: chatData,
        });

        req.app.get('io').of('/chat').emit('broadcastchat', chat);
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
            user: targetSocketUser,
            userId: userId,
            color: color,
            chatType: 'whisper',
            from: sourceSocketUser,  //임시
            chat: chatData,
        });
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

const generateRandomColor = () => {
    // 0부터 16777215 (FFFFFF의 10진수 값) 사이의 정수를 생성
    const randomHex = Math.floor(Math.random() * 16777215).toString(16);
    
    // 6자리로 패딩 (예: 'a3b1c' -> '0a3b1c')
    const paddedHex = randomHex.padStart(6, '0');
    
    // 앞에 #을 붙여 반환
    return `#${paddedHex}`;
};