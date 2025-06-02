/**
 * AWS Amplify Configuration
 * This file will be populated by Amplify CLI after initialization
 */

const awsConfig = {
  // Auth configuration
  Auth: {
    Cognito: {
      userPoolId: process.env.VITE_USER_POOL_ID || '',
      userPoolClientId: process.env.VITE_USER_POOL_CLIENT_ID || '',
      identityPoolId: process.env.VITE_IDENTITY_POOL_ID || '',
      region: process.env.VITE_AWS_REGION || 'us-east-1',
      signUpVerificationMethod: 'code',
      loginWith: {
        oauth: {
          domain: process.env.VITE_OAUTH_DOMAIN || '',
          scopes: ['email', 'profile', 'openid'],
          redirectSignIn: process.env.VITE_REDIRECT_SIGN_IN || 'https://localhost:8081',
          redirectSignOut: process.env.VITE_REDIRECT_SIGN_OUT || 'https://localhost:8081',
          responseType: 'code',
        },
        username: true,
        email: true,
      },
    },
  },

  // API configuration
  API: {
    REST: {
      KuzuAPI: {
        endpoint: process.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        region: process.env.VITE_AWS_REGION || 'us-east-1',
      },
    },
  },

  // Storage configuration
  Storage: {
    S3: {
      bucket: process.env.VITE_S3_BUCKET || '',
      region: process.env.VITE_AWS_REGION || 'us-east-1',
    },
  },
};

// Subscription tiers configuration
export const SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: 'Explorer',
    price: 0,
    priceId: '', // Stripe price ID
    features: {
      maxNodes: 100,
      maxGraphs: 3,
      voiceCommands: false,
      aiLayouts: false,
      collaboration: false,
      customDomains: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    price: 29,
    priceId: process.env.VITE_STRIPE_PRO_PRICE_ID || '',
    features: {
      maxNodes: 10000,
      maxGraphs: 50,
      voiceCommands: true,
      aiLayouts: true,
      collaboration: false,
      customDomains: false,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceId: process.env.VITE_STRIPE_ENTERPRISE_PRICE_ID || '',
    features: {
      maxNodes: -1, // unlimited
      maxGraphs: -1, // unlimited
      voiceCommands: true,
      aiLayouts: true,
      collaboration: true,
      customDomains: true,
    },
  },
};

// Stripe configuration
export const STRIPE_CONFIG = {
  publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};

// Feature flags
export const FEATURE_FLAGS = {
  enableAuth: process.env.VITE_ENABLE_AUTH === 'true',
  enablePayments: process.env.VITE_ENABLE_PAYMENTS === 'true',
  enableVoiceCommands: process.env.VITE_ENABLE_VOICE === 'true',
  enableCollaboration: process.env.VITE_ENABLE_COLLAB === 'true',
};

export default awsConfig;