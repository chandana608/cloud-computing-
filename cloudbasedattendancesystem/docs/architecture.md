# Cloud Architecture: Cloud-Based Attendance Management System

## 1. High-Level System Architecture

The application adopts a **three-tier cloud-native architecture** separating the presentation layer, the application API layer, and the managed database tier.

```mermaid
flowchart TD
    subgraph Clients["Clients & Edge Devices"]
        AdminDevice["Administrator (Desktop/Browser)"]
        FacultyDevice["Faculty (Tablet/Mobile/Desktop)"]
        StudentDevice["Student (Mobile/Laptop)"]
    end

    subgraph EdgeTier["Edge & CDN Tier"]
        VercelCDN["Vercel Edge Network / Static CDN"]
        ReactApp["Single Page Application (React 18 + Vite + Tailwind)"]
        VercelCDN --> ReactApp
    end

    subgraph ComputeTier["Application Cloud Compute (Render / Container Service)"]
        GunicornWSGI["Gunicorn WSGI Application Server"]
        FlaskCore["Flask Modular REST API (/api/v1)"]
        AuthModule["JWT Auth & Security Interceptor"]
        RateLimiter["Flask-Limiter Guard"]
        AuditEngine["Audit & Logging Engine"]

        GunicornWSGI --> FlaskCore
        FlaskCore --> AuthModule
        FlaskCore --> RateLimiter
        FlaskCore --> AuditEngine
    end

    subgraph DatabaseTier["Centralized Cloud Data Tier (MongoDB Atlas)"]
        AtlasCluster["MongoDB Atlas Cloud Cluster (M0/M10+)"]
        AtlasReplica["Primary + Secondary Replica Nodes"]
        CloudBackups["Automated Cloud Snapshots & Point-In-Time Recovery"]

        AtlasCluster --> AtlasReplica
        AtlasCluster --> CloudBackups
    end

    AdminDevice -->|HTTPS| VercelCDN
    FacultyDevice -->|HTTPS| VercelCDN
    StudentDevice -->|HTTPS| VercelCDN

    ReactApp -->|Secure REST APIs / HTTPS Bearer JWT| GunicornWSGI
    FlaskCore -->|TLS Mongo Connection String / pymongo[srv]| AtlasCluster
```

## 2. Cloud Computing Concepts Demonstrated

1. **Centralized Cloud Data Storage**:
   Attendance records, sessions, and academic enrollments reside in MongoDB Atlas rather than on individual devices or local hardware registers.

2. **On-Demand Remote Accessibility**:
   Faculty can conduct sessions and mark roll calls on campus Wi-Fi or cellular networks, while students check attendance securely from home or mobile devices.

3. **Decoupled Stateless Compute**:
   The Flask API backend is completely stateless; user authentication is managed via secure, cryptographically signed JSON Web Tokens (JWT). This allows horizontal scaling of backend replicas behind a cloud load balancer.

4. **Resilience & Fault Tolerance**:
   The system implements readiness probes (`/api/v1/ready`) and health probes (`/api/v1/health`). If the cloud database experiences intermittent connectivity, the system fails safely with structured diagnostic codes.

5. **Resource Pooling & Managed Infrastructure**:
   Utilizes managed database services (MongoDB Atlas) with replica sets, automated patch management, monitoring dashboards, and point-in-time recovery.
