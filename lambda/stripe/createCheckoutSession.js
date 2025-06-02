const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const SUBSCRIPTION_TIERS = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    tier: 'pro',
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    tier: 'enterprise',
  },
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Extract user ID from JWT token (simplified for example)
    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Parse request body
    const { priceId, tier } = JSON.parse(event.body);
    
    if (!SUBSCRIPTION_TIERS[tier] || SUBSCRIPTION_TIERS[tier].priceId !== priceId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid subscription tier' }),
      };
    }

    // Get or create Stripe customer
    // In production, you'd look up the customer ID from your database
    const userEmail = 'user@example.com'; // Get from JWT token
    const userId = 'user-id-from-jwt'; // Get from JWT token

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
        },
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.FRONTEND_URL}?canceled=true`,
      metadata: {
        userId: userId,
        tier: tier,
      },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
    };
  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        message: error.message,
      }),
    };
  }
};