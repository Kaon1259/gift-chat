const mongoose = require('mongoose');

const {Schema, Types} = mongoose;

const FriendshipSchema = new Schema({
    // 요청자와 상대(수락자)
    requester: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    addressee:{ type: Types.ObjectId, ref: 'User', required: true, index: true },

    // 관계 상태
    status: {
        type: String,
        enum: ['requested', 'accepted', 'declined', 'blocked'],
        default: 'requested',
        index: true,
    },

    // 누가 마지막으로 액션했는지 (차단/수락 등)
    actionBy: { type: Types.ObjectId, ref: 'User' },

    // 역순 중복 방지용 고유 키(작은 ObjectId 먼저)
    pairKey: { type: String, unique: true, index: true },
    }, 
    { 
        timestamps: true 
    }
);

    // pairKey 자동 생성(문서 저장 전)
FriendshipSchema.pre('validate', function(next) {
    const a = String(this.requester);
    const b = String(this.addressee);
    if (!a || !b) return next(new Error('requester/addressee required'));
        
    this.pairKey = (a < b) ? `${a}:${b}` : `${b}:${a}`;
    next();
});

module.exports = mongoose.model('Friendship', FriendshipSchema);