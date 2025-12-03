// public/js/admin-menu.js

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('menu-table-body');
  const form = document.getElementById('menu-form');
  const nameInput = document.getElementById('menu-name');
  const descriptionInput = document.getElementById('menu-description');
  const priceInput = document.getElementById('menu-price');
  const formTitle = document.getElementById('form-title');
  const formHint = document.getElementById('form-hint');
  const cancelEditButton = document.getElementById('cancel-edit');
  const statusMessage = document.getElementById('menu-message');
  const saveButton = document.getElementById('save-button');

  let editingId = null;
  let menuItems = [];

  const setStatus = (message, isError = false) => {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.classList.toggle('error', isError);
  };

  const resetForm = () => {
    editingId = null;
    form.reset();
    formTitle.textContent = 'Add Menu Item';
    formHint.textContent = 'Fill out the fields and hit save to add a new item.';
    cancelEditButton.hidden = true;
    saveButton.textContent = 'Save Item';
  };

  const renderTable = () => {
    if (!Array.isArray(menuItems) || menuItems.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4">No menu items found. Add one above!</td></tr>';
      return;
    }

    const rows = menuItems
      .map(
        (item) => `
        <tr data-id="${item.id}">
          <td><strong>${item.name}</strong></td>
          <td>${item.description || ''}</td>
          <td>$${Number(item.price).toFixed(2)}</td>
          <td class="admin-actions">
            <button type="button" class="cb-btn cb-btn--sm cb-btn--outline js-edit" data-id="${item.id}">Edit</button>
            <button type="button" class="cb-btn cb-btn--sm cb-btn--danger js-delete" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `
      )
      .join('');

    tableBody.innerHTML = rows;
  };

  const loadMenu = async () => {
    setStatus('Loading menu items...');
    try {
      const res = await fetch('/api/admin/menu');
      if (!res.ok) {
        throw new Error('Failed to load menu');
      }
      const data = await res.json();
      menuItems = data.items || [];
      renderTable();
      setStatus(`Loaded ${menuItems.length} item${menuItems.length === 1 ? '' : 's'}.`);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setStatus('Unable to load menu items. Please try again.', true);
    }
  };

  const startEdit = (item) => {
    editingId = item.id;
    nameInput.value = item.name || '';
    descriptionInput.value = item.description || '';
    priceInput.value = item.price;

    formTitle.textContent = 'Edit Menu Item';
    formHint.textContent = 'Update the fields and click save to apply changes.';
    cancelEditButton.hidden = false;
    saveButton.textContent = 'Update Item';
  };

  tableBody.addEventListener('click', async (event) => {
    const editBtn = event.target.closest('.js-edit');
    const deleteBtn = event.target.closest('.js-delete');

    if (editBtn) {
      const id = Number(editBtn.dataset.id);
      const item = menuItems.find((entry) => entry.id === id);
      if (item) {
        startEdit(item);
      }
      return;
    }

    if (deleteBtn) {
      const id = Number(deleteBtn.dataset.id);
      const confirmed = window.confirm('Delete this menu item?');
      if (!confirmed) return;

      try {
        const res = await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          throw new Error('Delete failed');
        }
        menuItems = menuItems.filter((item) => item.id !== id);
        renderTable();
        setStatus('Menu item deleted.');
        if (editingId === id) {
          resetForm();
        }
      } catch (err) {
        console.error('Failed to delete item:', err);
        setStatus('Could not delete item. Please try again.', true);
      }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      name: nameInput.value.trim(),
      description: descriptionInput.value.trim(),
      price: Number(priceInput.value),
    };

    if (!payload.name || !Number.isFinite(payload.price) || payload.price <= 0) {
      setStatus('Please provide a name and a valid price.', true);
      return;
    }

    const isEdit = Boolean(editingId);
    const url = isEdit ? `/api/admin/menu/${editingId}` : '/api/admin/menu';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.error || 'Request failed';
        throw new Error(message);
      }

      const data = await res.json();
      const savedItem = data.item;

      if (isEdit) {
        menuItems = menuItems.map((item) => (item.id === savedItem.id ? savedItem : item));
        setStatus('Menu item updated.');
      } else {
        menuItems.push(savedItem);
        setStatus('Menu item added.');
      }

      renderTable();
      resetForm();
    } catch (err) {
      console.error('Failed to save menu item:', err);
      setStatus(err.message || 'Unable to save menu item.', true);
    }
  });

  cancelEditButton.addEventListener('click', resetForm);

  loadMenu();
});
