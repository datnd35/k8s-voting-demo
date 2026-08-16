# K8s Voting Demo

A simple Kubernetes demo application consisting of:

- Voting Server — Node.js
- Result Server — Node.js
- Redis — stores vote data
- Kubernetes Deployment
- Kubernetes Service
- NGINX Ingress Controller

## Architecture

```text
                         Browser
                            |
                            | http://voting.local:8080
                            | http://results.local:8080
                            v
                  localhost:8080
                            |
                    kubectl port-forward
                            |
                            v
              +---------------------------+
              |   NGINX Ingress Controller |
              |            :80             |
              +-------------+-------------+
                            |
                 Host-based routing
                    /             \
                   /               \
                  v                 v
        voting.local          results.local
             |                      |
             v                      v
      voting-server          result-server
        Service :3000          Service :3001
             |                      |
        +----+----+            +----+----+
        |         |            |         |
        v         v            v         v
      Pod       Pod          Pod       Pod
        \         /            \         /
         \       /              \       /
          +-----+----------------+-----+
                        |
                      Redis
                       :6379
```

## Project structure

```
k8s-voting-demo/
├── services/
│   ├── voting-server/     # Express app, port 3000
│   └── result-server/     # Express app, port 3001
├── k8s/
│   ├── redis-deployment.yaml
│   ├── redis-service.yaml          # ClusterIP (internal)
│   ├── voting-server-deployment.yaml
│   ├── voting-server-service.yaml  # ClusterIP (Ingress → Service → Pod)
│   ├── result-server-deployment.yaml
│   ├── result-server-service.yaml  # ClusterIP (Ingress → Service → Pod)
│   └── ingress.yaml                # NGINX Ingress, host-based routing
└── README.md
```

---

# 1. Prerequisites

Make sure the following tools are installed:

- Docker Desktop
- kubectl
- Kubernetes enabled in Docker Desktop
- NGINX Ingress Controller

Check Kubernetes:

```bash
kubectl config current-context
```

Expected:

```text
docker-desktop
```

Check nodes:

```bash
kubectl get nodes
```

---

# 2. Build Docker Images

Build the application images:

```bash
docker build -t k8s-voting-demo/voting-server:local ./services/voting-server
docker build -t k8s-voting-demo/result-server:local ./services/result-server
```

Verify:

```bash
docker images | grep k8s-voting-demo
```

> Docker Desktop Kubernetes can use local images directly, so the images do not need to be pushed to Docker Hub for this local demo.

---

# 3. Deploy Kubernetes Resources

Apply all Kubernetes manifests:

```bash
kubectl apply -f k8s/
```

Expected resources:

```text
deployment.apps/redis
service/redis

deployment.apps/voting-server
service/voting-server

deployment.apps/result-server
service/result-server

ingress.networking.k8s.io/k8s-voting-ingress
```

---

# 4. Verify Pods

```bash
kubectl get pods
```

Example:

```text
NAME                             READY   STATUS    RESTARTS   AGE
redis-xxxxx                      1/1     Running   0          ...
result-server-xxxxx              1/1     Running   0          ...
result-server-xxxxx              1/1     Running   0          ...
voting-server-xxxxx              1/1     Running   0          ...
voting-server-xxxxx              1/1     Running   0          ...
```

The demo uses:

- Redis: 1 replica
- Result Server: 2 replicas
- Voting Server: 2+ replicas

---

# 5. Verify Services

```bash
kubectl get services
```

Example:

```text
NAME            TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
redis           ClusterIP   10.96.x.x       <none>        6379/TCP
result-server   ClusterIP   10.96.x.x       <none>        3001/TCP
voting-server   ClusterIP   10.96.x.x       <none>        3000/TCP
```

The application services use `ClusterIP`.

They are not directly exposed to the host.

Traffic enters through the NGINX Ingress.

---

# 6. Verify NGINX Ingress Controller

Check the controller:

```bash
kubectl get pods -n ingress-nginx
```

Expected:

```text
ingress-nginx-controller-xxxxx   1/1   Running
```

Check its service:

```bash
kubectl get service -n ingress-nginx
```

Example:

```text
NAME                       TYPE           EXTERNAL-IP
ingress-nginx-controller   LoadBalancer   172.18.0.7
```

---

# 7. Verify Ingress

```bash
kubectl get ingress
```

Expected:

```text
NAME                 CLASS   HOSTS
k8s-voting-ingress   nginx   voting.local,results.local
```

The Ingress uses host-based routing:

```text
voting.local
    ↓
voting-server:3000

results.local
    ↓
result-server:3001
```

---

# 8. Configure Local Hostnames

Add the following entries to `/etc/hosts`:

```text
127.0.0.1 voting.local
127.0.0.1 results.local
```

Edit:

```bash
sudo nano /etc/hosts
```

Or:

```bash
sudo pico /etc/hosts
```

Verify:

```bash
cat /etc/hosts | tail
```

Expected:

```text
127.0.0.1 voting.local
127.0.0.1 results.local
```

---

# 9. Port Forward NGINX Ingress

For the local Docker Desktop Kubernetes environment, forward local port `8080` to the NGINX Ingress Controller port `80`:

```bash
kubectl -n ingress-nginx port-forward \
  service/ingress-nginx-controller 8080:80
```

Expected:

```text
Forwarding from 127.0.0.1:8080 -> 80
Forwarding from [::1]:8080 -> 80
```

Keep this terminal running.

The traffic flow is now:

```text
Browser
   |
   | localhost:8080
   v
NGINX Ingress Controller :80
   |
   +---- voting.local ----> voting-server
   |
   +---- results.local ---> result-server
```

---

# 10. Open Voting Application

Because the Ingress is exposed through port `8080`, open:

```text
http://voting.local:8080
```

Do NOT use:

```text
http://voting.local
```

because port `80` is not being exposed directly to the host.

---

# 11. Open Result Application

Open:

```text
http://results.local:8080
```

---

# 12. Test Voting with Browser

Open:

```text
http://voting.local:8080
```

Click:

```text
Option A
```

or:

```text
Option B
```

The request goes through:

```text
Browser
   ↓
NGINX Ingress
   ↓
voting-server Service
   ↓
voting-server Pod
   ↓
Redis
```

---

# 13. Verify Voting with curl

Test Voting Server:

```bash
curl -v \
  -H "Host: voting.local" \
  http://localhost:8080
```

Expected:

```text
HTTP/1.1 200 OK
```

Test voting:

```bash
curl -X POST \
  -H "Host: voting.local" \
  -H "Content-Type: application/json" \
  -d '{"option":"A"}' \
  http://localhost:8080/vote
```

Expected:

```json
{ "message": "Vote recorded for A" }
```

---

# 14. Verify Results

```bash
curl \
  -H "Host: results.local" \
  http://localhost:8080
```

Example:

```text
Voting Results

Option A: 1 votes
Option B: 0 votes
```

The result server reads the vote data from Redis.

---

# 15. View Logs with kubectl

List pods:

```bash
kubectl get pods
```

View Voting Server logs:

```bash
kubectl logs deployment/voting-server
```

Or view a specific Pod:

```bash
kubectl logs <voting-server-pod-name>
```

View Result Server logs:

```bash
kubectl logs deployment/result-server
```

View Redis logs:

```bash
kubectl logs deployment/redis
```

Follow logs in real time:

```bash
kubectl logs -f deployment/voting-server
```

---

# 16. View Logs with Lens

The same Kubernetes resources can be monitored using Lens.

Open:

```text
Lens
  ↓
docker-desktop
  ↓
Workloads
  ↓
Pods
```

You should see:

```text
redis-xxxxx
result-server-xxxxx
result-server-xxxxx
voting-server-xxxxx
voting-server-xxxxx
```

Select a `voting-server` Pod:

```text
Pod
  ↓
Logs
```

Then open:

```text
http://voting.local:8080
```

Click:

```text
Option A
```

The request is handled by one of the `voting-server` Pods.

Lens can then be used to observe the application logs from that Pod.

---

# 17. Verify Replicas

Check Deployments:

```bash
kubectl get deployments
```

Example:

```text
NAME            READY   UP-TO-DATE   AVAILABLE
redis           1/1     1            1
result-server   2/2     2            2
voting-server   2/2     2            2
```

This demonstrates Kubernetes horizontal scaling.

For example:

```bash
kubectl scale deployment voting-server --replicas=5
```

Then:

```bash
kubectl get pods
```

You should see multiple `voting-server` Pods.

---

# 18. Rolling Update

When you update the code, build a new image and rollout:

```bash
docker build -t k8s-voting-demo/voting-server:v2 ./services/voting-server

kubectl set image deployment/voting-server \
  voting-server=k8s-voting-demo/voting-server:v2

# Watch rolling update progress
kubectl rollout status deployment/voting-server

# Rollback if something goes wrong
kubectl rollout undo deployment/voting-server
```

---

# 19. Useful Troubleshooting Commands

Check all resources:

```bash
kubectl get all
```

Check Ingress:

```bash
kubectl get ingress
```

Describe Ingress:

```bash
kubectl describe ingress k8s-voting-ingress
```

Check NGINX controller:

```bash
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

Check Service endpoints:

```bash
kubectl get endpoints
```

Check a specific Service:

```bash
kubectl describe service voting-server
```

Check Pod logs:

```bash
kubectl logs <pod-name>
```

Check Pod details/events:

```bash
kubectl describe pod <pod-name>
```

---

# 20. Stop the Demo

Stop the port-forward:

```text
Ctrl + C
```

Remove Kubernetes resources:

```bash
kubectl delete -f k8s/
```

Verify:

```bash
kubectl get pods
kubectl get services
kubectl get ingress
```

---

# 21. Demo Flow

The complete demo can be explained as:

```text
                    USER
                     |
                     v
             Browser :8080
                     |
                     v
              NGINX Ingress
                     |
          +----------+----------+
          |                     |
          v                     v
   voting.local          results.local
          |                     |
          v                     v
   voting-server          result-server
      Service                Service
          |                     |
      +---+---+             +---+---+
      |       |             |       |
      v       v             v       v
     Pod     Pod           Pod     Pod
      |                       |
      +----------+------------+
                 |
                 v
               Redis
```

This demonstrates the main Kubernetes concepts:

| Concept                 | File / Command                          |
| ----------------------- | --------------------------------------- |
| Pod                     | Created by Deployment                   |
| Deployment              | `*-deployment.yaml`                     |
| Service (ClusterIP)     | `*-service.yaml`                        |
| Ingress + Load Balancer | `ingress.yaml`                          |
| Service Discovery       | `REDIS_HOST=redis`, `voting.local`      |
| Scaling                 | `kubectl scale`                         |
| Health checks           | `readinessProbe`, `livenessProbe`       |
| Rolling update          | `kubectl set image` + `kubectl rollout` |
| Logs                    | `kubectl logs`                          |
| Env vars                | `env:` in Deployment                    |
| Lens monitoring         | Lens → Pods → Logs                      |
