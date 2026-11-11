<#
.SYNOPSIS
  Deploys Quickshelf Lean Production Infrastructure to Microsoft Azure.
  Optimized for Microsoft for Startups ($200 credit budget).
  Integrates with Highlight Cloud APIs (no custom gateway-hub/sync-engine required).

.DESCRIPTION
  Prerequisites:
  - Azure CLI (`az`) installed and authenticated (`az login`)
  - Node.js & pnpm installed
#>

param(
  [string]$ResourceGroupName = "rg-quickshelf-prod",
  [string]$Location = "centralindia",
  [string]$TemplateFile = "$PSScriptRoot\main.bicep",
  [string]$ParametersFile = "$PSScriptRoot\parameters.json",
  [switch]$UseLocalDocker = $false
)

$ErrorActionPreference = "Stop"

$env:PATH = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin;$env:PATH"
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  Quickshelf Lean Azure Deployment (Highlight Cloud API)   " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# 1. Check Azure login
Write-Host "`n[1/6] Checking Azure CLI credentials..." -ForegroundColor Yellow
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
  Write-Host "Not logged in to Azure. Please run: az login" -ForegroundColor Red
  exit 1
}
Write-Host "Connected to Subscription: $($account.name) ($($account.id))" -ForegroundColor Green

# 2. Create Resource Group
Write-Host "`n[2/6] Ensuring Resource Group '$ResourceGroupName' exists in '$Location'..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --output table

# 3. Ensure ACR exists before building container image
$params = Get-Content $ParametersFile | ConvertFrom-Json
$projectName = if ($params.parameters.projectName.value) { $params.parameters.projectName.value } else { "quickshelf" }
$environment = if ($params.parameters.environment.value) { $params.parameters.environment.value } else { "prod" }
$acrName = "cr$($projectName)$($environment)"

Write-Host "`n[3/6] Ensuring Azure Container Registry '$acrName' exists..." -ForegroundColor Yellow
az acr create --resource-group $ResourceGroupName --name $acrName --sku Basic --admin-enabled true --location $Location --output table

$acrServer = az acr show --name $acrName --resource-group $ResourceGroupName --query "loginServer" -o tsv
Write-Host "ACR Login Server: $acrServer" -ForegroundColor Cyan

# 4. Build and Push quickshelf-api image
Write-Host "`n[4/6] Building & pushing quickshelf-api image..." -ForegroundColor Yellow
$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path

if ($UseLocalDocker) {
  Write-Host "Building locally with Docker Desktop..." -ForegroundColor Yellow
  az acr login --name $acrName
  $tag = "$acrServer/quickshelf-api:latest"
  docker build -t $tag -f "$repoRoot/apps/api/Dockerfile" $repoRoot
  docker push $tag
} else {
  Write-Host "Building directly in Azure Cloud with 'az acr build' (no local Docker daemon required)..." -ForegroundColor Yellow
  az acr build --registry $acrName --image quickshelf-api:latest -f "$repoRoot/apps/api/Dockerfile" $repoRoot
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Container build failed. Exiting deployment." -ForegroundColor Red
    exit 1
  }
}

# 5. Deploy Infrastructure as Code (Bicep)
Write-Host "`n[5/6] Deploying Azure Bicep Infrastructure ($TemplateFile)..." -ForegroundColor Yellow
$deployment = az deployment group create `
  --resource-group $ResourceGroupName `
  --template-file $TemplateFile `
  --parameters $ParametersFile `
  --output json | ConvertFrom-Json

$outputs = $deployment.properties.outputs
$apiUrl = $outputs.apiUrl.value
$staticHost = $outputs.staticWebAppDefaultHostname.value
$staticWebAppName = $outputs.staticWebAppName.value
$dbUrl = $outputs.databaseUrl.value

Write-Host "Infrastructure deployed successfully!" -ForegroundColor Green
Write-Host "API Gateway FQDN : $apiUrl" -ForegroundColor Cyan
Write-Host "Static Web Host  : https://$staticHost" -ForegroundColor Cyan

# 6. Build and Deploy Static Web App (Dashboard Frontend)
Write-Host "`n[6/6] Building & deploying Operations Dashboard to Azure Static Web Apps..." -ForegroundColor Yellow
$env:VITE_API_BASE = $apiUrl
Push-Location "$repoRoot"
try {
  Write-Host "Building Dashboard frontend with VITE_API_BASE = $apiUrl..." -ForegroundColor Yellow
  pnpm --filter @quickshelf/dashboard build

  Write-Host "Retrieving Static Web App deployment token..." -ForegroundColor Yellow
  $deploymentToken = az staticwebapp secrets list --name $staticWebAppName --resource-group $ResourceGroupName --query "properties.apiKey" -o tsv

  if ($deploymentToken) {
    Write-Host "Deploying frontend bundle via Static Web Apps CLI..." -ForegroundColor Yellow
    npx -y @azure/static-web-apps-cli deploy "$repoRoot/apps/dashboard/dist" --env production --deployment-token $deploymentToken
    Write-Host "Frontend deployed successfully to https://$staticHost" -ForegroundColor Green
  } else {
    Write-Host "Could not retrieve Static Web App deployment token. You can deploy via GitHub Actions or manual upload." -ForegroundColor Yellow
  }
} finally {
  Pop-Location
}

Write-Host "`n===========================================================" -ForegroundColor Green
Write-Host "  Quickshelf Deployment Complete!                          " -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Write-Host "Production REST API  : $apiUrl" -ForegroundColor Green
Write-Host "Web Operations Portal: https://$staticHost" -ForegroundColor Green
Write-Host "Database URL         : $dbUrl" -ForegroundColor Green
Write-Host "`nTo run database migrations on the new database:" -ForegroundColor Yellow
Write-Host "  `$env:DATABASE_URL = `"$dbUrl`"" -ForegroundColor Yellow
Write-Host "  pnpm db:migrate" -ForegroundColor Yellow
Write-Host "  pnpm db:seed" -ForegroundColor Yellow
