// public/cart.js
let products = [];
const cart = {}; // { productId: qty }

async function init() {
  const res = await fetch('/api/products');
  products = await res.json();
  renderProducts();
  renderCart();
}

function renderProducts() {
  const container = document.getElementById('products');
  container.innerHTML = '';
  products.forEach(p => {
    const el = document.createElement('div');
    el.className = 'product';
    el.innerHTML = `
      <h4>${p.name}</h4>
      <div>Price: $${(p.price/100).toFixed(2)}</div>
      <button data-id="${p.id}">Add to cart</button>
    `;
    el.querySelector('button').onclick = () => {
      addToCart(p.id);
    };
    container.appendChild(el);
  });
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
}

function removeFromCart(id) {
  delete cart[id];
  renderCart();
}

function renderCart() {
  const el = document.getElementById('cart-items');
  el.innerHTML = '';
  let total = 0;
  Object.entries(cart).forEach(([id, qty]) => {
    const p = products.find(x => x.id === id);
    const subtotal = p.price * qty;
    total += subtotal;
    const row = document.createElement('div');
    row.innerHTML = `${p.name} x ${qty} — $${(subtotal/100).toFixed(2)} <button data-id="${id}">Remove</button>`;
    row.querySelector('button').onclick = () => removeFromCart(id);
    el.appendChild(row);
  });
  document.getElementById('total').textContent = (total/100).toFixed(2);
}

document.getElementById('checkoutBtn').addEventListener('click', async () => {
  const items = Object.entries(cart).map(([id, quantity]) => ({ id, quantity }));
  if (items.length === 0) return alert('Cart is empty');
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  const data = await res.json();
  if (data.url) {
    window.location = data.url;
  } else {
    alert('Could not create checkout session: ' + (data.error || 'unknown'));
  }
});

init();
