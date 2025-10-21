const socketIo = require('socket.io');
const cookieParser = require('cookie-parser'); // 🚨 cookieParser 모듈을 여기서 다시 로드합니다.
const path = require('path');
const Room = require(path.join(__dirname, '..', 'schemas', 'room'));

module.exports = (server, app, sessionMiddleware) =>{
    const io = socketIo(server, 
        {withCredentials: true, path: '/socket.io'});

    app.set('io', io);

    const room = io.of('/room');
    const chat = io.of('/chat');
    
    const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

    // //cookie 파서를 먼저 만들어서 등록하고...이후 세션 미들웨어를 등록해야 한다...
    const cookieParserMiddleware = cookieParser(app.get('clientSecret'));
    chat.use(wrap(cookieParserMiddleware)); // 1순위: 쿠키 파싱
    chat.use(wrap(sessionMiddleware));

    /*io event*/
    io.on('connection', (socket)=> {
        const req = socket.request;
        const ip = getClientIp(req);
        console.log(`새로운 클라이언트 접속: client ip = ${ip}, socket id = ${socket.id}, ip = ${req.ip}`);    

        socket.on('disconnected', ()=>{
            console.log(`클라이언트 접속 종료: client ip = ${ip}, socket id = ${socket.id}`);
            if(socket.interval){
                clearInterval(socket.interval);
            }
        });
        socket.on('error',(error)=>{
            console.log(`오류: client ip = ${ip}, socket id = ${socket.id}`);
            console.log(error);
        });
        socket.on('reply', (data)=>{ //사용자 정의 이벤트
            console.log(`서버: 클라이언트 replqy 이벤트 수신: client ip = ${ip}, socket id = ${socket.id}, data =${data} `);
        })

        socket.interval = setInterval(()=>{
            if(socket.connected){
                console.log(`서버:  news 이벤트 송신: client ip = ${ip}, socket id = ${socket.id} Hello Socket IO `);
                socket.emit('news', 'Hello Socket IO');
            }
        }, 3000);
    });

    //room event
    room.on('connection', (socket)=>{
        console.log(`room 네임스페이스 접속`);
        
        socket.on('disconnect', ()=>{
            console.log(`room namespace 접속해제`);
        });
    });

    //chat event
    chat.on('connect', (socket)=>{
        console.log(`${socket.id} : chat 네임스페이스에 접속`);

        // ⭐️ 소켓 ID를 세션에 저장합니다.
        const session = socket.request.session;
        session.socketId = socket.id; // 예: 'socketId'라는 키 사용
        //socket.sessionId = socket.request.sessionID;
        console.log(`chat.on.connect: socket:${session.socketId}`);
        // ⭐️ 필수: 세션 저장소에 변경 사항을 반영하도록 save()를 호출해야 합니다.
        session.save(err => {
            if (err) {
                console.error('세션 저장 실패:', err);
            } else {
                console.log('세션에 socketId 저장 완료');
            }
        });

        // socket.on('join', (roomId)=>{
        //     console.log(`chat.join : data = ${roomId}`);
        //     socket.join(roomId);

        //     console.log(`socket.on:join: ${session.color}`);

        //     socket.to(roomId).emit('join', {
        //         user: 'system',
        //         chat: `Guest님이 입장하셨습니다.`
        //     })
            
        //     if (roomId) {
        //         broadcastRoomCount(io, roomId);
        //     }
        // });

         socket.on('join', (payload)=>{
            const {roomId, user} = payload;

            console.log(`chat.join : data = ${roomId} : ${user.nick}`);
            socket.join(roomId);

            console.log(`socket.on:join: ${session.color}`);

            socket.to(roomId).emit('join', {
                user: user.nick,
                chat: `${user.nick}님이 입장하셨습니다.`
            })
            
            if (roomId) {
                broadcastRoomCount(io, roomId);
            }
        });

        socket.on('leave', (payload, ack) => {
            const {roomId, user} = payload;
            socket.leave(roomId);

            const ns = io.of('/chat');
            // 남은 인원 수 갱신 및 브로드캐스트
            const size = ns.adapter.rooms.get(roomId)?.size || 0;
            ns.to(roomId).emit('leave', { chat: `${user?.nick}님이 퇴장 하셨습니다.` });

            // 클라이언트에 ACK 응답 → 이동 허용
            ack && ack();  

            broadcastRoomCount(io, roomId);
        });

        socket.on('disconnect', ()=>{
            console.log(`chat namespace 접속해제 : ${socket.id}`)
            
            const session = socket.request.session;
            if (session && session.socketId === socket.id) {
                delete session.socketId;
                // 🚨 save()를 호출하여 저장소에 반영해야 합니다.
                session.save(err => {
                    if (err) console.error('세션 제거 실패:', err);
                });
            }
        }); 

        socket.on('connect_error', (err) => {
            console.error('connect_error:', err);
        });
    })
};


/* ============== 유틸: 현재 인원 산출 + 브로드캐스트 ============== */
  async function broadcastRoomCount(io, roomId) {
    try {
      // 1) 현재 소켓 연결 기준 인원 수 (실시간)
      const ns = io.of('/chat');
      const size = ns.adapter.rooms.get(roomId)?.size || 0;

      console.log(`broadcastRoomCount : ${roomId} : ${size}`)
      
      const updated = await Room.findByIdAndUpdate(
        roomId,
        { current: size },
        { new: true, lean: true }
      ).catch(() => null);

      const max = updated?.max ?? (await Room.findById(roomId).lean())?.max ?? 0;

      // 3) 목록 페이지로 브로드캐스트 (rooms namespace)
      io.of('/room').emit('roomCount', {
        roomId,
        current: size,
        max
      });

      console.log(`[roomCount] roomId=${roomId}, current=${size}, max=${max}`);
    } catch (e) {
      console.error('broadcastRoomCount 오류:', e);
    }
  };

function getClientIp(req) {
    // 1) CDN/프록시가 줄 수 있는 헤더 우선
    const cf = req.headers['cf-connecting-ip']; // Cloudflare
    if (cf) return cf;

    const xff = req.headers['x-forwarded-for'];
    if (xff) return xff.split(',')[0].trim();

    // 2) 직접 연결된 소켓 주소
    let ip = req.socket?.remoteAddress || '';
    // IPv4-mapped (::ffff:127.0.0.1) → 127.0.0.1 로 정리
    ip = ip.replace(/^::ffff:/, '');
    // IPv6 루프백(::1) → 127.0.0.1 로 정리
    if (ip === '::1') ip = '127.0.0.1';
    return ip;
}