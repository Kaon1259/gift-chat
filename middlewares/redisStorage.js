// redisStorage.js
const { createClient } = require('redis');
require('dotenv').config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Redis 클라이언트 초기화
const redisClient = createClient({
    url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
    password: REDIS_PASSWORD,
});

// 1. 에러 이벤트 핸들러
redisClient.on('error', (err) => {
    console.error('Redis 연결 오류 (redisStorage.js):', err);
    // 운영 환경에서는 재연결 로직, Sentry/Slack 알림 등 추가 권장
});

// 2. 준비 완료 이벤트 핸들러
redisClient.on('ready', () => {
    console.log('Redis 클라이언트가 명령을 실행할 준비가 되었습니다.');
});

// 3. 연결 시작 및 비동기 처리
async function connectRedis() {
    if (redisClient.isReady) {
        console.log('Redis 클라이언트가 이미 연결되어 있습니다.');
        return;
    }
    try {
        await redisClient.connect();
        console.log(`Redis 서버에 연결 성공: ${REDIS_HOST}:${REDIS_PORT}`);
    } catch (err) {
        console.error('Redis 초기 연결 시도 실패:', err);
    }
}

// 모듈 로드시 자동 연결 시도
connectRedis();

module.exports = redisClient;
