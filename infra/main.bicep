@description('Azure deployment region. Defaults to Central India (Pune) per SOW.')
param location string = 'centralindia'

@description('Environment name prefix (e.g. prod, staging, dev)')
@allowed([
  'prod'
  'staging'
  'dev'
])
param environment string = 'prod'

@description('Project base name')
param projectName string = 'quickshelf'

@description('Administrator username for PostgreSQL Flexible Server')
param dbAdminUser string = 'qsadmin'

@description('Administrator password for PostgreSQL Flexible Server')
@secure()
param dbAdminPassword string

@description('Docker image tag to deploy')
param imageTag string = 'latest'

// Resource naming convention: <type>-<project>-<env>-<location>
var suffix = '${projectName}-${environment}'
var logAnalyticsName = 'log-${suffix}'
var containerRegistryName = 'cr${projectName}${environment}'
var containerAppsEnvName = 'cae-${suffix}'
var postgresServerName = 'psql-${suffix}'
var postgresDbName = 'quickshelf'
var redisName = 'redis-${suffix}'
var staticWebAppName = 'stapp-${suffix}'

// 1. Log Analytics Workspace for centralized telemetry & 180-day log retention (CERT-In)
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 180 // Complies with SOW CERT-In 180-day security log directive
  }
}

// 2. Azure Container Registry (ACR)
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// 3. Azure Cache for Redis
resource redisCache 'Microsoft.Cache/redis@2023-08-01' = {
  name: redisName
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0 // C0 (250MB) for dev/pilot, scalable to C1/C2
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'volatile-lru'
    }
  }
}

// 4. Azure Database for PostgreSQL Flexible Server
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: dbAdminUser
    administratorLoginPassword: dbAdminPassword
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 14
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

// Allow internal Azure Services (Container Apps) through PostgreSQL firewall
resource postgresAllowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource postgresDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: postgresDbName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// 5. Azure Container Apps Environment (VNet managed)
resource containerAppsEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Connection Strings constructed dynamically
var acrLoginServer = containerRegistry.properties.loginServer
var acrPassword = containerRegistry.listCredentials().passwords[0].value
var databaseUrl = 'postgresql://${dbAdminUser}:${dbAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${postgresDbName}?sslmode=require'
var redisUrl = 'rediss://:${redisCache.listKeys().primaryKey}@${redisCache.properties.hostName}:${redisCache.properties.sslPort}'

// 6. Container App: quickshelf-api (REST API & Webhooks)
resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${suffix}-api'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      secrets: [
        {
          name: 'acr-password'
          value: acrPassword
        }
        {
          name: 'database-url'
          value: databaseUrl
        }
        {
          name: 'redis-url'
          value: redisUrl
        }
      ]
      registries: [
        {
          server: acrLoginServer
          username: containerRegistry.name
          passwordSecretRef: 'acr-password'
        }
      ]
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
        }
      }
    }
    template: {
      containers: [
        {
          name: 'quickshelf-api'
          image: '${acrLoginServer}/quickshelf-api:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 5
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
}

// 7. Container App: quickshelf-gateway-hub (WebSocket Ingress for Store Gateways)
resource hubApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${suffix}-hub'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      secrets: [
        {
          name: 'acr-password'
          value: acrPassword
        }
        {
          name: 'database-url'
          value: databaseUrl
        }
        {
          name: 'redis-url'
          value: redisUrl
        }
      ]
      registries: [
        {
          server: acrLoginServer
          username: containerRegistry.name
          passwordSecretRef: 'acr-password'
        }
      ]
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'quickshelf-gateway-hub'
          image: '${acrLoginServer}/quickshelf-gateway-hub:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'GATEWAY_HUB_PORT'
              value: '8080'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

// 8. Container App: quickshelf-sync-engine (Background Reconciliation Worker)
resource syncEngineApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-${suffix}-engine'
  location: location
  properties: {
    managedEnvironmentId: containerAppsEnv.id
    configuration: {
      secrets: [
        {
          name: 'acr-password'
          value: acrPassword
        }
        {
          name: 'database-url'
          value: databaseUrl
        }
        {
          name: 'redis-url'
          value: redisUrl
        }
      ]
      registries: [
        {
          server: acrLoginServer
          username: containerRegistry.name
          passwordSecretRef: 'acr-password'
        }
      ]
      // Zero ingress - completely private internal background worker
    }
    template: {
      containers: [
        {
          name: 'quickshelf-sync-engine'
          image: '${acrLoginServer}/quickshelf-sync-engine:${imageTag}'
          resources: {
            cpu: json('0.5')
            memory: '1.0Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

// 9. Azure Static Web Apps (Operations Portal Frontend)
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: 'eastasia' // Static Web Apps standard global edge regions: eastasia or westeurope
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    allowConfigFileUpdates: true
  }
}

// Outputs
output acrLoginServer string = acrLoginServer
output apiUrl string = 'https://${apiApp.properties.configuration.ingress.fqdn}'
output hubUrl string = 'wss://${hubApp.properties.configuration.ingress.fqdn}'
output staticWebAppDefaultHostname string = staticWebApp.properties.defaultHostname
output postgresFqdn string = postgresServer.properties.fullyQualifiedDomainName
output redisHostName string = redisCache.properties.hostName
