const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.SUBSCRIPTIONS_TABLE;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    // Verify webhook signature
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Handle the event
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(stripeEvent.data.object);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(stripeEvent.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Webhook handler failed' }),
    };
  }
};

async function handleCheckoutComplete(session) {
  const userId = session.metadata.userId;
  const tier = session.metadata.tier;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Update user subscription in DynamoDB
  await dynamodb.put({
    TableName: TABLE_NAME,
    Item: {
      userId,
      customerId,
      subscriptionId,
      tier,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }).promise();

  console.log(`Subscription created for user ${userId}: ${tier}`);
}

async function handleSubscriptionUpdate(subscription) {
  const customerId = subscription.customer;
  
  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata.userId;
  
  if (!userId) {
    console.error('No userId found for customer:', customerId);
    return;
  }

  // Determine tier from price ID
  let tier = 'free';
  const priceId = subscription.items.data[0]?.price.id;
  
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    tier = 'pro';
  } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
    tier = 'enterprise';
  }

  // Update subscription in DynamoDB
  await dynamodb.update({
    TableName: TABLE_NAME,
    Key: { userId },
    UpdateExpression: 'SET #status = :status, tier = :tier, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': subscription.status,
      ':tier': tier,
      ':updatedAt': new Date().toISOString(),
    },
  }).promise();

  console.log(`Subscription updated for user ${userId}: ${tier} (${subscription.status})`);
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  
  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata.userId;
  
  if (!userId) {
    console.error('No userId found for customer:', customerId);
    return;
  }

  // Update subscription to canceled in DynamoDB
  await dynamodb.update({
    TableName: TABLE_NAME,
    Key: { userId },
    UpdateExpression: 'SET #status = :status, tier = :tier, canceledAt = :canceledAt, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': 'canceled',
      ':tier': 'free',
      ':canceledAt': new Date().toISOString(),
      ':updatedAt': new Date().toISOString(),
    },
  }).promise();

  console.log(`Subscription canceled for user ${userId}`);
}

async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;
  
  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  const userId = customer.metadata.userId;
  
  if (!userId) {
    console.error('No userId found for customer:', customerId);
    return;
  }

  // Log payment failure
  console.error(`Payment failed for user ${userId}, subscription ${subscriptionId}`);
  
  // You might want to send an email notification here
  // Or update the subscription status to 'past_due'
}