<#
.SYNOPSIS
  Deploys Quickshelf production infrastructure and containers to Microsoft Azure (Central India / Pune).

.DESCRIPTION
  Prerequisites:
  - Azure CLI (`az`) installed and authenticated (`az login`)
  - Docker Desktop running
#>

param(
  [string]$ResourceGroupName = "rg-quickshelf-prod-centralindia",
  [string]$Location = "centralindia",
  [string]$TemplateFile = "$PSScriptRoot\main.bicep",
  [string]$ParametersFile = "$PSScriptRoot\parameters.json"
)

$ErrorActionPreference = "Stop"

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  Quickshelf Azure Production Deployment (Central India)   " -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan

# 1. Check Azure login
Write-Host "`n[1/5] Checking Azure CLI credentials..." -ForegroundColor Yellow
$account = az account show --output json 2>$null | ConvertFrom-Json
if (-not $account) {
  Write-Host "Not logged in to Azure. Please run: az login" -ForegroundColor Red
  exit 1
}
Write-Host "Connected to Subscription: $($account.name) ($($account.id))" -ForegroundColor Green

# 2. Create Resource Group if not exists
Write-Host "`n[2/5] Ensuring Resource Group '$ResourceGroupName' exists in '$Location'..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location --output table

# 3. Deploy Bicep Infrastructure
Write-Host "`n[3/5] Deploying Infrastructure as Code ($TemplateFile)..." -ForegroundColor Yellow
$deployment = az deployment group create `
  --resource-group $ResourceGroupName `
  --template-file $TemplateFile `
  --parameters $ParametersFile `
  --output json | ConvertFrom-Json

$outputs = $deployment.properties.outputs
$acrServer = $outputs.acrLoginServer.value
$apiUrl = $outputs.apiUrl.value
$hubUrl = $outputs.hubUrl.value
$staticHost = $outputs.staticWebAppDefaultHostname.value

Write-Host "Infrastructure deployed successfully!" -ForegroundColor Green
Write-Host "ACR Login Server: $acrServer" -ForegroundColor Cyan
Write-Host "API Gateway FQDN: $apiUrl" -ForegroundColor Cyan
Write-Host "Gateway Hub FQDN: $hubUrl" -ForegroundColor Cyan
Write-Host "Dashboard Host  : https://$staticHost" -ForegroundColor Cyan

# 4. Build and Push Containers to ACR
Write-Host "`n[4/5] Logging into Azure Container Registry..." -ForegroundColor Yellow
az acr login --name ($acrServer.Split('.')[0])

$images = @(
  @{ Name = "quickshelf-api"; Dockerfile = "apps/api/Dockerfile" },
  @{ Name = "quickshelf-gateway-hub"; Dockerfile = "apps/gateway-hub/Dockerfile" },
  @{ Name = "quickshelf-sync-engine"; Dockerfile = "apps/sync-engine/Dockerfile" }
)

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path

foreach ($img in $images) {
  $tag = "$acrServer/$($img.Name):latest"
  Write-Host "Building & pushing $tag..." -ForegroundColor Yellow
  docker build -t $tag -f "$repoRoot/$($img.Dockerfile)" $repoRoot
  docker push $tag
}

# 5. Restart Container Apps to pick up fresh images
Write-Host "`n[5/5] Refreshing Container Apps revisions..." -ForegroundColor Yellow
az containerapp update --name "ca-quickshelf-prod-api" --resource-group $ResourceGroupName --image "$acrServer/quickshelf-api:latest" --output none
az containerapp update --name "ca-quickshelf-prod-hub" --resource-group $ResourceGroupName --image "$acrServer/quickshelf-gateway-hub:latest" --output none
az containerapp update --name "ca-quickshelf-prod-engine" --resource-group $ResourceGroupName --image "$acrServer/quickshelf-sync-engine:latest" --output none

Write-Host "`nDeployment Complete!" -ForegroundColor Green
Write-Host "Production API Endpoint : $apiUrl" -ForegroundColor Green
Write-Host "Gateway Hub Endpoint    : $hubUrl" -ForegroundColor Green
Write-Host "Web Portal Dashboard    : https://$staticHost" -ForegroundColor Green
