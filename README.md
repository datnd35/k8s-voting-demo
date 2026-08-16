# k8s-voting-demo

Simple Node.js + Redis voting app to learn Kubernetes basics:
- Docker containers
- Pods
- Deployments
- Services
- Service discovery
- Scaling replicas
- Environment variables
- Health checks
- Logs
- Rolling updates

## Architecture

Browser
  |
  +----> Voting Server
  |          |
  |          v
  |        Redis
  |
  +----> Result Server
             |
             v
           Redis

## Project structure

- services/voting-server
- services/result-server

## Install dependencies

cd services/voting-server && npm install
cd ../result-server && npm install

## Run Redis locally

docker run --name k8s-voting-redis -p 6379:6379 -d redis:7-alpine

## Run voting-server locally

cd services/voting-server
REDIS_HOST=localhost REDIS_PORT=6379 npm start

Voting UI: http://localhost:3000

## Run result-server locally

cd services/result-server
REDIS_HOST=localhost REDIS_PORT=6379 npm start

Result UI: http://localhost:3001

## Test APIs

### POST /vote

Request body example:
{
  "option": "A"
}

### GET /health

Returns:
{
  "status": "ok"
}

### GET /ready

Checks Redis connectivity.
Returns HTTP 503 if Redis is unavailable.

## Example curl commands

curl -X POST http://localhost:3000/vote -H "Content-Type: application/json" -d '{"option":"A"}'
curl -X POST http://localhost:3000/vote -H "Content-Type: application/json" -d '{"option":"B"}'
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3001/health
curl http://localhost:3001/ready
# k8s-voting-demo
