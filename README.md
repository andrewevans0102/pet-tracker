# Pet Tracker

A mobile-friendly web app for tracking pet care across a household. Prevents double-feeding and keeps tabs on walks, bathroom breaks, and litterbox changes — with attribution so everyone knows who did what and when.

> **Note:** This app has no authentication and is designed for a trusted home network. Do not expose it to the public internet.

## Features

- Add pets with name, species, emoji, and feeding interval
- One-tap logging for feedings, walks, bathroom breaks, and litterbox cleans
- Species-aware activity tracking: dogs show walk/peed/pooped status, cats show litterbox status
- Color-coded status per activity: green (done), yellow (due soon), red (overdue)
- Family member attribution on all logged events
- Per-pet activity history (last 20 entries) with delete support
- Manage view for adding/removing pets and family members
- Auto-refreshes every 30 seconds

For a detailed breakdown of how the Kubernetes resources fit together, see [KUBERNETES.md](./KUBERNETES.md).

## Build Guide

[pet-tracker-guide.md](./pet-tracker-guide.md) is a step-by-step walkthrough for setting up the entire project from scratch on Fedora Linux. It covers:

- Installing all prerequisites: Docker, kubectl, k3s, and Node.js
- Installing and configuring Claude Code (the tool used to generate this project)
- Generating the project from the spec using Claude Code
- Building Docker images and importing them into k3s
- Deploying to Kubernetes and seeding the database
- Useful operational commands and teardown steps
- The original Claude Code spec used to generate this project

If this is your first time setting up the project on a new machine, start there.

## Prerequisites

- Fedora Linux with k3s installed and running
- Docker installed (`sudo dnf install docker`)
- `kubectl` configured to talk to your k3s cluster

Verify k3s is running:
```bash
sudo systemctl status k3s
kubectl get nodes
```

---

## Build Docker Images

Build both images from the project root:

```bash
# Backend
docker build -t pet-tracker-backend:latest ./backend

# Frontend
docker build -t pet-tracker-frontend:latest ./frontend
```

---

## Import Images into k3s

k3s uses containerd, not the Docker daemon. Export images from Docker and import into k3s:

```bash
# Save images to tar files
docker save pet-tracker-backend:latest -o /tmp/pet-tracker-backend.tar
docker save pet-tracker-frontend:latest -o /tmp/pet-tracker-frontend.tar

# Import into k3s containerd
sudo k3s ctr images import /tmp/pet-tracker-backend.tar
sudo k3s ctr images import /tmp/pet-tracker-frontend.tar

# Verify they're present
sudo k3s ctr images list | grep pet-tracker
```

---

## Deploy to Kubernetes

Apply all manifests in order:

```bash
# Create namespace first
kubectl apply -f k8s/namespace.yaml

# Storage and credentials (copy the example and fill in your values first)
# cp k8s/postgres-secret.yaml.example k8s/postgres-secret.yaml
kubectl apply -f k8s/postgres-secret.yaml
kubectl apply -f k8s/postgres-pvc.yaml

# Database
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml

# Wait for postgres to be ready
kubectl rollout status deployment/postgres -n pet-tracker

# Backend
kubectl apply -f k8s/backend-configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# Frontend
kubectl apply -f k8s/frontend-configmap.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
```

Or apply everything at once (namespace must exist first):

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

### Verify deployment

```bash
kubectl get all -n pet-tracker
kubectl rollout status deployment/pet-tracker-backend -n pet-tracker
kubectl rollout status deployment/pet-tracker-frontend -n pet-tracker
```

---

## Access the App

The frontend is exposed on NodePort 30080. Get your node's IP:

```bash
kubectl get nodes -o wide
```

Then open in a browser (or from your phone on the same network):

```
http://<node-ip>:30080
```

For local access on the same machine:
```
http://localhost:30080
```

---

## Seed Sample Data

After deploying, seed the database with example pets and family members:

```bash
# Get the backend pod name
POD=$(kubectl get pod -n pet-tracker -l app=pet-tracker-backend -o jsonpath='{.items[0].metadata.name}')

# Add family members
kubectl exec -n pet-tracker $POD -- \
  node -e "
const http = require('http');
const members = ['Alice', 'Bob', 'Charlie'];
members.forEach(name => {
  const data = JSON.stringify({ name });
  const req = http.request({ host:'localhost', port:3000, path:'/api/members', method:'POST',
    headers:{'Content-Type':'application/json','Content-Length':data.length} });
  req.write(data); req.end();
});
console.log('Members seeded');
"

# Add pets
kubectl exec -n pet-tracker $POD -- \
  node -e "
const http = require('http');
const pets = [
  { name:'Buddy', species:'Dog', emoji:'🐶', feeding_interval_hours: 8 },
  { name:'Whiskers', species:'Cat', emoji:'🐱', feeding_interval_hours: 12 },
  { name:'Nibbles', species:'Rabbit', emoji:'🐰', feeding_interval_hours: 6 },
];
pets.forEach(pet => {
  const data = JSON.stringify(pet);
  const req = http.request({ host:'localhost', port:3000, path:'/api/pets', method:'POST',
    headers:{'Content-Type':'application/json','Content-Length':data.length} });
  req.write(data); req.end();
});
console.log('Pets seeded');
"
```

Alternatively, seed via `curl` from your local machine (if you can reach the backend):

```bash
BACKEND="http://localhost:30080/api"

curl -s -X POST $BACKEND/members -H 'Content-Type: application/json' -d '{"name":"Alice"}'
curl -s -X POST $BACKEND/members -H 'Content-Type: application/json' -d '{"name":"Bob"}'

curl -s -X POST $BACKEND/pets -H 'Content-Type: application/json' \
  -d '{"name":"Buddy","species":"Dog","emoji":"🐶","feeding_interval_hours":8}'
curl -s -X POST $BACKEND/pets -H 'Content-Type: application/json' \
  -d '{"name":"Whiskers","species":"Cat","emoji":"🐱","feeding_interval_hours":12}'
```

---

## Updating the App

After code changes, rebuild and re-import the image, then restart the deployment:

```bash
# Rebuild
docker build -t pet-tracker-backend:latest ./backend
# (or frontend)

# Re-import
docker save pet-tracker-backend:latest -o /tmp/pet-tracker-backend.tar
sudo k3s ctr images import /tmp/pet-tracker-backend.tar

# Restart pods to pick up new image
kubectl rollout restart deployment/pet-tracker-backend -n pet-tracker
```

---

## Viewing Logs

```bash
# Backend logs
kubectl logs -n pet-tracker -l app=pet-tracker-backend --tail=50 -f

# Frontend (nginx) logs
kubectl logs -n pet-tracker -l app=pet-tracker-frontend --tail=50 -f

# Postgres logs
kubectl logs -n pet-tracker -l app=postgres --tail=50
```

---

## Teardown

Remove all app resources (keeps the namespace if you want to redeploy):

```bash
kubectl delete -f k8s/
```

Full teardown including namespace and persistent data:

```bash
kubectl delete namespace pet-tracker
```

> **Warning:** Deleting the namespace also deletes the PVC and all feeding history stored in PostgreSQL.

---

## Project Structure

```
pet-tracker/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js          # Express app entry point, DB init with retry
│       ├── db.js             # pg Pool from env vars
│       ├── init.sql          # CREATE TABLE IF NOT EXISTS statements
│       └── routes/
│           ├── pets.js       # GET/POST/PUT/DELETE /api/pets
│           ├── members.js    # GET/POST/DELETE /api/members
│           └── feedings.js   # GET/POST/DELETE /api/feedings
├── frontend/
│   ├── Dockerfile            # Multi-stage: Vite build → nginx serve
│   ├── nginx.conf            # Proxies /api/* to pet-tracker-backend:3000
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx           # Main app state, fetch logic, routing
│       └── components/
│           ├── PetCard.jsx       # Per-pet status card with color coding
│           ├── FeedButton.jsx    # Feed! button with loading state
│           ├── FeedingHistory.jsx # Collapsible history list
│           ├── AddPetForm.jsx    # Emoji picker + pet creation form
│           └── MemberSelector.jsx # Family member dropdown
└── k8s/
    ├── namespace.yaml
    ├── postgres-secret.yaml.example  # DB credentials template (copy and fill in)
    ├── postgres-pvc.yaml          # 1Gi persistent volume
    ├── postgres-deployment.yaml
    ├── postgres-service.yaml      # ClusterIP :5432
    ├── backend-configmap.yaml     # DB connection env vars
    ├── backend-deployment.yaml    # 2 replicas, imagePullPolicy: Never
    ├── backend-service.yaml       # ClusterIP :3000
    ├── frontend-configmap.yaml
    ├── frontend-deployment.yaml   # 2 replicas, imagePullPolicy: Never
    └── frontend-service.yaml      # NodePort :30080
```

## Database Credentials

Before deploying, create your own `k8s/postgres-secret.yaml` from the provided template:

```bash
cp k8s/postgres-secret.yaml.example k8s/postgres-secret.yaml
```

Then edit `k8s/postgres-secret.yaml` and replace the placeholder values with your own base64-encoded credentials:

```bash
echo -n 'yourdbname' | base64
echo -n 'yourusername' | base64
echo -n 'yourpassword' | base64
```

`k8s/postgres-secret.yaml` is listed in `.gitignore` and will not be committed.
