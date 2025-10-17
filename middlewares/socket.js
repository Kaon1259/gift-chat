const webSocket = require('ws');

module.exports = (server) =>{
    //connet to express...
    const wss = new webSocket.Server({server});

    wss.on('connection', (ws, req)=>{  //web socket connected,...
        const ip = getClientIp(req); //req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
        console.log(`새로운 클라이언트 접속 :  ${ip}`);

        ws.on('message',(message)=>{
            console.log(`${ip} : ${message.toString()}`);
        });
        ws.on('error',(error)=>{
            console.log(`${ip} error : ${error}`);
        });
        ws.on('close', ()=>{
            console.log(`${ip} : Client 접속 해제`);
            if (ws.interval) clearInterval(ws.interval);
            //5초마다 ping 클라이언트에 전달...타이머 중지
        });
        
        ws.interval = setInterval(() => {
            if(ws.readyState === ws.OPEN){
                ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
            }
        }, 5000);
    });
}

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