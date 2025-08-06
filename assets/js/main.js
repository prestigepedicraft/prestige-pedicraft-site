let PRODUCTS = [];
let cart = [];
let productDataLoaded = false;

// Load product data from JSON
async function fetchProducts() {
  if (productDataLoaded) return PRODUCTS;
  const res = await fetch('products.json');
  PRODUCTS = await res.json();
  productDataLoaded = true;
  return PRODUCTS;
}

function priceWithDiscount(product) {
  if (!product.discount || !product.discount.active) return product.price;
  if (product.discount.amount) return product.price - product.discount.amount;
  if (product.discount.percent) return Math.round(product.price * (1 - product.discount.percent / 100));
  return product.price;
}

function formatPrice(n) {
  return "₦" + n.toLocaleString();
}

function getColorDot(color) {
  let style = `background:${color.hex};`;
  if (color.soldOut) style += "filter:grayscale(1);border:2px solid #e63946;";
  return `<span class="color-dot" title="${color.name}" style="${style}"></span>`;
}

function renderProductCard(product, showDetailsBtn = true) {
  const discounted = product.discount && product.discount.active;
  const price = formatPrice(priceWithDiscount(product));
  const oldPrice = discounted ? `<span class="old-price">${formatPrice(product.price)}</span>` : '';
  const discountBadge = discounted
    ? `<div class="discount-badge">${product.discount.percent ? `-${product.discount.percent}%` : `₦${product.discount.amount} off`}</div>` : '';
  const soldOutBadge = product.soldOut ? `<div class="soldout-badge">Sold Out</div>` : '';
  const cardClass = product.soldOut ? 'product-card soldout' : 'product-card';
  const colorDots = product.colors ? product.colors.map(c => getColorDot(c)).join('') : '';
  const btn = product.soldOut
    ? `<button disabled>Sold Out</button>`
    : `<button onclick="openProductModal('${product.id}')">View & Buy</button>`;

  return `<div class="${cardClass}">
    ${discountBadge}${soldOutBadge}
    <img src="${product.image || 'logo.png'}" alt="${product.name}" />
    <h3>${product.name}</h3>
    <div class="price-row">${oldPrice} <span class="price">${price}</span></div>
    <div class="colors">${colorDots}</div>
    ${btn}
  </div>`;
}

function buildProductModal(product) {
  // Find first available color
  let availableColors = product.colors?.filter(c => !c.soldOut) || [];
  let colorOptions = availableColors.map((c, i) =>
    `<option value="${c.name}" ${i === 0 ? "selected":""}>${c.name}</option>`
  ).join('');
  let hasCustom = product.customizable;
  let hasUpleg = product.uplegOption;
  let customizationFee = hasCustom ? product.customizationFee || 10000 : 0;

  return `<div class="modal-content">
    <button class="close" onclick="closeModal()">&times;</button>
    <h2>${product.name}</h2>
    <img src="${product.image || 'logo.png'}" alt="${product.name}" style="width:100%;max-width:260px;border-radius:1em;margin:0.7em 0;" />
    <div>${product.description}</div>
    <div class="price-row" style="margin:1em 0;">${product.discount && product.discount.active ? `<span class="old-price">${formatPrice(product.price)}</span>` : ''} <span class="price">${formatPrice(priceWithDiscount(product))}</span></div>
    <form id="buy-form" onsubmit="addToCart(event, '${product.id}')">
      ${product.colors?.length ? `<label>Color: <select name="color" required>${colorOptions}</select></label>` : ''}
      ${product.category === "footwear" ? `
        <label>Shoe Size (e.g. 42): <input type="number" name="size" min="30" max="50" required></label>
        ${hasUpleg ? `<label>Upleg? <select name="upleg"><option value="no">No</option><option value="yes">Yes</option></select></label>` : ''}
      ` : ''}
      ${hasCustom ? `
        <label>
          Customization? 
          <select name="customize" id="customize-select" onchange="toggleCustomizeInput(this)">
            <option value="no">No</option>
            <option value="yes">Yes (+${formatPrice(customizationFee)})</option>
          </select>
        </label>
        <label id="customize-name-label" style="display:none;">
          Customization Name (max 10 words): 
          <input type="text" name="customName" maxlength="50" pattern="[A-Za-z0-9 ]{1,50}" placeholder="e.g. J.Ojeh" />
        </label>
      ` : ''}
      <button class="btn-primary" type="submit">Add to Cart</button>
    </form>
  </div>`;
}

function toggleCustomizeInput(sel) {
  document.getElementById('customize-name-label').style.display = sel.value === "yes" ? "block" : "none";
}

function openProductModal(productId) {
  fetchProducts().then(products => {
    const product = products.find(p => p.id === productId);
    document.getElementById('cart-modal').innerHTML = buildProductModal(product);
    document.getElementById('cart-modal').classList.remove('hidden');
    document.getElementById('cart-modal').style.display = 'flex';
  });
}
function closeModal() {
  document.getElementById('cart-modal').classList.add('hidden');
  document.getElementById('cart-modal').style.display = 'none';
}

function addToCart(e, productId) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  let item = {
    id: productId,
    color: data.get('color'),
    size: data.get('size'),
    upleg: data.get('upleg'),
    customize: data.get('customize') === "yes",
    customName: data.get('customName'),
    qty: 1
  };
  fetchProducts().then(products => {
    let p = products.find(x => x.id === productId);
    if (!p) return;
    let existing = cart.find(c =>
      c.id === item.id &&
      c.color === item.color &&
      c.size === item.size &&
      c.customize === item.customize &&
      c.customName === item.customName
    );
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push(item);
    }
    updateCartCount();
    closeModal();
  });
}

function updateCartCount() {
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = cart.reduce((n, i) => n + (i.qty || 1), 0));
}

function openCart() {
  fetchProducts().then(products => {
    let cartHtml = `<div class="modal-content"><button class="close" onclick="closeModal()">&times;</button><h2>Your Cart</h2>`;
    if (cart.length === 0) {
      cartHtml += `<p>Your cart is empty.</p></div>`;
    } else {
      cartHtml += `<div class="cart-list">`;
      let total = 0;
      cart.forEach((item, idx) => {
        let p = products.find(x => x.id === item.id);
        if (!p) return;
        let thisPrice = priceWithDiscount(p);
        if (item.customize) thisPrice += (p.customizationFee || 10000);
        let priceStr = formatPrice(thisPrice * (item.qty || 1));
        total += thisPrice * (item.qty || 1);
        cartHtml += `<div class="cart-item">
          <div>
            <strong>${p.name}</strong>
            ${item.color ? `<div>Color: ${item.color}</div>` : ''}
            ${item.size ? `<div>Size: ${item.size}</div>` : ''}
            ${item.upleg ? `<div>Upleg: ${item.upleg}</div>` : ''}
            ${item.customize ? `<div>Customization: ${item.customName || "Yes"} (+${formatPrice(p.customizationFee || 10000)})</div>` : ''}
          </div>
          <div>
            <div>${priceStr}</div>
            <button class="btn-danger" onclick="removeCartItem(${idx})">Remove</button>
          </div>
        </div>`;
      });
      cartHtml += `</div>
        <div class="cart-summary"><strong>Total: ${formatPrice(total)}</strong></div>
        <form class="order-form" onsubmit="submitOrder(event)">
          <label>Full Name <input type="text" name="name" required></label>
          <label>Email <input type="email" name="email" required></label>
          <label>Phone <input type="tel" name="phone" required></label>
          <label>Delivery Address <input type="text" name="address" required></label>
          <button class="btn-primary" type="submit">Place Order</button>
          <p style="font-size:0.9em;margin-top:1em;">You’ll receive instructions for direct bank transfer after placing your order.</p>
        </form>
      </div>`;
    }
    document.getElementById('cart-modal').innerHTML = cartHtml;
    document.getElementById('cart-modal').classList.remove('hidden');
    document.getElementById('cart-modal').style.display = 'flex';
  });
}

function removeCartItem(idx) {
  cart.splice(idx, 1);
  closeModal();
  openCart();
  updateCartCount();
}

function submitOrder(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  let order = {
    name: data.get('name'),
    email: data.get('email'),
    phone: data.get('phone'),
    address: data.get('address'),
    cart: cart.slice(),
    time: new Date().toISOString()
  };
  // For now: just show order summary and say "order will be sent to your email" (simulate, can be improved later)
  closeModal();
  cart = [];
  updateCartCount();
  alert("Thank you for your order, " + order.name + "! We have received your request. We'll contact you with payment details by email/phone.\n\n(Order details are shown in your browser console.)");
  console.log("ORDER RECEIVED:", order);
}

function renderHome() {
  fetchProducts().then(products => {
    document.getElementById('featured-products').innerHTML =
      products.filter(p => p.featured && !p.soldOut).map(p => renderProductCard(p)).join('');
    document.getElementById('bestseller-products').innerHTML =
      products.filter(p => p.bestseller && !p.soldOut).map(p => renderProductCard(p)).join('');
    document.getElementById('new-products').innerHTML =
      products.filter(p => p.newIn && !p.soldOut).map(p => renderProductCard(p)).join('');
  });
}

function renderFootwears() {
  fetchProducts().then(products => {
    let all = products.filter(p => p.category === "footwear");
    const genderSel = document.getElementById('filter-gender');
    const typeSel = document.getElementById('filter-type');
    function filter() {
      let filtered = all.filter(p => (!genderSel.value || p.gender === genderSel.value) && (!typeSel.value || p.type === typeSel.value));
      document.getElementById('footwear-products').innerHTML = filtered.map(p => renderProductCard(p)).join('');
    }
    genderSel.onchange = typeSel.onchange = filter;
    filter();
  });
}

function renderEssentials() {
  fetchProducts().then(products => {
    let all = products.filter(p => p.category === "essential");
    const typeSel = document.getElementById('filter-type');
    function filter() {
      let filtered = all.filter(p => (!typeSel.value || p.type === typeSel.value));
      document.getElementById('essential-products').innerHTML = filtered.map(p => renderProductCard(p)).join('');
    }
    typeSel.onchange = filter;
    filter();
  });
}

// Routing: decide what to load
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  document.querySelectorAll('#cart-btn').forEach(b => b.onclick = (e) => { e.preventDefault(); openCart(); });

  if (document.getElementById('featured-products')) renderHome();
  if (document.getElementById('footwear-products')) renderFootwears();
  if (document.getElementById('essential-products')) renderEssentials();

  // Modal close on background click
  document.getElementById('cart-modal').onclick = function(e) {
    if (e.target === this) closeModal();
  };
});

// Expose for inline HTML
window.openProductModal = openProductModal;
window.closeModal = closeModal;
window.addToCart = addToCart;
window.toggleCustomizeInput = toggleCustomizeInput;
window.removeCartItem = removeCartItem;
window.submitOrder = submitOrder;
