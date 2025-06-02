# AWS Deployment Guide for Kùzu Explore 3D VR

## Prerequisites

1. **AWS Account**: Create an AWS account at https://aws.amazon.com
2. **Stripe Account**: Create a Stripe account at https://stripe.com
3. **AWS CLI**: Install AWS CLI
   ```bash
   brew install awscli  # macOS
   aws configure        # Configure with your AWS credentials
   ```
4. **Amplify CLI**: Install globally
   ```bash
   npm install -g @aws-amplify/cli
   ```

## Step 1: Initialize AWS Amplify

1. Run the setup script:
   ```bash
   ./scripts/setup-amplify.sh
   ```

2. Or manually initialize:
   ```bash
   amplify init
   ```
   - Choose a name for the project: `KuzuExplore3DVR`
   - Choose environment: `dev`
   - Choose default editor
   - Choose app type: `javascript`
   - Framework: `none`
   - Source directory: `src`
   - Distribution directory: `dist`
   - Build command: `npm run build`
   - Start command: `npm run dev`

## Step 2: Add Authentication

```bash
amplify add auth
```

Select:
- Default configuration with Social Provider
- Email as sign-in method
- Advanced settings:
  - Add Google OAuth
  - Add user attributes: name
  - Enable TOTP MFA (optional)

## Step 3: Add Storage

```bash
amplify add storage
```

Select:
- Content (Images, audio, video, etc.)
- Provide bucket name: `kuzu3dvrstorage`
- Auth users only with read/write access
- Guest users with read access

## Step 4: Deploy Backend

```bash
amplify push
```

This will:
- Create Cognito User Pool
- Create S3 bucket
- Generate aws-exports.js file

## Step 5: Create Stripe Products

1. Log into Stripe Dashboard
2. Create products:
   - **Professional Plan**: $29/month
   - **Enterprise Plan**: $99/month
3. Copy the price IDs

## Step 6: Deploy Lambda Functions

1. Create Lambda function for Stripe checkout:
   ```bash
   amplify add function
   ```
   - Name: `stripeCheckout`
   - Runtime: Node.js
   - Copy code from `lambda/stripe/createCheckoutSession.js`

2. Create webhook handler:
   ```bash
   amplify add function
   ```
   - Name: `stripeWebhook`
   - Runtime: Node.js
   - Copy code from `lambda/stripe/webhookHandler.js`

3. Add API Gateway:
   ```bash
   amplify add api
   ```
   - Choose REST
   - Add paths:
     - `/create-checkout-session` → stripeCheckout function
     - `/stripe-webhook` → stripeWebhook function
     - `/subscription-status` → subscriptionStatus function

4. Deploy:
   ```bash
   amplify push
   ```

## Step 7: Configure Environment Variables

1. Update Lambda environment variables:
   ```bash
   amplify update function
   ```
   
   Add for each function:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_PRO_PRICE_ID`: Professional plan price ID
   - `STRIPE_ENTERPRISE_PRICE_ID`: Enterprise plan price ID
   - `FRONTEND_URL`: Your app URL

2. Create `.env.local` from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in:
   - AWS Cognito IDs (from aws-exports.js)
   - Stripe publishable key
   - API endpoints

## Step 8: Configure Stripe Webhooks

1. In Stripe Dashboard, add webhook endpoint:
   - URL: `https://your-api-id.execute-api.region.amazonaws.com/dev/stripe-webhook`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`

2. Copy webhook signing secret to Lambda environment

## Step 9: Deploy Frontend

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to Amplify Hosting:
   ```bash
   amplify add hosting
   ```
   - Choose: Hosting with Amplify Console
   - Choose: Manual deployment

3. Publish:
   ```bash
   amplify publish
   ```

## Step 10: Configure Custom Domain (Optional)

1. In Amplify Console:
   - Go to Domain management
   - Add domain
   - Follow DNS configuration steps

2. Update OAuth redirect URLs in Cognito

## Step 11: Set Up Monitoring

1. CloudWatch Dashboards:
   ```bash
   amplify add analytics
   ```

2. Set up alarms for:
   - Lambda errors
   - API Gateway 4xx/5xx errors
   - Billing thresholds

## Production Deployment

1. Create production environment:
   ```bash
   amplify env add prod
   ```

2. Update environment variables for production

3. Deploy:
   ```bash
   amplify push --env prod
   ```

4. Enable CloudFront CDN:
   - In Amplify Console → Rewrites and redirects
   - Add CloudFront distribution

## Post-Deployment Checklist

- [ ] Test authentication flow (sign up, sign in, social login)
- [ ] Test Stripe checkout flow
- [ ] Verify webhook handling
- [ ] Test subscription features
- [ ] Check VR headset connectivity
- [ ] Verify HTTPS certificates
- [ ] Test error handling
- [ ] Monitor CloudWatch logs
- [ ] Set up backup strategy
- [ ] Configure security headers

## Troubleshooting

### CORS Issues
Add to Lambda function response:
```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
}
```

### WebXR HTTPS Requirements
Ensure Amplify Hosting uses HTTPS with valid SSL certificate

### Stripe Webhook Failures
- Check webhook signing secret
- Verify Lambda function has internet access
- Check CloudWatch logs

### Authentication Issues
- Verify Cognito app client settings
- Check OAuth redirect URLs
- Ensure user pool has correct attributes

## Cost Optimization

1. **Lambda**: Use provisioned concurrency for predictable traffic
2. **API Gateway**: Enable caching for frequently accessed endpoints
3. **S3**: Set lifecycle policies for old objects
4. **CloudFront**: Configure appropriate cache headers
5. **DynamoDB**: Use on-demand pricing for variable workloads

## Security Best Practices

1. Enable AWS WAF on API Gateway
2. Use AWS Secrets Manager for API keys
3. Enable CloudTrail for audit logging
4. Implement least privilege IAM policies
5. Regular security scans with AWS Inspector
6. Enable GuardDuty for threat detection