@description('Azure deployment region. Defaults to Central India (Pune) per SOW.')
param location string = 'centralindia'

@description('Location for PostgreSQL Flexible Server where Burstable SKUs are available')
param dbLocation string = 'southeastasia'

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

@description('Highlight ESL Cloud App Key')
param highlightAppKey string = '21186651'

@description('Highlight ESL Cloud App Secret')
@secure()
param highlightAppSecret string = ''

@description('Highlight ESL Cloud API Endpoint')
param highlightEndpoint string = 'http://www.electronicshelflabel.cn:8082/api/handle'

@description('Highlight ESL Organization Code')
param highlightOrgCode string = 'CU006INDIA0344'

// Fallback to default Highlight secret if not supplied
var effectiveHighlightSecret = empty(highlightAppSecret) ? '67c08468b185468ea5326fe26def69ef' : highlightAppSecret

// Resource naming convention: <type>-<project>-<env>-<location>
var suffix = '${projectName}-${environment}'
var logAnalyticsName = 'log-${suffix}'
var containerRegistryName = 'cr${projectName}${environment}'
var containerAppsEnvName = 'cae-${suffix}'
var postgresServerName = 'psql-${suffix}-db'
var postgresDbName = 'quickshelf'
var staticWebAppName = 'stapp-${suffix}'

// 1. Log Analytics Workspace for centralized telemetry
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
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

// 3. Azure Database for PostgreSQL Flexible Server (Burstable B2s for Central India)
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: dbLocation
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
      backupRetentionDays: 7
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

// 4. Azure Container Apps Environment (VNet managed)
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

// Dynamic Connection Strings
var acrLoginServer = containerRegistry.properties.loginServer
var acrPassword = containerRegistry.listCredentials().passwords[0].value
var databaseUrl = 'postgresql://${dbAdminUser}:${dbAdminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/${postgresDbName}?sslmode=require'

// 5. Container App: quickshelf-api (REST API & Highlight Cloud Integration)
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
          name: 'highlight-app-secret'
          value: effectiveHighlightSecret
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
              name: 'HIGHLIGHT_APP_KEY'
              value: highlightAppKey
            }
            {
              name: 'HIGHLIGHT_APP_SECRET'
              secretRef: 'highlight-app-secret'
            }
            {
              name: 'HIGHLIGHT_ENDPOINT'
              value: highlightEndpoint
            }
            {
              name: 'HIGHLIGHT_ORG_CODE'
              value: highlightOrgCode
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0 // Scale down to 0 when idle to conserve Startup credits
        maxReplicas: 3
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// 6. Azure Static Web Apps (Operations Portal Frontend - Free Tier)
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
output staticWebAppDefaultHostname string = staticWebApp.properties.defaultHostname
output staticWebAppName string = staticWebApp.name
output postgresFqdn string = postgresServer.properties.fullyQualifiedDomainName
output databaseUrl string = databaseUrl
