# Projet déploiement applicatif dans Kubernetes

## Déploiement dans le cluster

### Installation du Cluster

Mise en place d'un cluster kind:
```sh
kind create cluster --config ./kind-config.yaml
```

Installation de `MetalLB` via `Helm`:
```sh
helm repo add metallb https://metallb.github.io/metallb
helm install metallb \
  --values ./metallb-values.yaml \
  metallb/metallb
```

Installation de `traefik` via `Helm`:
```sh
helm repo add traefik https://traefik.github.io/charts
helm install traefik traefik/traefik
```

#### Installation des StorageClass

Installation du driver `NFS CSI` via `Helm`:
```sh
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm install csi-driver-nfs \
  --namespace kube-system \
  --version 4.13.1 \
  --values ./csi-driver-nfs-values.yaml \
  csi-driver-nfs/csi-driver-nfs
```

Installation du `local-path-provisionner` de `Rancher`:
```sh
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.35/deploy/local-path-storage.yaml
```

### Déploiement de l'application

Build des images docker :
```sh
docker build --tag app-de-con-backend:latest ./backend
docker build --tag app-de-con-frontend:latest ./frontend
```

Installation du `postgres-operator` de `Zalando` via `Helm` :
```sh
helm repo add postgres-operator-charts https://opensource.zalando.com/postgres-operator/charts/postgres-operator
helm install postgres-operator postgres-operator-charts/postgres-operator
```

Déploiement du cluster postgresql :
```sh
kubectl create -f database.yaml
```
