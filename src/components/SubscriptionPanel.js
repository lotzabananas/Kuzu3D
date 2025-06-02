import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';
import PaymentService from '../services/PaymentService.js';
import AuthService from '../services/AuthService.js';

export default class SubscriptionPanel extends THREE.Group {
  constructor() {
    super();
    this.visible = false;
    this.selectedTier = null;
    this.init();
  }

  init() {
    // Main container
    this.container = new ThreeMeshUI.Block({
      width: 1.2,
      height: 0.8,
      padding: 0.05,
      fontSize: 0.025,
      fontFamily: '/src/assets/SpaceMono-Bold.ttf',
      backgroundColor: new THREE.Color(0x000000),
      backgroundOpacity: 0.9,
      borderRadius: 0.02,
    });

    // Title
    const title = new ThreeMeshUI.Block({
      width: 1.1,
      height: 0.1,
      margin: 0.02,
      backgroundColor: new THREE.Color(0x1a1a1a),
      backgroundOpacity: 1,
      borderRadius: 0.01,
    });

    const titleText = new ThreeMeshUI.Text({
      content: 'Upgrade Your Subscription',
      fontSize: 0.04,
      fontColor: new THREE.Color(0xffffff),
    });

    title.add(titleText);
    this.container.add(title);

    // Current subscription info
    this.currentPlanBlock = new ThreeMeshUI.Block({
      width: 1.1,
      height: 0.08,
      margin: 0.02,
      backgroundColor: new THREE.Color(0x0066cc),
      backgroundOpacity: 0.3,
      borderRadius: 0.01,
    });

    this.currentPlanText = new ThreeMeshUI.Text({
      content: 'Loading...',
      fontSize: 0.025,
      fontColor: new THREE.Color(0x66ccff),
    });

    this.currentPlanBlock.add(this.currentPlanText);
    this.container.add(this.currentPlanBlock);

    // Subscription tiers
    this.tiersContainer = new ThreeMeshUI.Block({
      width: 1.1,
      height: 0.5,
      margin: 0.02,
      contentDirection: 'row',
      justifyContent: 'space-between',
    });

    // Create tier cards
    this.tierCards = {};
    const tiers = PaymentService.getSubscriptionTiers();
    
    tiers.forEach((tier) => {
      const card = this.createTierCard(tier);
      this.tierCards[tier.id] = card;
      this.tiersContainer.add(card);
    });

    this.container.add(this.tiersContainer);

    // Action buttons
    const buttonContainer = new ThreeMeshUI.Block({
      width: 1.1,
      height: 0.08,
      margin: 0.02,
      contentDirection: 'row',
      justifyContent: 'center',
    });

    this.upgradeButton = this.createButton('Upgrade', 0x00cc00, () => this.handleUpgrade());
    this.manageButton = this.createButton('Manage Billing', 0x0066cc, () => this.handleManageBilling());
    this.cancelButton = this.createButton('Cancel', 0xcc0000, () => this.hide());

    buttonContainer.add(this.upgradeButton);
    buttonContainer.add(this.manageButton);
    buttonContainer.add(this.cancelButton);

    this.container.add(buttonContainer);

    this.add(this.container);
    this.position.set(0, 1.5, -1);
    
    // Update panel with current subscription
    this.updateCurrentPlan();
  }

  createTierCard(tier) {
    const card = new ThreeMeshUI.Block({
      width: 0.35,
      height: 0.45,
      padding: 0.02,
      backgroundColor: tier.recommended ? new THREE.Color(0x0066cc) : new THREE.Color(0x1a1a1a),
      backgroundOpacity: tier.recommended ? 0.3 : 0.8,
      borderRadius: 0.01,
      contentDirection: 'column',
    });

    // Tier name
    const nameBlock = new ThreeMeshUI.Block({
      width: 0.3,
      height: 0.06,
      margin: 0.01,
    });

    const nameText = new ThreeMeshUI.Text({
      content: tier.name,
      fontSize: 0.03,
      fontColor: new THREE.Color(0xffffff),
    });

    nameBlock.add(nameText);
    card.add(nameBlock);

    // Price
    const priceBlock = new ThreeMeshUI.Block({
      width: 0.3,
      height: 0.08,
      margin: 0.01,
    });

    const priceText = new ThreeMeshUI.Text({
      content: `${tier.price}/month`,
      fontSize: 0.04,
      fontColor: new THREE.Color(0x00ff00),
    });

    priceBlock.add(priceText);
    card.add(priceBlock);

    // Features
    const featuresBlock = new ThreeMeshUI.Block({
      width: 0.3,
      height: 0.25,
      margin: 0.01,
      contentDirection: 'column',
      justifyContent: 'start',
    });

    tier.features.forEach((feature) => {
      const featureText = new ThreeMeshUI.Text({
        content: `• ${feature}`,
        fontSize: 0.02,
        fontColor: new THREE.Color(0xcccccc),
        textAlign: 'left',
      });
      featuresBlock.add(featureText);
    });

    card.add(featuresBlock);

    // Make card interactive
    card.setupState({
      state: 'idle',
      attributes: {
        backgroundColor: tier.recommended ? new THREE.Color(0x0066cc) : new THREE.Color(0x1a1a1a),
        backgroundOpacity: tier.recommended ? 0.3 : 0.8,
      },
    });

    card.setupState({
      state: 'hovered',
      attributes: {
        backgroundColor: new THREE.Color(0x0088ff),
        backgroundOpacity: 0.5,
      },
    });

    card.setupState({
      state: 'selected',
      attributes: {
        backgroundColor: new THREE.Color(0x00ff00),
        backgroundOpacity: 0.3,
      },
    });

    // Store tier data
    card.userData = { tier };

    return card;
  }

  createButton(text, color, onClick) {
    const button = new ThreeMeshUI.Block({
      width: 0.25,
      height: 0.06,
      margin: 0.01,
      backgroundColor: new THREE.Color(color),
      backgroundOpacity: 0.8,
      borderRadius: 0.01,
    });

    const buttonText = new ThreeMeshUI.Text({
      content: text,
      fontSize: 0.025,
      fontColor: new THREE.Color(0xffffff),
    });

    button.add(buttonText);

    button.setupState({
      state: 'idle',
      attributes: {
        backgroundColor: new THREE.Color(color),
        backgroundOpacity: 0.8,
      },
    });

    button.setupState({
      state: 'hovered',
      attributes: {
        backgroundColor: new THREE.Color(color),
        backgroundOpacity: 1,
      },
    });

    button.userData = { onClick };

    return button;
  }

  async updateCurrentPlan() {
    const subscription = AuthService.getSubscriptionInfo();
    const status = await PaymentService.getSubscriptionStatus();
    
    let planText = `Current Plan: ${subscription.name}`;
    if (status.status === 'active') {
      planText += ' (Active)';
    } else if (status.status === 'trialing') {
      planText += ' (Trial)';
    } else if (status.status === 'past_due') {
      planText += ' (Payment Due)';
    }
    
    this.currentPlanText.set({ content: planText });
    
    // Hide upgrade button if already on enterprise
    if (subscription.tier === 'enterprise') {
      this.upgradeButton.visible = false;
    }
  }

  async handleUpgrade() {
    if (!this.selectedTier) {
      console.warn('No tier selected');
      return;
    }

    try {
      await PaymentService.createCheckoutSession(this.selectedTier);
    } catch (error) {
      console.error('Upgrade error:', error);
      // Show error message in VR
    }
  }

  async handleManageBilling() {
    try {
      await PaymentService.createPortalSession();
    } catch (error) {
      console.error('Billing portal error:', error);
    }
  }

  show() {
    this.visible = true;
    this.updateCurrentPlan();
  }

  hide() {
    this.visible = false;
    this.selectedTier = null;
    
    // Reset all cards to idle state
    Object.values(this.tierCards).forEach(card => {
      card.setState('idle');
    });
  }

  update() {
    if (!this.visible) return;
    ThreeMeshUI.update();
  }

  handleRaycast(raycaster) {
    if (!this.visible) return null;

    const intersects = raycaster.intersectObject(this, true);
    if (intersects.length === 0) return null;

    const intersected = intersects[0].object;
    
    // Handle tier card selection
    Object.entries(this.tierCards).forEach(([tierId, card]) => {
      if (card === intersected || card.children.includes(intersected)) {
        card.setState('selected');
        this.selectedTier = tierId;
      } else if (this.selectedTier !== tierId) {
        card.setState('idle');
      }
    });

    // Handle button clicks
    [this.upgradeButton, this.manageButton, this.cancelButton].forEach(button => {
      if (button === intersected || button.children.includes(intersected)) {
        button.setState('hovered');
        return button;
      } else {
        button.setState('idle');
      }
    });

    return intersected;
  }

  handlePinch(intersected) {
    // Find which button was pinched
    [this.upgradeButton, this.manageButton, this.cancelButton].forEach(button => {
      if (button === intersected || button.children.includes(intersected)) {
        if (button.userData.onClick) {
          button.userData.onClick();
        }
      }
    });
  }
}