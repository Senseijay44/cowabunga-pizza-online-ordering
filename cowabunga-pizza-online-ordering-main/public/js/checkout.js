// public/js/checkout.js

document.addEventListener('DOMContentLoaded', async () => {
  const summaryEl = document.getElementById('checkout-summary-placeholder');
  const cartJsonInput = document.getElementById('cartJson');

  if (!summaryEl || !cartJsonInput) {
    console.warn('Checkout summary or cartJson input not found on page.');
    return;
  }

  try {
    const res = await fetch('/api/cart', {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.error('Failed to fetch cart for checkout:', res.status);
      summaryEl.innerHTML = `
        <p>We had trouble loading your cart. Try going back to the menu and rebuilding it.</p>
      `;
      return;
    }

    const data = await res.json();
    const items = data.items || [];
    const subtotal = data.subtotal || 0;
    const total = data.total || 0;

    // Store cart items as JSON for the server-side /checkout POST
    cartJsonInput.value = JSON.stringify(items);

    if (items.length === 0) {
      summaryEl.innerHTML = `
        <p>Your cart is empty.</p>
        <p><a href="/menu" class="btn-secondary">Back to menu</a></p>
      `;
      return;
    }

    // Build a little HTML summary
    const itemsHtml = items
      .map(item => {
        const lineTotal = (Number(item.price) * Number(item.qty || 1)) || 0;
        return `
          <li class="summary-item">
            <span class="item-name">${item.name}</span>
            ${item.meta ? `<span class="item-meta">${item.meta}</span>` : ''}
            <span class="item-qty">x ${item.qty}</span>
            <span class="item-line-total">$${lineTotal.toFixed(2)}</span>
          </li>
        `;
      })
      .join('');

    summaryEl.innerHTML = `
      <ul class="summary-items">
        ${itemsHtml}
      </ul>
      <div class="summary-totals">
        <p><strong>Subtotal:</strong> $${Number(subtotal).toFixed(2)}</p>
        <p><strong>Estimated Total:</strong> $${Number(total).toFixed(2)}</p>
        <p class="summary-note">Final total is confirmed on the next screen.</p>
      </div>
    `;
  } catch (err) {
    console.error('Error loading cart for checkout:', err);
    summaryEl.innerHTML = `
      <p>Something went wrong loading your cart.</p>
      <p><a href="/menu" class="btn-secondary">Back to menu</a></p>
    `;
  }
});
