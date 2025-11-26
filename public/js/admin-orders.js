// public/js/admin-orders.js

document.addEventListener('DOMContentLoaded', () => {
  const selects = document.querySelectorAll('.order-status-select');

  selects.forEach((select) => {
    select.addEventListener('change', async () => {
      const row = select.closest('tr');
      const orderId = row?.dataset.orderId;
      const newStatus = select.value;

      if (!orderId) {
        console.error('Missing orderId on row');
        return;
      }

      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) {
          console.error('Failed to update status', res.status);
          alert('Failed to update order status. Check console for details.');
          return;
        }

        const data = await res.json();

        // Update the status cell to reflect the new status
        const statusCell = row.querySelector('.order-status-cell');
        if (statusCell) {
          statusCell.textContent = data.status;
        }

        // Tiny visual feedback
        row.classList.add('order-status-updated');
        setTimeout(() => {
          row.classList.remove('order-status-updated');
        }, 700);
      } catch (err) {
        console.error('Error updating order status:', err);
        alert('Error updating order status. See console for details.');
      }
    });
  });
});
