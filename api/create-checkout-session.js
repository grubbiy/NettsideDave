// api/create-checkout-session.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = [
  { id: "p1", name: "Cool T-Shirt", price: 2000 },
  { id: "p2", name: "Fancy Mug", price: 1500 },
  { id: "p3", name: "Dragon Spit (virtual)", price: 500 }
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { items } = req.body; // items: [{ id: "p1", quantity: 2 }, ...]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    // Validate and build line_items server-side (do NOT trust client prices)
    const line_items = items.map(({ id, quantity }) => {
      const product = PRODUCTS.find(p => p.id === id);
      if (!product) throw new Error(`Invalid product id: ${id}`);
      const qty = Number(quantity) || 1;
      return {
        price_data: {
          currency: "usd",
          product_data: { name: product.name },
          unit_amount: product.price  // price in cents
        },
        quantity: qty
      };
    });

    // Optionally compute a server-side total to check
    const serverTotal = line_items.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);

    // Create the session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    res.status(500).json({ error: err.message });
  }
}
