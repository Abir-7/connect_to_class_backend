1st run-
docker network create shared-network

then-
docker-compose -f docker-compose-queue.yml up -d

then- 
docker-compose up --build or npm run dev ---- need to setup radis and rabitmq  based on command
