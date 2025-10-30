const { Kafka } = require('kafkajs');
require('dotenv').config();

exports.connectKafka = async (app)=>{

    try{
        const kafka = new Kafka(
            {
            clientId: process.env.KAFKA_CLIENTID,
            brokers: process.env.KAFKA_BROKERS.split(',').map(b => b.trim()),
            }
        );

        if(!kafka){
            return;
        }
        app.set('kafka', kafka);

        const admin = kafka.admin();
        app.set('kafkaAdmin', admin);
        
        const producer = kafka.producer();
        app.set('kafkaProducer', producer);

        const isProducerConnected = connectKafkaProducer(producer);
        app.set('kafkaProducerIsConnected', isProducerConnected);

        // await createTopicWithAdmin(admin, process.env.TOPIC_CHAT_REGISTRATION);

        // for(i=0; i < 10; i++){
        //     await addTopic(app, process.env.TOPIC_CHAT_REGISTRATION, generateUniqueId(), generateUniqueId());
        //     i++;
        // }

        // exploreTopics(admin);
    }catch(err){
        console.log(`connectKafka : ${err}`);
    }
}

async function connectKafkaProducer(producer) {
    let isProducerConnected = false;
    try {
        await producer.connect();
        isProducerConnected = true;
        console.log('Kafka Producer가 성공적으로 연결되었습니다.');
    } catch (error) {
        console.error('Kafka Producer 연결 실패:', error.message);
        // 연결 실패 시 서버는 실행하되, Kafka 관련 기능은 비활성화할 수 있습니다.
        isProducerConnected = false; 
    }
    return isProducerConnected;
}

exports.setTopic = async(app, topic, key, data)=>{

    if (app.get('isProducerConnected')) {
        try {
            await producer.send({
                topic: topic,
                messages: [
                    {
                        // key: 메시지의 키. 보통 사용자 ID를 사용하여 같은 사용자의 메시지는 같은 파티션에 저장되게 합니다.
                        key: String(key),
                        
                        // value: 전송할 실제 데이터. Kafka에서는 Buffer(바이트) 형태로 전송하며, 
                        // JSON 형태를 문자열로 변환하여 전송하는 것이 일반적입니다.
                        value: JSON.stringify(data),
                    },
                ],
            });
            console.log(`사용자 등록 정보가 Kafka 토픽 '${top}'으로 전송되었습니다.`);

        } catch (kafkaError) {
            console.error('Kafka 전송 오류:', kafkaError.message);
        }
    } else {
        console.warn('Kafka Producer가 연결되지 않아 이벤트를 전송할 수 없습니다.');
    }
}

async function addTopic(app, topic, key, data){

    if (app.get('isProducerConnected')) {
        try {
            const producer = app.get('kafkaProducer');

            await producer.send({
                topic: topic,
                messages: [
                    {
                        // key: 메시지의 키. 보통 사용자 ID를 사용하여 같은 사용자의 메시지는 같은 파티션에 저장되게 합니다.
                        key: String(key),
                        
                        // value: 전송할 실제 데이터. Kafka에서는 Buffer(바이트) 형태로 전송하며, 
                        // JSON 형태를 문자열로 변환하여 전송하는 것이 일반적입니다.
                        value: JSON.stringify(data),
                    },
                ],
            });
            console.log(`사용자 등록 정보가 Kafka 토픽 '${topic}'으로 전송되었습니다.`);

        } catch (kafkaError) {
            console.error('Kafka 전송 오류:', kafkaError.message);
        }
    } else {
        console.warn('Kafka Producer가 연결되지 않아 이벤트를 전송할 수 없습니다.');
    }
} 

async function createTopicWithAdmin(admin, topic){
      await admin.createTopics({
            topics: [{
                topic: topic,
                numPartitions: 2, // 파티션 2개 설정
                replicationFactor: 1, // 복제 팩터 1 설정
            }],
            waitForLeaders: true, // 리더가 선택될 때까지 기다림
        });
        console.log(`✨ 토픽 '${topic}'이(가) 성공적으로 생성되었거나 이미 존재합니다.`);
}

async function exploreTopics(admin){
    try {
        await admin.connect();
        console.log('Kafka Admin 클라이언트 연결 성공');

        console.log('Kafka 클러스터의 모든 토픽 메타데이터를 읽어옵니다...');
        
        // 모든 토픽 목록을 가져오려면 인자 없이 호출하거나, listTopics()를 사용할 수 있습니다.
        const allTopicsMetadata = await admin.fetchTopicMetadata();

        console.log(`\n================ 모든 토픽 목록 (${allTopicsMetadata.topics.length}개) ================`);
        
        allTopicsMetadata.topics.forEach(topic => {
            console.log(`- 토픽 이름: ${topic.name}`);
            console.log(`  파티션 수: ${topic.partitions.length}개`);
            // 추가 정보: 각 파티션의 리더, 레플리카 정보 등
            topic.partitions.forEach(p => {
                console.log(`    [Partition ${p.partitionId}] 리더: ${p.leader}, 레플리카: [${p.replicas.join(', ')}]`);
            });
        });
        console.log('================================================================');

    } catch (error) {
        console.error('Kafka 작업 오류:', error.message);
    } finally {
        await admin.disconnect();
        console.log('Admin 클라이언트 연결 종료');
    }
}

function generateUniqueId() {
    return Math.floor(Math.random() * 1000000);
}

// // 애플리케이션 시작 시 Kafka 연결 시도
// connectKafkaProducer();

// // 애플리케이션 종료 시 Kafka 연결 해제
// process.on('SIGINT', async () => {
//     if (isProducerConnected) {
//         await producer.disconnect();
//         console.log('\n🔗 Kafka Producer 연결 종료됨.');
//     }
//     process.exit(0);
// });
