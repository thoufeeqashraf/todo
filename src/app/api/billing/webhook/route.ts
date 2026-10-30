import { NextResponse } from 'next/server';

import {
  checkoutFallback,
  invoiceWrite,
  subscriptionWrite,
  type CheckoutSessionEvent,
  type InvoiceEvent,
  type SubscriptionEvent,
} from '@/lib/billing/events';
import {
  BillingNotConfiguredError,
  constructBillingEvent,
  getStripe,
  isBillingConfigured,
} from '@/lib/billing/stripe';
import { BillingSyncError, upsertInvoice, upsertSubscription } from '@/lib/billing/sync';

function notConfigured() {
  return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });
}

export async function POST(request: Request) {
  if (!isBillingConfigured()) return notConfigured();

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const payload = await request.text();
  let event;
  try {
    event = constructBillingEvent(payload, signature);
  } catch (error) {
    if (error instanceof BillingNotConfiguredError) return notConfigured();
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as CheckoutSessionEvent;
        if (session.mode && session.mode !== 'subscription') break;
        const fallback = checkoutFallback(session);
        if (!fallback.subscriptionId) break;
        const subscription = await getStripe().subscriptions.retrieve(fallback.subscriptionId);
        const write = subscriptionWrite(subscription as SubscriptionEvent, fallback);
        if (!write) {
          return NextResponse.json({ received: true, ignored: 'missing company_id' });
        }
        await upsertSubscription(write);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const write = subscriptionWrite(event.data.object as SubscriptionEvent);
        if (!write) {
          return NextResponse.json({ received: true, ignored: 'missing company_id' });
        }
        await upsertSubscription(write);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.finalized': {
        await upsertInvoice(invoiceWrite(event.data.object as InvoiceEvent));
        break;
      }
      default:
        break;
    }
  } catch (error) {
    if (error instanceof BillingSyncError) {
      if (!error.retry) {
        return NextResponse.json({ received: true, ignored: error.message });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (error instanceof BillingNotConfiguredError) return notConfigured();
    console.error('Billing webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
