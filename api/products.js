// api/products.js
export default function handler(req, res) {
  // prices in cents (integer)
  const products = [
    { id: "p1", name: "Cool T-Shirt", price: 2000, currency: "usd" },
    { id: "p2", name: "Fancy Mug", price: 1500, currency: "usd" },
    { id: "p3", name: "Dragon Spit (virtual)", price: 500, currency: "usd" }
  ];
  res.status(200).json(products);
}
