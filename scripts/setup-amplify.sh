#!/bin/bash

# AWS Amplify Setup Script for Kùzu Explore 3D VR
# This script helps initialize and configure AWS Amplify for the project

echo "🚀 Setting up AWS Amplify for Kùzu Explore 3D VR"
echo "================================================"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   brew install awscli (macOS)"
    echo "   or visit: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    echo "📦 Installing AWS Amplify CLI..."
    npm install -g @aws-amplify/cli
fi

# Initialize Amplify project
echo ""
echo "📋 Initializing Amplify project..."
echo "Please follow the prompts to configure your project:"
echo ""

amplify init \
  --amplify '{"projectName":"KuzuExplore3DVR","appId":"kuzu3dvr","envName":"dev"}' \
  --frontend '{"frontend":"javascript","framework":"none","config":{"SourceDir":"src","DistributionDir":"dist","BuildCommand":"npm run build","StartCommand":"npm run dev"}}'

# Add authentication
echo ""
echo "🔐 Adding authentication..."
amplify add auth

# Configure auth with social providers
echo ""
echo "📱 Configuring social sign-in providers..."
cat > amplify/backend/auth/kuzu3dvr/parameters.json << 'EOF'
{
  "authSelections": "identityPoolAndUserPool",
  "resourceName": "kuzu3dvr",
  "serviceType": "imported",
  "region": "us-east-1",
  "aliasAttributes": [
    "email"
  ],
  "requiredAttributes": [
    "email",
    "name"
  ],
  "passwordPolicyMinLength": 8,
  "passwordPolicyCharacters": [
    "Requires Lowercase",
    "Requires Uppercase",
    "Requires Numbers",
    "Requires Symbols"
  ],
  "mfaConfiguration": "OPTIONAL",
  "autoVerifiedAttributes": [
    "email"
  ],
  "mfaTypes": [
    "TOTP"
  ]
}
EOF

# Add storage
echo ""
echo "📦 Adding storage..."
amplify add storage

# Add API
echo ""
echo "🌐 Adding API..."
amplify add api

# Create Lambda functions directory structure
echo ""
echo "📂 Creating Lambda functions..."
mkdir -p amplify/backend/function/{stripeCheckout,stripeWebhook,subscriptionStatus,usageTracking}

# Deploy to AWS
echo ""
echo "🚀 Ready to deploy to AWS!"
echo ""
echo "Next steps:"
echo "1. Run 'amplify push' to deploy your backend"
echo "2. Update .env.local with the generated AWS configuration values"
echo "3. Configure Stripe webhook endpoint in Stripe Dashboard"
echo "4. Update the frontend code to use Amplify SDK"
echo ""
echo "For production deployment:"
echo "- Run 'amplify env add prod' to create a production environment"
echo "- Configure custom domain with 'amplify add hosting'"
echo ""
echo "✅ Setup script complete!"