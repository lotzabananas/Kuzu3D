# AWS Amplify Deployment Plan for Kùzu Explore 3D VR

## Overview
This document outlines the comprehensive plan for deploying Kùzu Explore 3D VR to AWS using Amplify, including Stripe payment integration and cloud infrastructure setup.

## Architecture Overview

### Frontend (VR/AR Application)
- **Hosting**: AWS Amplify Hosting with CloudFront CDN
- **Static Assets**: S3 bucket for 3D models, textures, fonts
- **WebXR Delivery**: HTTPS with SSL certificates for Quest 3 compatibility

### Backend Services
- **API**: AWS Lambda + API Gateway (serverless)
- **Database**: AWS Neptune (managed graph database) or RDS with Kùzu
- **Authentication**: AWS Cognito
- **Real-time**: AWS AppSync for collaborative sessions
- **File Storage**: S3 for user-generated content

### Payment Processing
- **Stripe Integration**: Lambda functions for payment processing
- **Webhooks**: API Gateway endpoints for Stripe events
- **Subscription Management**: DynamoDB for user subscription data

## Implementation Phases

### Phase 1: AWS Amplify Setup (Week 1)
1. **Initialize Amplify Project**
   ```bash
   npm install -g @aws-amplify/cli
   amplify init
   amplify add hosting
   ```

2. **Configure Build Settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
   ```

3. **Environment Variables**
   - API endpoints
   - Stripe keys
   - Database connection strings

### Phase 2: Backend API Migration (Week 1-2)
1. **Lambda Functions**
   - `/api/query` - Cypher query execution
   - `/api/nodes` - Node CRUD operations
   - `/api/relationships` - Edge management
   - `/api/voice` - Voice command processing
   - `/api/layouts` - Layout calculations

2. **API Gateway Configuration**
   - CORS settings for VR headset access
   - Rate limiting
   - API keys and usage plans

3. **Database Migration**
   - Evaluate AWS Neptune vs RDS with Kùzu
   - Data migration strategy
   - Backup and restore procedures

### Phase 3: Authentication & User Management (Week 2)
1. **Cognito Setup**
   ```javascript
   // amplify/backend/auth/kuzu3dauth/auth-config.js
   {
     usernameAttributes: ['email'],
     signupAttributes: ['email', 'name'],
     passwordPolicy: {
       minLength: 8,
       requireLowercase: true,
       requireNumbers: true,
       requireSymbols: true,
       requireUppercase: true
     },
     mfa: {
       enforce: false,
       preferredMfa: 'TOTP'
     }
   }
   ```

2. **Social Login Integration**
   - Google OAuth
   - GitHub OAuth
   - Meta (Oculus) login

3. **User Profile Storage**
   - DynamoDB table for preferences
   - S3 bucket for user avatars
   - Graph layout preferences

### Phase 4: Stripe Payment Integration (Week 3)
1. **Subscription Tiers**
   ```javascript
   const subscriptionTiers = {
     free: {
       name: 'Explorer',
       price: 0,
       features: ['100 nodes', 'Basic layouts', 'Public graphs']
     },
     pro: {
       name: 'Professional',
       price: 29,
       features: ['10,000 nodes', 'AI layouts', 'Private graphs', 'Voice commands']
     },
     enterprise: {
       name: 'Enterprise',
       price: 99,
       features: ['Unlimited nodes', 'Custom AI', 'Team collaboration', 'Priority support']
     }
   };
   ```

2. **Stripe Lambda Functions**
   - Create customer
   - Create subscription
   - Update payment method
   - Handle webhooks
   - Usage metering

3. **Billing Portal Integration**
   - Subscription management UI
   - Invoice history
   - Payment method updates

### Phase 5: Performance & Scaling (Week 4)
1. **CloudFront CDN**
   - Global edge locations
   - Caching strategy
   - Compression settings
   - Custom domain setup

2. **Auto-scaling Configuration**
   - Lambda concurrency limits
   - RDS read replicas
   - DynamoDB auto-scaling

3. **Monitoring & Logging**
   - CloudWatch dashboards
   - X-Ray tracing
   - Error tracking (Sentry)
   - Performance metrics

## Cost Estimation

### Monthly Costs (1000 users)
- **Amplify Hosting**: $15
- **Lambda**: $50 (2M requests)
- **API Gateway**: $25
- **Neptune/RDS**: $200
- **S3**: $10
- **CloudFront**: $20
- **Cognito**: $50
- **Total**: ~$370/month

### Stripe Fees
- 2.9% + $0.30 per transaction
- Additional 0.5% for international cards

## Security Considerations

1. **Data Encryption**
   - SSL/TLS for all connections
   - Encryption at rest for databases
   - S3 bucket encryption

2. **Access Control**
   - IAM roles and policies
   - API key rotation
   - VPC configuration

3. **Compliance**
   - GDPR compliance for EU users
   - PCI compliance for payments
   - SOC 2 preparation

## Migration Checklist

### Pre-deployment
- [ ] AWS account setup
- [ ] Stripe account verification
- [ ] Domain name registration
- [ ] SSL certificate provisioning

### Development
- [ ] Update environment variables
- [ ] Modify API endpoints
- [ ] Add Amplify SDK to frontend
- [ ] Implement auth flows
- [ ] Add Stripe checkout

### Testing
- [ ] Load testing with Artillery
- [ ] Security scanning
- [ ] Cross-region testing
- [ ] Payment flow testing

### Deployment
- [ ] Database migration
- [ ] DNS configuration
- [ ] Monitoring setup
- [ ] Backup verification

## Rollback Plan

1. **Database Snapshots**
   - Daily automated backups
   - Point-in-time recovery

2. **Blue-Green Deployment**
   - Maintain previous version
   - Quick rollback capability

3. **Feature Flags**
   - Gradual feature rollout
   - Quick disable switches

## Next Steps

1. Create AWS account and configure CLI
2. Install Amplify CLI and initialize project
3. Set up development environment
4. Begin Phase 1 implementation

## Resources

- [AWS Amplify Documentation](https://docs.amplify.aws)
- [Stripe Integration Guide](https://stripe.com/docs)
- [WebXR on AWS](https://aws.amazon.com/solutions/gaming/webxr/)
- [Neptune Graph Database](https://aws.amazon.com/neptune/)