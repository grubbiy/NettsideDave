// api/webhook.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Supabase service-role key (keeps DB write permissions server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to read raw body into Buffer
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const sig = req.headers["stripe-signature"];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // We saved line items in the session; fetch them to get product names and amounts:
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

      // Build order payload
      const order = {
        stripe_session_id: session.id,
        customer_email: session.customer_details?.email || null,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        created_at: new Date().toISOString()
      };

      // Insert order
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert(order)
        .select()
        .single();

      if (orderErr) throw orderErr;

      const order_id = orderData.id;

      // Insert order items
      const itemsToInsert = lineItems.data.map(li => ({
        order_id,
        description: li.description || li.price?.product?.name || "item",
        quantity: li.quantity,
        amount_subtotal: li.amount_subtotal,
        currency: li.currency
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      console.log("Order saved to Supabase:", order_id);
    } catch (err) {
      console.error("Error saving order:", err);
      // don't 500 to Stripe webhook; respond 200 so it won't retry indefinitely,
      // but log/alert so you can reconcile.
    }
  }

  res.status(200).send({ received: true });
}
