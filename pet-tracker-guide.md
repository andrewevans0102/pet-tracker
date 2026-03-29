# Pet Feeding Tracker — Complete Build Guide
### Fedora Linux: From Nothing to Running on Kubernetes

---

## Table of Contents

1. [Prerequisites & System Setup](#1-prerequisites--system-setup)
2. [Install Docker](#2-install-docker)
3. [Install kubectl](#3-install-kubectl)
4. [Install k3s (Local Kubernetes)](#4-install-k3s-local-kubernetes)
5. [Install Node.js](#5-install-nodejs)
6. [Install Claude Code](#6-install-claude-code)
7. [Generate the Project](#7-generate-the-project)
8. [Build Docker Images](#8-build-docker-images)
9. [Deploy to Kubernetes](#9-deploy-to-kubernetes)
10. [Seed the Database](#10-seed-the-database)
11. [Access the App](#11-access-the-app)
12. [Useful Commands](#12-useful-commands)
13. [Teardown](#13-teardown)
14. [The Claude Code Spec](#14-the-claude-code-spec)

---

## 1. Prerequisites & System Setup

Open a terminal and make sure your system is up to date:

```bash
sudo dnf update -y
```

Install some core tools you'll need throughout:

```bash
sudo dnf install -y git curl wget tar
```

---

## 2. Install Docker

Fedora uses Docker via the official Docker CE repository (not the Podman substitute — we want Docker for image builds that k3s can load easily).

```bash
# Add Docker's official repo
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo

# Install Docker CE
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
```

> **⚠️ Troubleshooting: Timeout or repo errors**
>
> Docker's repo CDN occasionally times out, or may not yet have packages built for the
> latest Fedora release. If the install fails, try these fixes in order:
>
> **Fix 1 — Just retry**, it's often a transient timeout:
> ```bash
> sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
> ```
>
> **Fix 2 — Force Fedora 42 packages**, which work fine on Fedora 43:
> ```bash
> sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin \
>   --releasever=42
> ```
>
> **Fix 3 — Pin the repo permanently to Fedora 42:**
> ```bash
> sudo sed -i 's/$releasever/42/g' /etc/yum.repos.d/docker-ce.repo
> sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
> ```
>
> **Fix 4 — Use Moby Engine instead** (Docker's open-source upstream, available directly
> in Fedora's own repos with no external repo needed):
> ```bash
> sudo dnf install -y moby-engine
> ```

Once Docker is installed (by whichever method worked):

```bash
# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Allow your user to run Docker without sudo
sudo usermod -aG docker $USER

# Apply group change (or log out and back in)
newgrp docker

# Verify Docker works
docker run hello-world
```

---

## 3. Install kubectl

`kubectl` is the command-line tool for talking to Kubernetes.

```bash
# Download the latest stable release
curl -LO "https://dl.k8s.io/release/$(curl -Ls https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Make it executable and move it to your PATH
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify
kubectl version --client
```

---

## 4. Install k3s (Local Kubernetes)

k3s is a lightweight Kubernetes distribution that runs great on a laptop. It sets up a full single-node cluster in about 30 seconds.

### Step 1: Install the SELinux policy first

Fedora ships with SELinux enforcing by default. k3s requires its own SELinux policy package. Make sure to use the `el9` build — the older `el8` package has a conflicting `container-selinux` version dependency and will fail on Fedora 43.

```bash
sudo dnf install -y container-selinux selinux-policy-base
sudo dnf install -y https://rpm.rancher.io/k3s/latest/common/centos/9/noarch/k3s-selinux-1.6-1.el9.noarch.rpm
```

### Step 2: Install k3s

```bash
curl -sfL https://get.k3s.io | sh -
```

### Step 3: Verify k3s is actually running before proceeding

The kubeconfig file at `/etc/rancher/k3s/k3s.yaml` is only created once the k3s service successfully starts. If the service failed to start, the file won't exist and the next step will fail with `No such file or directory`.

```bash
sudo systemctl status k3s
```

You should see `Active: active (running)`. If it shows `failed` or `inactive`, check the logs:

```bash
sudo journalctl -u k3s -n 50 --no-pager
```

> **Common failure cause on Fedora:** If the logs mention `container_runtime_exec_t`, the
> SELinux policy wasn't applied correctly. Re-run Step 1 above, then reinstall k3s.

### Step 4: Configure kubectl to use k3s

Only run this once Step 3 confirms k3s is running:

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config

# Verify the cluster is running
kubectl get nodes
```

You should see one node with status `Ready`.

> **Note on k3s and local images:** k3s uses its own container runtime (containerd), not
> Docker. When you build images with Docker, k3s won't automatically see them. We'll handle
> this by importing built images into k3s using `k3s ctr images import`. Steps are in
> Section 8.

> **Note on SELinux and PersistentVolumes:** If your Postgres pod can't write to its volume,
> run:
> ```bash
> sudo setsebool -P container_manage_cgroup true
> ```

---

## 5. Install Node.js

Node.js is needed to run Claude Code.

```bash
# Install Node.js 20 via NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify
node --version   # should be v20.x.x
npm --version
```

---

## 6. Install Claude Code

Claude Code is Anthropic's CLI tool that generates the project from your spec.

```bash
npm install -g @anthropic/claude-code

# Verify
claude --version
```

You'll need an Anthropic API key. If you don't have one, create one at https://console.anthropic.com.

```bash
# Set your API key (add this to ~/.bashrc or ~/.zshrc to make it permanent)
export ANTHROPIC_API_KEY="your-api-key-here"
```

---

## 7. Generate the Project

Create a folder for the project and launch Claude Code inside it:

```bash
mkdir ~/pet-tracker
cd ~/pet-tracker
claude
```

When the Claude Code prompt appears, paste the full spec from [Section 14](#14-the-claude-code-spec) below.

Claude Code will generate all the source files, Dockerfiles, and Kubernetes manifests. Review them once it's done — the structure should look like this:

```
pet-tracker/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── routes/
│       │   ├── pets.js
│       │   ├── members.js
│       │   └── feedings.js
│       └── init.sql
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       └── components/
│           ├── PetCard.jsx
│           ├── FeedButton.jsx
│           ├── FeedingHistory.jsx
│           ├── AddPetForm.jsx
│           └── MemberSelector.jsx
└── k8s/
    ├── namespace.yaml
    ├── postgres-pvc.yaml
    ├── postgres-secret.yaml
    ├── postgres-deployment.yaml
    ├── postgres-service.yaml
    ├── backend-configmap.yaml
    ├── backend-deployment.yaml
    ├── backend-service.yaml
    ├── frontend-configmap.yaml
    ├── frontend-deployment.yaml
    └── frontend-service.yaml
```

---

## 8. Build Docker Images

Now build the Docker images for the backend and frontend.

```bash
cd ~/pet-tracker

# Build the backend image
docker build -t pet-tracker-backend:latest ./backend

# Build the frontend image
docker build -t pet-tracker-frontend:latest ./frontend
```

Because k3s uses its own containerd runtime (not Docker), you need to import the images into k3s:

```bash
# Export images from Docker and import into k3s
docker save pet-tracker-backend:latest | sudo k3s ctr images import -
docker save pet-tracker-frontend:latest | sudo k3s ctr images import -

# Verify k3s can see the images
sudo k3s ctr images list | grep pet-tracker
```

---

## 9. Deploy to Kubernetes

Apply all the Kubernetes manifests in order:

```bash
cd ~/pet-tracker

# Create the namespace first
kubectl apply -f k8s/namespace.yaml

# Deploy PostgreSQL (storage, secret, deployment, service)
kubectl apply -f k8s/postgres-secret.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml

# Wait for Postgres to be ready before deploying the backend
kubectl wait --for=condition=ready pod -l app=postgres -n pet-tracker --timeout=60s

# Deploy the backend
kubectl apply -f k8s/backend-configmap.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# Deploy the frontend
kubectl apply -f k8s/frontend-configmap.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml

# Check that everything is running
kubectl get pods -n pet-tracker
```

All pods should show `Running` status within a minute or two. If any are stuck, check the logs:

```bash
kubectl logs -n pet-tracker <pod-name>
```

> **Firewall note:** If you want to access the app from other devices on your home network
> (phones, tablets), open port 30080 in Fedora's firewall:
> ```bash
> sudo firewall-cmd --add-port=30080/tcp --permanent
> sudo firewall-cmd --reload
> ```

---

## 10. Seed the Database

Run the SQL schema to create the tables. First, find the Postgres pod name:

```bash
kubectl get pods -n pet-tracker -l app=postgres
```

Then pipe `init.sql` directly into the pod from your laptop:

```bash
kubectl exec -i -n pet-tracker <postgres-pod-name> -- psql -U petuser -d pettracker < backend/src/init.sql
```

Replace `<postgres-pod-name>` with the actual pod name from the previous command (e.g. `postgres-f65c9c868-k7ws8`).

> **Important — use `<` not `-f`:** You might be tempted to use `psql -f /init.sql` but
> that tells psql to look for the file *inside the pod*, where it doesn't exist. The `<`
> redirect pipes the file from your laptop's filesystem into the pod's stdin, which is
> what you want. Using `-f /init.sql` will fail with `No such file or directory`.

You should see output like:

```
CREATE TABLE
CREATE TABLE
CREATE TABLE
```

---

## 11. Access the App

The frontend is exposed as a NodePort service on port 30080.

Open your browser and go to:

```
http://localhost:30080
```

To also access it from other devices on your home network (like phones), find your laptop's local IP:

```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Then visit `http://<your-laptop-ip>:30080` from any device on the same WiFi.

---

## 12. Useful Commands

**Check status of everything:**
```bash
kubectl get all -n pet-tracker
```

**View logs for a service:**
```bash
# Backend logs
kubectl logs -n pet-tracker -l app=backend -f

# Frontend logs
kubectl logs -n pet-tracker -l app=frontend -f

# Postgres logs
kubectl logs -n pet-tracker -l app=postgres -f
```

**Restart a deployment (e.g., after rebuilding an image):**
```bash
# Rebuild image and reimport into k3s
docker build -t pet-tracker-backend:latest ./backend
docker save pet-tracker-backend:latest | sudo k3s ctr images import -

# Restart the deployment to pick up the new image
kubectl rollout restart deployment/backend -n pet-tracker
```

**Open a shell in a running pod:**
```bash
kubectl exec -it -n pet-tracker <pod-name> -- /bin/sh
```

**Connect to Postgres directly:**
```bash
kubectl exec -it -n pet-tracker <postgres-pod-name> -- psql -U petuser -d pettracker
```

**Check k3s service status:**
```bash
sudo systemctl status k3s
sudo journalctl -u k3s -n 50 --no-pager
```

---

## 13. Teardown

To completely remove everything (including persistent data):

```bash
kubectl delete namespace pet-tracker
```

This deletes all pods, services, configmaps, secrets, and the persistent volume claim.

To stop k3s entirely:

```bash
sudo systemctl stop k3s
```

To uninstall k3s completely:

```bash
/usr/local/bin/k3s-uninstall.sh
```

---

## 14. The Claude Code Spec

Paste the following into Claude Code to generate the project:

---

> **Project: Pet Feeding Tracker — Kubernetes**
>
> Build and deploy a Pet Feeding Tracker web application on a local Kubernetes cluster (k3s on Fedora Linux). The app lets family members log when pets were fed, see recent feeding history, and avoid double-feeding.
>
> **Tech Stack:**
> - Frontend: React (Vite) served via nginx
> - Backend: Node.js + Express REST API
> - Database: PostgreSQL
> - Container orchestration: Kubernetes (k3s local cluster)
> - Images built locally with Docker and imported into k3s via `k3s ctr images import`
>
> **Application Features:**
>
> Pets: Add/edit/delete pets with name, species, emoji icon, and feeding interval in hours. List all pets on the home screen.
>
> Feeding Log: Log a feeding for a pet with one tap, recording pet, timestamp, and which family member fed them. Show time since last feeding per pet, color-coded green (fed within interval), yellow (within 1 hour of interval), red (overdue). View last 20 feedings per pet.
>
> Family Members: Simple list of names, no auth. Selected via a dropdown when logging a feed.
>
> **REST API Endpoints:**
> ```
> GET    /api/pets
> POST   /api/pets
> PUT    /api/pets/:id
> DELETE /api/pets/:id
> GET    /api/members
> POST   /api/members
> DELETE /api/members/:id
> GET    /api/feedings
> GET    /api/feedings/pet/:petId
> POST   /api/feedings
> DELETE /api/feedings/:id
> ```
>
> **Database Schema (PostgreSQL):**
> ```sql
> CREATE TABLE pets (
>   id SERIAL PRIMARY KEY,
>   name TEXT NOT NULL,
>   species TEXT,
>   emoji TEXT DEFAULT '🐾',
>   feeding_interval_hours NUMERIC DEFAULT 8,
>   created_at TIMESTAMPTZ DEFAULT NOW()
> );
>
> CREATE TABLE family_members (
>   id SERIAL PRIMARY KEY,
>   name TEXT NOT NULL
> );
>
> CREATE TABLE feedings (
>   id SERIAL PRIMARY KEY,
>   pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
>   member_id INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
>   fed_at TIMESTAMPTZ DEFAULT NOW(),
>   notes TEXT
> );
> ```
>
> **Project Structure:**
> ```
> pet-tracker/
> ├── backend/
> │   ├── Dockerfile          (node:20-alpine, exposes 3000, CMD node src/index.js)
> │   ├── package.json
> │   └── src/
> │       ├── index.js
> │       ├── db.js           (pg Pool using env vars)
> │       ├── routes/pets.js
> │       ├── routes/members.js
> │       ├── routes/feedings.js
> │       └── init.sql
> ├── frontend/
> │   ├── Dockerfile          (multi-stage: node:20-alpine build, then nginx:alpine serve)
> │   ├── nginx.conf          (proxy /api/* to backend service)
> │   ├── package.json
> │   └── src/
> │       ├── main.jsx
> │       ├── App.jsx
> │       └── components/
> │           ├── PetCard.jsx
> │           ├── FeedButton.jsx
> │           ├── FeedingHistory.jsx
> │           ├── AddPetForm.jsx
> │           └── MemberSelector.jsx
> └── k8s/
>     ├── namespace.yaml                (namespace: pet-tracker)
>     ├── postgres-secret.yaml          (DB credentials, base64 encoded)
>     ├── postgres-pvc.yaml             (PersistentVolumeClaim, 1Gi)
>     ├── postgres-deployment.yaml      (postgres:15, single replica, mounts PVC)
>     ├── postgres-service.yaml         (ClusterIP, port 5432)
>     ├── backend-configmap.yaml        (DB connection string, port)
>     ├── backend-deployment.yaml       (2 replicas, imagePullPolicy: Never)
>     ├── backend-service.yaml          (ClusterIP, port 3000)
>     ├── frontend-configmap.yaml       (API base URL)
>     ├── frontend-deployment.yaml      (2 replicas, imagePullPolicy: Never)
>     └── frontend-service.yaml         (NodePort, nodePort: 30080)
> ```
>
> **Constraints:**
> - No authentication — trusted home network app
> - Mobile-friendly UI — family uses it from phones
> - No Helm, no Ingress controller, no TLS
> - `imagePullPolicy: Never` on all app deployments
> - Use `k3s ctr images import` workflow (not Docker Desktop)
> - Include a README.md with build, deploy, seed, and teardown instructions for k3s on Fedora

---

*Happy feeding!* 🐾
