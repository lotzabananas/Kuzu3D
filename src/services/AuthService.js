import { Amplify } from 'aws-amplify';
import { signIn, signOut, signUp, confirmSignUp, getCurrentUser, fetchAuthSession } from '@aws-amplify/auth';
import awsConfig, { SUBSCRIPTION_TIERS, FEATURE_FLAGS } from '../config/aws-config.js';

// Initialize Amplify only if auth is enabled
if (FEATURE_FLAGS.enableAuth) {
  Amplify.configure(awsConfig);
}

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userAttributes = null;
    this.subscription = SUBSCRIPTION_TIERS.free; // Default to free tier
  }

  async initialize() {
    if (!FEATURE_FLAGS.enableAuth) {
      console.log('Authentication disabled');
      return;
    }

    try {
      const user = await this.getCurrentUser();
      if (user) {
        await this.loadUserData();
      }
    } catch (error) {
      console.log('No authenticated user');
    }
  }

  async signUp(email, password, name) {
    if (!FEATURE_FLAGS.enableAuth) {
      throw new Error('Authentication is disabled');
    }

    try {
      const { user } = await signUp({
        username: email,
        password,
        attributes: {
          email,
          name,
        },
      });
      return user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async confirmSignUp(email, code) {
    if (!FEATURE_FLAGS.enableAuth) {
      throw new Error('Authentication is disabled');
    }

    try {
      const result = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
      return result;
    } catch (error) {
      console.error('Confirmation error:', error);
      throw error;
    }
  }

  async signIn(email, password) {
    if (!FEATURE_FLAGS.enableAuth) {
      // Mock sign in for development
      this.currentUser = { username: email, userId: 'dev-user' };
      this.userAttributes = { email, name: 'Developer' };
      return this.currentUser;
    }

    try {
      const user = await signIn({
        username: email,
        password,
      });
      this.currentUser = user;
      await this.loadUserData();
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut() {
    if (!FEATURE_FLAGS.enableAuth) {
      this.currentUser = null;
      this.userAttributes = null;
      this.subscription = SUBSCRIPTION_TIERS.free;
      return;
    }

    try {
      await signOut();
      this.currentUser = null;
      this.userAttributes = null;
      this.subscription = SUBSCRIPTION_TIERS.free;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    if (!FEATURE_FLAGS.enableAuth) {
      return this.currentUser;
    }

    try {
      const user = await getCurrentUser();
      this.currentUser = user;
      return user;
    } catch (error) {
      return null;
    }
  }

  async getAuthToken() {
    if (!FEATURE_FLAGS.enableAuth) {
      return 'dev-token';
    }

    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async loadUserData() {
    if (!this.currentUser) return;

    try {
      // Load user attributes from Cognito
      const attributes = await this.getUserAttributes();
      this.userAttributes = attributes;

      // Load subscription data from API
      if (FEATURE_FLAGS.enablePayments) {
        const subscription = await this.fetchUserSubscription();
        this.subscription = SUBSCRIPTION_TIERS[subscription.tier] || SUBSCRIPTION_TIERS.free;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async getUserAttributes() {
    // This would be implemented with Cognito user attributes
    return this.userAttributes || {};
  }

  async fetchUserSubscription() {
    const token = await this.getAuthToken();
    if (!token) return { tier: 'free' };

    try {
      const response = await fetch('/api/subscription', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return { tier: 'free' };
    }
  }

  // Check if user has access to a feature based on their subscription
  hasFeatureAccess(feature) {
    return this.subscription.features[feature] === true || 
           this.subscription.features[feature] === -1; // -1 means unlimited
  }

  // Check if user is within their node limit
  canCreateNode(currentNodeCount) {
    const maxNodes = this.subscription.features.maxNodes;
    return maxNodes === -1 || currentNodeCount < maxNodes;
  }

  // Check if user is within their graph limit
  canCreateGraph(currentGraphCount) {
    const maxGraphs = this.subscription.features.maxGraphs;
    return maxGraphs === -1 || currentGraphCount < maxGraphs;
  }

  // Get subscription display info
  getSubscriptionInfo() {
    return {
      name: this.subscription.name,
      tier: this.subscription.id,
      features: this.subscription.features,
      price: this.subscription.price,
    };
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Get user display name
  getUserDisplayName() {
    if (!this.userAttributes) return 'Guest';
    return this.userAttributes.name || this.userAttributes.email || 'User';
  }
}

// Export singleton instance
export default new AuthService();