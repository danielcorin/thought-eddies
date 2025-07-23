---
title: Kubernetes Liveness Check
createdAt: 2023-11-11T11:38:52.000Z
updatedAt: 2023-11-11T11:38:52.000Z
publishedAt: 2023-11-11T11:38:52.000Z
tags:
  - kubernetes
  - k8s
draft: false
---

When deploying software with Kubernetes, you need to expose a [liveness HTTP request](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#define-a-liveness-http-request) in the application.
The Kubernetes default liveness HTTP endpoint is `/healthz`, which seems to be a [Google convention, z-pages](https://stackoverflow.com/questions/43380939/where-does-the-convention-of-using-healthz-for-application-health-checks-come-f).
A lot of Kubernetes deployments won't rely on the defaults.
Here is an example Kubernetes pod configuration for a liveness check at `<ip>:8080/health`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: liveness-http
spec:
  containers:
  - name: liveness
    image: k8s.gcr.io/liveness
    args:
    - /server
    livenessProbe:
      httpGet:
        path: "/health"
        port: 8080
      initialDelaySeconds: 3
      periodSeconds: 3
```

When setting up a new app to be deployed on Kubernetes, ideally, the liveness endpoint is defined in a service scaffold (this is company and framework dependent), but in the case it isn't, you just need to add a simple HTTP handler for the route configured in the yaml file.
In an express app, it could look something like this:

```js
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
```

Notably, the default express scaffold doesn't come with this route.
You either need to remember to add this route or create a custom scaffold that includes it following your Kubernetes liveness check convention.
