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


exports.addAttendee = async(store, roomId, attendeeId, nick, callback) => {

    if (!store) {
        console.error('Redis client not found');
        return callback(new Error('Redis client not found'));
    }

    const key = `room:${roomId}:attendees`;

    console.log(`addAttendee: ${roomId}/${attendeeId}/${nick}`);

    store.hSet(key, attendeeId, nick)
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

exports.removeAttendee = async (req, roomId, userId) => {
  try {
    const redis = req.app.get('redisClient');   // app.set('redisClient', redisClient) 구조
    if (!redis) throw new Error('Redis client not found');

    const key = `room:${roomId}:attendees`;
    const result = await redis.hDel(key, userId);

    if (result > 0) {
      console.log(`🗑️ Deleted attendee ${userId} from ${key}`);
      return true;
    } else {
      console.log(`⚠️ Attendee ${userId} not found in ${key}`);
      return false;
    }
  } catch (err) {
    console.error('❌ removeAttendee error:', err);
    throw err;
  }
};
