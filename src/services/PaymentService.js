import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG, SUBSCRIPTION_TIERS, FEATURE_FLAGS } from '../config/aws-config.js';
import AuthService from './AuthService.js';

class PaymentService {
  constructor() {
    this.stripe = null;
    this.initialized = false;
  }

  async initialize() {
    if (!FEATURE_FLAGS.enablePayments || !STRIPE_CONFIG.publishableKey) {
      console.log('Payments disabled or Stripe key not configured');
      return;
    }

    try {
      this.stripe = await loadStripe(STRIPE_CONFIG.publishableKey);
      this.initialized = true;
      console.log('Stripe initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stripe:', error);
    }
  }

  async createCheckoutSession(tier) {
    if (!this.initialized) {
      throw new Error('Payment service not initialized');
    }

    if (!AuthService.isAuthenticated()) {
      throw new Error('User must be authenticated to subscribe');
    }

    const subscriptionTier = SUBSCRIPTION_TIERS[tier];
    if (!subscriptionTier || !subscriptionTier.priceId) {
      throw new Error('Invalid subscription tier');
    }

    try {
      const token = await AuthService.getAuthToken();
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId: subscriptionTier.priceId,
          tier: tier,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      const { error } = await this.stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      throw error;
    }
  }

  async createPortalSession() {
    if (!AuthService.isAuthenticated()) {
      throw new Error('User must be authenticated');
    }

    try {
      const token = await AuthService.getAuthToken();
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Portal session error:', error);
      throw error;
    }
  }

  async cancelSubscription() {
    if (!AuthService.isAuthenticated()) {
      throw new Error('User must be authenticated');
    }

    try {
      const token = await AuthService.getAuthToken();
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const result = await response.json();
      
      // Update local subscription state
      await AuthService.loadUserData();
      
      return result;
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }

  async getSubscriptionStatus() {
    if (!AuthService.isAuthenticated()) {
      return { status: 'inactive', tier: 'free' };
    }

    try {
      const token = await AuthService.getAuthToken();
      const response = await fetch('/api/subscription-status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get subscription status');
      }

      return await response.json();
    } catch (error) {
      console.error('Get subscription status error:', error);
      return { status: 'inactive', tier: 'free' };
    }
  }

  async getUsageStats() {
    if (!AuthService.isAuthenticated()) {
      return { nodes: 0, graphs: 0, voiceQueries: 0 };
    }

    try {
      const token = await AuthService.getAuthToken();
      const response = await fetch('/api/usage-stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get usage stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Get usage stats error:', error);
      return { nodes: 0, graphs: 0, voiceQueries: 0 };
    }
  }

  // Check if user can perform an action based on their subscription
  async checkUsageLimit(action, currentCount = 0) {
    const subscription = AuthService.subscription;
    
    switch (action) {
      case 'createNode':
        return AuthService.canCreateNode(currentCount);
      case 'createGraph':
        return AuthService.canCreateGraph(currentCount);
      case 'voiceCommand':
        return AuthService.hasFeatureAccess('voiceCommands');
      case 'aiLayout':
        return AuthService.hasFeatureAccess('aiLayouts');
      case 'collaboration':
        return AuthService.hasFeatureAccess('collaboration');
      default:
        return true;
    }
  }

  // Format price for display
  formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  }

  // Get all subscription tiers for display
  getSubscriptionTiers() {
    return Object.values(SUBSCRIPTION_TIERS).map(tier => ({
      id: tier.id,
      name: tier.name,
      price: this.formatPrice(tier.price),
      features: this.formatFeatures(tier.features),
      recommended: tier.id === 'pro',
    }));
  }

  // Format features for display
  formatFeatures(features) {
    const formatted = [];
    
    if (features.maxNodes === -1) {
      formatted.push('Unlimited nodes');
    } else {
      formatted.push(`Up to ${features.maxNodes.toLocaleString()} nodes`);
    }
    
    if (features.maxGraphs === -1) {
      formatted.push('Unlimited graphs');
    } else {
      formatted.push(`Up to ${features.maxGraphs} graphs`);
    }
    
    if (features.voiceCommands) {
      formatted.push('Voice commands');
    }
    
    if (features.aiLayouts) {
      formatted.push('AI-powered layouts');
    }
    
    if (features.collaboration) {
      formatted.push('Team collaboration');
    }
    
    if (features.customDomains) {
      formatted.push('Custom domains');
    }
    
    return formatted;
  }
}

// Export singleton instance
export default new PaymentService();