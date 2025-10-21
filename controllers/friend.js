const path = require('path');
const Friendship = require(path.join(__dirname, '..', 'schemas', 'friendShip'));
const User = require(path.join(__dirname, '..', 'schemas', 'user'));

exports.renderFriendShip = async(req, res, next) =>{
    const userId = requester = addressee = req.user._id;

    console.log(`renderFriendShip : ${userId} / ${requester} / ${addressee}`);

    const rels = await Friendship.find({
                status: 'accepted',
                $or: [{ requester: requester }, { addressee: addressee }],
    }).select('requester addressee').lean();

    const friendIds = rels.map(r =>
        String(r.requester) === String(userId) ? r.addressee : r.requester
    );

    console.log(`renderFriendShip: friendIds = ${friendIds}`);
    const friends = User.find({ _id: { $in: friendIds } })
             .select('_id nick email snsnId')
             .lean();

    res.render('friendship', {friends, title: 'GIF 친구목록', activeMenu: 'friends' });
}