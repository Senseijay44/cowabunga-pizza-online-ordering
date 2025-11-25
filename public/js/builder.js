// public/js/builder.js

console.log('Pizza builder (full) script loaded');

const PizzaBuilder = (function () {
  let menuConfig = null;

  // Core state the backend expects
  let pizzaState = {
    sizeId: null,
    baseId: null,
    sauceId: null,
    cheeseId: null,
    toppings: [],
    quantity: 1,
  };

  const els = {
    sizeSelect: null,
    baseSelect: null,
    sauceSelect: null,
    cheeseSelect: null,
    toppingsContainer: null,
    quantityInput: null,
    priceDisplay: null,
    addToCartBtn: null,
    // preview elements
    previewSize: null,
    previewBase: null,
    previewSauce: null,
    previewCheese: null,
    previewToppings: null,
  };

  function cacheElements() {
    els.sizeSelect = document.querySelector('#builder-size');
    els.baseSelect = document.querySelector('#builder-base');
    els.sauceSelect = document.querySelector('#builder-sauce');
    els.cheeseSelect = document.querySelector('#builder-cheese');
    els.toppingsContainer = document.querySelector('#builder-toppings');
    els.quantityInput = document.querySelector('#builder-quantity');
    els.priceDisplay = document.querySelector('#builder-price');
    els.addToCartBtn = document.querySelector('#builder-add-to-cart');

    // preview elements
    els.previewSize = document.querySelector('#preview-size');
    els.previewBase = document.querySelector('#preview-base');
    els.previewSauce = document.querySelector('#preview-sauce');
    els.previewCheese = document.querySelector('#preview-cheese');
    els.previewToppings = document.querySelector('#preview-toppings');
  }

  async function init() {
    cacheElements();

    // If we're not on the menu page, bail quietly
    if (!els.priceDisplay) {
      console.log('Pizza builder: no #builder-price element found, skipping.');
      return;
    }

    try {
      // 1) Load menu config from backend
      const res = await fetch('/api/menu');
      if (!res.ok) throw new Error('Failed to load menu config');
      menuConfig = await res.json();

      console.log('Pizza builder loaded menu config:', menuConfig);

      // 2) Populate controls from config
      buildSelectOptions();
      buildToppingsGrid();

      // 3) Set defaults based on rules/config
      applyDefaultsFromConfig();

      // 4) Wire up UI events
      attachEventListeners();

      console.log('Pizza builder initial state:', pizzaState);

      // 5) Initial preview + price fetch
      updatePreview();
      await updatePriceFromServer();
    } catch (err) {
      console.error('Pizza builder init error:', err);
      els.priceDisplay.textContent = 'Error loading pizza builder.';
    }
  }

  // ---------- UI Builders ----------------------------------------------------

  function buildSelectOptions() {
    const { sizes, bases, sauces, cheeses } = menuConfig;

    if (els.sizeSelect && Array.isArray(sizes)) {
      els.sizeSelect.innerHTML = '';
      sizes.forEach((size) => {
        const opt = document.createElement('option');
        opt.value = size.id;
        opt.textContent = size.name;
        els.sizeSelect.appendChild(opt);
      });
    }

    if (els.baseSelect && Array.isArray(bases)) {
      els.baseSelect.innerHTML = '';
      bases.forEach((base) => {
        const opt = document.createElement('option');
        opt.value = base.id;
        opt.textContent = base.name;
        els.baseSelect.appendChild(opt);
      });
    }

    if (els.sauceSelect && Array.isArray(sauces)) {
      els.sauceSelect.innerHTML = '';
      sauces.forEach((sauce) => {
        const opt = document.createElement('option');
        opt.value = sauce.id;
        const priceSuffix =
          sauce.price && sauce.price > 0 ? ` (+$${sauce.price.toFixed(2)})` : '';
        opt.textContent = sauce.name + priceSuffix;
        els.sauceSelect.appendChild(opt);
      });
    }

    if (els.cheeseSelect && Array.isArray(cheeses)) {
      els.cheeseSelect.innerHTML = '';
      cheeses.forEach((cheese) => {
        const opt = document.createElement('option');
        opt.value = cheese.id;
        const priceSuffix =
          cheese.price && cheese.price > 0
            ? ` (+$${cheese.price.toFixed(2)})`
            : '';
        opt.textContent = cheese.name + priceSuffix;
        els.cheeseSelect.appendChild(opt);
      });
    }
  }

  function buildToppingsGrid() {
    const { toppings, rules } = menuConfig;
    if (!els.toppingsContainer || !Array.isArray(toppings)) return;

    els.toppingsContainer.innerHTML = '';

    toppings.forEach((topping) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'topping-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = topping.id;
      checkbox.dataset.toppingId = topping.id;

      const nameSpan = document.createElement('span');
      nameSpan.className = 'topping-name';
      nameSpan.textContent = topping.name;

      const priceSpan = document.createElement('span');
      priceSpan.className = 'topping-price';
      const priceText =
        topping.price && topping.price > 0
          ? `+$${topping.price.toFixed(2)}`
          : 'included';
      priceSpan.textContent = priceText;

      wrapper.appendChild(checkbox);
      wrapper.appendChild(nameSpan);
      wrapper.appendChild(priceSpan);

      els.toppingsContainer.appendChild(wrapper);
    });

    // Small note for max toppings
    if (rules && rules.maxToppings) {
      const note = document.createElement('p');
      note.className = 'topping-note';
      note.textContent = `You can choose up to ${rules.maxToppings} toppings.`;
      els.toppingsContainer.appendChild(note);
    }
  }

  // ---------- State helpers --------------------------------------------------

  function applyDefaultsFromConfig() {
    const { rules, sizes, bases, sauces, cheeses } = menuConfig;

    const defaultSizeId =
      rules?.defaultSizeId || (sizes[0] && sizes[0].id) || null;
    const defaultBaseId =
      rules?.defaultBaseId || (bases[0] && bases[0].id) || null;
    const defaultSauceId =
      rules?.defaultSauceId || (sauces[0] && sauces[0].id) || null;
    const defaultCheeseId =
      rules?.defaultCheeseId || (cheeses[0] && cheeses[0].id) || null;

    pizzaState.sizeId = defaultSizeId;
    pizzaState.baseId = defaultBaseId;
    pizzaState.sauceId = defaultSauceId;
    pizzaState.cheeseId = defaultCheeseId;
    pizzaState.toppings = [];
    pizzaState.quantity = 1;

    // Sync defaults into the form controls
    if (els.sizeSelect) els.sizeSelect.value = defaultSizeId;
    if (els.baseSelect) els.baseSelect.value = defaultBaseId;
    if (els.sauceSelect) els.sauceSelect.value = defaultSauceId;
    if (els.cheeseSelect) els.cheeseSelect.value = defaultCheeseId;
    if (els.quantityInput) els.quantityInput.value = '1';

    // Clear toppings checkboxes
    if (els.toppingsContainer) {
      els.toppingsContainer
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => {
          cb.checked = false;
        });
    }
  }

  function updateStateFromForm() {
    if (els.sizeSelect) pizzaState.sizeId = els.sizeSelect.value || null;
    if (els.baseSelect) pizzaState.baseId = els.baseSelect.value || null;
    if (els.sauceSelect) pizzaState.sauceId = els.sauceSelect.value || null;
    if (els.cheeseSelect) pizzaState.cheeseId = els.cheeseSelect.value || null;

    if (els.quantityInput) {
      const q = parseInt(els.quantityInput.value, 10);
      pizzaState.quantity = Number.isNaN(q) || q < 1 ? 1 : q;
      els.quantityInput.value = String(pizzaState.quantity);
    }

    if (els.toppingsContainer) {
      const checked = Array.from(
        els.toppingsContainer.querySelectorAll(
          'input[type="checkbox"]:checked'
        )
      );
      pizzaState.toppings = checked.map((cb) => cb.dataset.toppingId);
    }
  }

  function enforceMaxToppings(checkboxChanged) {
    const maxToppings = menuConfig?.rules?.maxToppings;
    if (!maxToppings || !els.toppingsContainer) return;

    const checked = Array.from(
      els.toppingsContainer.querySelectorAll('input[type="checkbox"]:checked')
    );

    if (checked.length > maxToppings) {
      if (checkboxChanged) checkboxChanged.checked = false;
      alert(`You can only choose up to ${maxToppings} toppings.`);
    }
  }

  // ---------- Preview helpers -----------------------------------------------

  function findById(list, id) {
    if (!list || !Array.isArray(list) || !id) return null;
    return list.find((item) => item.id === id || item.idAlt === id) || null;
  }

  function updatePreview() {
    if (!menuConfig) return;

    const { sizes, bases, sauces, cheeses, toppings } = menuConfig;

    const size = findById(sizes, pizzaState.sizeId);
    const base = findById(bases, pizzaState.baseId);
    const sauce = findById(sauces, pizzaState.sauceId);
    const cheese = findById(cheeses, pizzaState.cheeseId);

    if (els.previewSize)
      els.previewSize.textContent = size ? size.name : '–';
    if (els.previewBase)
      els.previewBase.textContent = base ? base.name : '–';
    if (els.previewSauce)
      els.previewSauce.textContent = sauce ? sauce.name : '–';
    if (els.previewCheese)
      els.previewCheese.textContent = cheese ? cheese.name : '–';

    if (els.previewToppings) {
      els.previewToppings.innerHTML = '';

      if (!pizzaState.toppings || pizzaState.toppings.length === 0) {
        const placeholder = document.createElement('span');
        placeholder.className = 'preview-value preview-placeholder';
        placeholder.textContent = 'None selected';
        els.previewToppings.appendChild(placeholder);
      } else {
        const toppingObjects = pizzaState.toppings
          .map((id) => findById(toppings, id))
          .filter(Boolean);

        toppingObjects.forEach((topping) => {
          const chip = document.createElement('span');
          chip.className = 'preview-topping-chip';
          chip.textContent = topping.name;
          els.previewToppings.appendChild(chip);
        });
      }
    }
  }
function updatePreviewImages() {
  if (!menuConfig) return;
  const preview = document.getElementById('pizza-preview');
  if (!preview) return;

  preview.innerHTML = ""; // clear old layers

  const { bases, sauces, cheeses, toppings } = menuConfig;

  const base = bases.find(b => b.id === pizzaState.baseId);
  const sauce = sauces.find(s => s.id === pizzaState.sauceId);
  const cheese = cheeses.find(c => c.id === pizzaState.cheeseId);

  const toppingObjs = pizzaState.toppings
    .map(id => toppings.find(t => t.id === id))
    .filter(Boolean);

  // Utility to add image layer
  const addLayer = (obj) => {
    if (!obj || !obj.asset) return;
    const img = document.createElement('img');
    img.src = obj.asset;
    img.style.zIndex = obj.layer || 50;
    preview.appendChild(img);
  };

  addLayer(base);
  addLayer(sauce);
  addLayer(cheese);
  toppingObjs.forEach(addLayer);
}
  function updatePreviewImages() {
    if (!menuConfig) return;
    const preview = document.getElementById('pizza-preview');
    if (!preview) return;

    preview.innerHTML = ""; // clear old layers

    const { bases, sauces, cheeses, toppings } = menuConfig;

    const base = bases.find(b => b.id === pizzaState.baseId);
    const sauce = sauces.find(s => s.id === pizzaState.sauceId);
    const cheese = cheeses.find(c => c.id === pizzaState.cheeseId);

    const toppingObjs = pizzaState.toppings
      .map(id => toppings.find(t => t.id === id))
      .filter(Boolean);

  // Utility to add image layer
    const addLayer = (obj) => {
      if (!obj || !obj.asset) return;
      const img = document.createElement('img');
      img.src = obj.asset;
      img.style.zIndex = obj.layer || 50;
      preview.appendChild(img);
    };

    addLayer(base);
    addLayer(sauce);
    addLayer(cheese);
    toppingObjs.forEach(addLayer);
  }

  // ---------- Events ---------------------------------------------------------

  function attachEventListeners() {
    if (els.sizeSelect) {
      els.sizeSelect.addEventListener('change', async () => {
        updateStateFromForm();
        updatePreview();
        await updatePriceFromServer();
      });
    }

    if (els.baseSelect) {
      els.baseSelect.addEventListener('change', async () => {
        updateStateFromForm();
        updatePreview();
        await updatePriceFromServer();
      });
    }

    if (els.sauceSelect) {
      els.sauceSelect.addEventListener('change', async () => {
        updateStateFromForm();
        updatePreview();
        await updatePriceFromServer();
      });
    }

    if (els.cheeseSelect) {
      els.cheeseSelect.addEventListener('change', async () => {
        updateStateFromForm();
        updatePreview();
        await updatePriceFromServer();
      });
    }

    if (els.quantityInput) {
      els.quantityInput.addEventListener('input', async () => {
        updateStateFromForm();
        updatePreview();
        await updatePriceFromServer();
      });
    }

    if (els.toppingsContainer) {
      els.toppingsContainer.addEventListener('change', async (evt) => {
        const target = evt.target;
        if (target.matches('input[type="checkbox"]')) {
          enforceMaxToppings(target);
          updateStateFromForm();
          updatePreview();
          await updatePriceFromServer();
        }
      });
    }

    if (els.addToCartBtn) {
      els.addToCartBtn.addEventListener('click', async () => {
        updateStateFromForm();
        updatePreview();
        console.log('Add to cart clicked with state:', pizzaState);
        alert('Custom pizza added to cart (stub).');
      });
    }
  }

  // ---------- Backend interaction -------------------------------------------

  async function updatePriceFromServer() {
    if (!els.priceDisplay) return;

    try {
      const res = await fetch('/api/price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pizzaState),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Price API error:', res.status, text);
        els.priceDisplay.textContent = 'Error calculating price.';
        return;
      }

      const data = await res.json();
      console.log('Pricing response:', data);

      els.priceDisplay.textContent = `$${data.total.toFixed(
        2
      )} (x${data.quantity})`;
    } catch (err) {
      console.error('Failed to update price from server:', err);
      els.priceDisplay.textContent = 'Error calculating price.';
    }
  }

  // ---------- Public debugging helpers --------------------------------------

  function getState() {
    return { ...pizzaState };
  }

  function getMenu() {
    return menuConfig;
  }

  return {
    init,
    getState,
    getMenu,
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  PizzaBuilder.init();
});
