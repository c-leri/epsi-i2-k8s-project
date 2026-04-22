# Projet déploiement applicatif dans Kubernetes

## Déploiement dans le cluster

### Installation du Cluster

Mise en place d'un cluster kind :
```sh
kind create cluster --config ./kind-config.yaml
```

Installation de `traefik` via `Helm` :
```sh
helm repo add traefik https://traefik.github.io/charts
helm install traefik \
  --values traefik-values.yaml \
  traefik/traefik
```

#### Installation des StorageClass

Installation du `local-path-provisionner` de `Rancher` :
```sh
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.35/deploy/local-path-storage.yaml
```

### Déploiement de l'application

Installation du `postgres-operator` de `Zalando` via `Helm` :
```sh
helm repo add postgres-operator-charts https://opensource.zalando.com/postgres-operator/charts/postgres-operator
helm install postgres-operator postgres-operator-charts/postgres-operator
```

Déploiement du cluster `postgresql` :
```sh
kubectl create -f database.yaml
```

Déploiement de l'application front/back :
```sh
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml
```

Déploiement de l'`IngressRoute` `traefik` et des `middlewares` associés :
```sh
kubectl apply -f traefik.yaml
```

## Accéder à l'application

Mise en place du port-forwarding du service `traefik` :
```sh
kubectl port-forward svc/traefik 8080:80
```

L'application est maintenant accessible sur <http://localhost:8080/app-de-con>
