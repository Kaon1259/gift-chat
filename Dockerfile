# 1. Node.js 공식 경량 이미지를 베이스 이미지로 사용합니다.
# LTS 버전 사용을 권장합니다.
FROM node:20-slim

# 2. 컨테이너 내부에서 작업할 디렉토리를 설정합니다.
WORKDIR /usr/src/app

# 3. 패키지 정의 파일(package.json, package-lock.json)을 먼저 복사합니다.
# 이 단계만 캐시하여 의존성 변경이 없을 때 빌드 속도를 높입니다.
COPY package*.json ./

# 4. 의존성 패키지를 설치합니다.
# 프로덕션 환경이므로 개발용 의존성은 제외합니다.
RUN npm install --only=production

# 5. 나머지 애플리케이션 소스 코드를 작업 디렉토리에 복사합니다.
COPY . .

# 6. 애플리케이션이 사용할 포트를 지정합니다.
# (외부 노출을 의미하며, 'docker run' 시 실제 매핑이 필요합니다.)
EXPOSE 8080

# 7. 컨테이너가 시작될 때 실행할 명령어를 정의합니다.
# 일반적으로 Node.js 애플리케이션 실행 명령입니다.
CMD [ "node", "app.js" ]
# 또는 npm start를 사용하는 경우:
# CMD [ "npm", "start" ]