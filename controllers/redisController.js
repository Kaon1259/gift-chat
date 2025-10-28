require('dotenv').config();
app = require('express')();


exports.getSid = async(store, sid, callBack) =>{
    //store = req.sessionStore;
    if(!store){
        console.log(`session is not found`);
        return callBack(new Error('session not found'), null);
    }

        
    await store.get(sid, (err, sessionData )=>{
        if(err){
            console.log(`getSid:error:${err}`);
            return callBack(err, null);
        }

        console.log(`✅ getSid(${sid}):`, sessionData);
        return callBack(null, sessionData)
    })
}


exports.addAttendee = async(store, roomId, attendeeId, nick, socketId, callback) => {

    if (!store) {
        console.error('Redis client not found');
        return callback(new Error('Redis client not found'));
    }

    const key = `room:${roomId}:attendees`;

    console.log(`addAttendee: ${roomId}/${attendeeId}/${nick}`);

    store.hSet(key, String(attendeeId), String(socketId))
         .then(() => {
            console.log(`Added attendee: ${attendeeId} (${nick})`);
            callback(null, true);
        })
        .catch(err => {
            console.error('addAttendee error:', err);
            callback(err);
        }
    );
}

exports.removeAttendee = async (store, roomId, attendeeId, callback) => {
  try {
      if (!store) {
        console.error('Redis client not found');
        return callback(new Error('Redis client not found'));
      }
      
      const key = `room:${roomId}:attendees`;
      store.hDel(key, String(attendeeId))
         .then(() => {
            console.log(`removeAttendee: ${attendeeId}`);
            callback(null, true);
        })
        .catch(err => {
            console.error('removeAttendee error:', err);
            callback(err);
        }
    );
  } catch (err) {
    console.error('removeAttendee error:', err);
    callback(err);
  }
};


exports.updateAttendeeSocketId = async (store, roomId, attendeeId, socketId, callback) => {

  try {
      if (!store) {
        console.error('Redis client not found');
        return callback(new Error('Redis client not found'));
      }
      
      const key = `room:${roomId}:attendees`;

      // 레이스 방지로 존재 확인 후 업데이트(선택)
      const exists = await store.hExists(key, String(attendeeId));
      if (!exists) {
            store.hSet(key, String(attendeeId), String(socketId))
           .then(() => {
              console.log(`updateSocketId: ${attendeeId}`);
              callback(null, true);
            })
            .catch(err => {
                console.error('updateSocketId error:', err);
                callback(err, false);
            })
      }else{

        store.hSet(key, String(attendeeId), String(socketId))
          .then(() => {
              console.log(`updateSocketId: ${attendeeId}`);
              callback(null, true);
          })
          .catch(err => {
              console.error('updateSocketId error:', err);
              callback(err);
          })
      }
  } catch (err) {
    console.error('updateSocketId error:', err);
    callback(err);
  }
};

exports.getAttandeeSocketId = async(store, roomId, attendeeId) => {
  try {
      if (!store) {
        console.error('Redis client not found');
        return null;
      }
      
      const key = `room:${roomId}:attendees`;
      const socketId = await store.hGet(key, String(attendeeId))

      console.log(`getAttandeeSocketId : ${socketId}`);

      return socketId;
      }
  catch (err) {
    console.error('getAttandeeSocketId error:', err);
  }
  return null;
}

exports.removeChattingRoomInfo = async(store, roomId) => {
  try {
      if (!store) {
        console.error('Redis client not found');
        return null;
      }
      
      const key = `room:${roomId}:attendees`;
    
      const result = await store.del(key);

      if (result === 1) {
        console.log(`${key} 삭제 완료`);
      } else {
        console.log(`${key}는 존재하지 않음`);
      }

      return result;
  }
  catch (err) {
    console.error('removeChattingRoomInfo error:', err);
  }

  return 0;
}