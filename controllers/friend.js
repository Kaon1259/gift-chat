const e = require('express');
const path = require('path');
const Friendship = require(path.join(__dirname, '..', 'schemas', 'friendShip'));
const User = require(path.join(__dirname, '..', 'schemas', 'user'));

exports.renderFriendShip = async(req, res, next) =>{
    const me = req.user._id;

    console.log(`renderFriendShip : ${me}`);

    try{ 
        const friends = await Friendship.find({
          $or: [
            { requester: me },
            { addressee: me }
          ]
        })
        .populate('requester', '_id nick email') // 내 정보
        .populate('addressee', '_id nick email') // 상대방 정보
        .select('_id requester addressee status createdAt')
        .sort({ createdAt: -1 })
        .lean();

        if (!friends.length) {
            console.log('renderFriendShip: no relations');
        }

        res.render('friendship', {items: friends, title: '내가 신청한 친구목록', activeMenu: 'friends' });

    }catch(err){
        console.log(err);
        next(err);  
    }
}

exports.renderFriendShipRequest = async(req, res, next) =>{
    
    const {addresseeNick, addresseeId} = req.body;
    const requester =  req.user._id;
    const addressee = addresseeId;

    console.log(`renderFriendShipRequest called : requester = ${requester} /  ${addresseeNick} address = ${addressee} / ${addresseeId}`);
    try{
        
        if(requester === addressee){
            return res.status(400).json({ message: '자기 자신에게는 친구 요청을 할 수 없습니다.' });
        }

        console.log(`renderFriendShipRequest : requester = ${requester} /  addressee = ${addressee} `);

        const exFriendship = await Friendship.findOne({
              requester: requester, 
              addressee: addressee,
              status: { $nin: ['canceled', 'rejected'] }    //취소가 거절인 경우에는 다시 요청 가능하게 
        }); 

        if(exFriendship){
            console.log(`already registered renderFriendShipRequest : requester = ${requester} /  ${addresseeNick} address = ${addressee} / ${addresseeNick}`);
            if(exFriendship.status === 'declined' || exFriendship.status === 'blocked'){
                exFriendship.status = 'requested';
                exFriendship.actionBy = requester;
                await exFriendship.save();
            }
            return res.status(200).json({ message: '이미 존재하는 친구 관계 또는 요청이 있습니다.' });
        }else{
            console.log(`new renderFriendShipRequest : requester = ${requester} /  ${addresseeNick} address = ${addressee} / ${addresseeNick}`);  
            const newFriendship = new Friendship({
                requester: requester,   
                addressee: addressee,
                status: 'requested',
                actionBy: requester,
            });
            await newFriendship.save();
            return res.status(201).json({ message: '친구 요청이 성공적으로 전송되었습니다.' });
        }    
    }catch(err){
        console.log(err);
        return res.status(500).json({ message: '친구 요청 처리 중 오류가 발생했습니다.' });
    }
}

exports.accept = async (req, res, next) => {
  try {
    console.log(`accept:friendship: ${req.params.id} : addressee : ${req.user._id}`);
    const addresseeId = req.user._id;
    const friendshipId = req.params.id;
  
    const friendship = await Friendship.findOneAndUpdate(
      {
        _id: friendshipId,       // 특정 요청 ID
        addressee: addresseeId,    // 현재 로그인한 나
        status: 'requested'         // 아직 수락되지 않은 요청
      },
      { status: 'accepted' },       // 수락으로 변경
      { new: true }
    );
    
    if (!friendship) {
      return res.status(200).json({ message: '수락할 친구 요청이 없습니다.' });
    }

    res.redirect('/friend');
  } catch (err) {
    console.error(err);
    res.status(500).send('친구 요청 수락 중 오류');
  }
};

// ✅ 친구요청 취소
exports.cancel = async (req, res, next) => {
  const friendshipId = req.params.id;
  const requesterId = req.user._id;

  try {
      const friendship = await Friendship.findOneAndUpdate(
        {
          _id: friendshipId,       // 특정 요청 ID
          requester: requesterId,    // 현재 로그인한 나
          status: 'requested'         // 아직 수락되지 않은 요청
        },
        { status: 'canceled' },       // 요청 취소로 변경
        { new: true }
      );

      if (!friendship) {
        return res.status(200).json({ message: '취소할 친구 요청이 없습니다.' });
      }

      res.redirect('/friend');
  } catch (err) {
    console.error(err);
    res.status(500).send('요청 취소 중 오류');
  }
};

// ✅ 차단 해제
exports.unblock  = async (req, res, next) => {
  const friendshipId = req.params.id;
  const addresseeId = req.user._id;

  try {
      const friendship = await Friendship.findOneAndUpdate(
        {
          _id: friendshipId,       // 특정 요청 ID
          addressee: addresseeId,    // 현재 로그인한 나
          status: 'blocked'         // 아직 수락되지 않은 요청
        },
        { status: 'accepted' },       // 블록으로 변경
        { new: true }
      );

      if (!friendship) {
        return res.status(200).json({ message: '차단 해제할 친구 요청이 없습니다.' });
      }

      res.redirect('/friend');

  } catch (err) {
    console.error(err);
    res.status(500).send('차단 해제 중 오류');
  }
};

// ✅ 차단
exports.block  = async (req, res, next) => {
  const friendshipId = req.params.id;
  const addresseeId = req.user._id;

  try {
    const friendship = await Friendship.findOneAndUpdate(
      {
        _id: friendshipId,       // 특정 요청 ID
        addressee: addresseeId,    // 현재 로그인한 나
        status: 'accepted'         // 아직 수락되지 않은 요청
      },
      { status: 'blocked' },       // 블록으로 변경
      { new: true }
    );

    if (!friendship) {
      return res.status(200).json({ message: '차단할 친구 요청이 없습니다.' });
    }

    res.redirect('/friend');

  } catch (err) {
    console.error(err);
    res.status(500).send('차단 해제 중 오류');
  }
};

// ✅ 차단
exports.reject  = async (req, res, next) => {
  const friendshipId = req.params.id;
  const addresseeId = req.user._id;

  try {
    const friendship = await Friendship.findOneAndUpdate(
      {
        _id: friendshipId,       // 특정 요청 ID
        addressee: addresseeId,    // 현재 로그인한 나
        status: 'requested'         // 아직 수락되지 않은 요청
      },
      { status: 'rejected' },       // 거절 변경
      { new: true }
    );

    if (!friendship) {
      return res.status(200).json({ message: '거절할 친구 요청이 없습니다.' });
    }

    res.redirect('/friend');

  } catch (err) {
    console.error(err);
    res.status(500).send('차단 해제 중 오류');
  }
};