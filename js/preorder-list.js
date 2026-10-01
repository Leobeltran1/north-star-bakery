/* ==========================================================
   North Star Bakery - pre-order list on the Products page
   Adds an "Add to pre-order list" button to each product,
   shows the running list with quantities and an estimated
   total, and saves it so it carries over to the Contact page.
   Needs preorder-store.js to load first.
   ========================================================== */

let preorderList = loadPreorderList();

const panel = document.getElementById("preorder-panel");
const itemList = document.getElementById("preorder-items");
const emptyMessage = document.getElementById("preorder-empty");
const totalMessage = document.getElementById("preorder-total");
const actions = document.getElementById("preorder-actions");
const statusMessage = document.getElementById("preorder-status");
const clearButton = document.getElementById("preorder-clear");
const summaryBar = document.getElementById("preorder-bar");
const summaryText = document.getElementById("preorder-bar-text");

/* ---------- Changing the list ---------- */

function getQuantity(productId) {
  const entry = preorderList.find(function (item) {
    return item.id === productId;
  });
  return entry ? entry.quantity : 0;
}

function setQuantity(productId, quantity) {
  const others = preorderList.filter(function (item) {
    return item.id !== productId;
  });

  if (quantity > 0) {
    const existingIndex = preorderList.findIndex(function (item) {
      return item.id === productId;
    });
    const newEntry = { id: productId, quantity: Math.min(quantity, MAX_QUANTITY) };

    // Keep the item in the same spot if it was already in the list.
    if (existingIndex === -1) {
      others.push(newEntry);
    } else {
      others.splice(existingIndex, 0, newEntry);
    }
  }

  preorderList = others;
  savePreorderList(preorderList);
  updatePage();
}

function changeQuantity(productId, change) {
  const current = getQuantity(productId);
  const product = findProduct(productId);

  if (change > 0 && current >= MAX_QUANTITY) {
    announce("You can pre-order up to " + MAX_QUANTITY + " of each item. For larger orders, mention it on the form.");
    return;
  }

  setQuantity(productId, current + change);

  const updated = getQuantity(productId);
  if (updated === 0) {
    announce(product.name + " removed from your list.");
  } else {
    announce(product.name + ": " + updated + " in your list.");
  }
}

function removeItem(productId) {
  setQuantity(productId, 0);
  announce(findProduct(productId).name + " removed from your list.");
}

function clearList() {
  preorderList = [];
  clearPreorderList();
  updatePage();
  announce("Your pre-order list is now empty.");
}

/* ---------- Showing the list ---------- */

// The status region is read aloud by screen readers. The summary bar shows the
// same message on screen, so shoppers get feedback wherever they are on the page.
function announce(message) {
  statusMessage.textContent = message;
  summaryText.textContent = message;
}

function createQuantityButton(label, action, productId, productName) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quantity-button";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.productId = productId;
  button.setAttribute(
    "aria-label",
    (action === "increase" ? "Add one more " : "Remove one ") + productName
  );
  return button;
}

function createListItem(entry) {
  const product = findProduct(entry.id);
  const item = document.createElement("li");

  const name = document.createElement("span");
  name.className = "preorder-name";
  name.textContent = product.name;

  const controls = document.createElement("span");
  controls.className = "preorder-controls";

  const quantity = document.createElement("span");
  quantity.className = "preorder-quantity";
  quantity.textContent = entry.quantity;

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "text-button";
  removeButton.textContent = "Remove";
  removeButton.dataset.action = "remove";
  removeButton.dataset.productId = entry.id;
  removeButton.setAttribute("aria-label", "Remove " + product.name + " from your list");

  controls.append(
    createQuantityButton("−", "decrease", entry.id, product.name),
    quantity,
    createQuantityButton("+", "increase", entry.id, product.name),
    removeButton
  );

  item.append(name, controls);
  return item;
}

function renderList() {
  const isEmpty = preorderList.length === 0;

  itemList.replaceChildren.apply(itemList, preorderList.map(createListItem));
  emptyMessage.hidden = !isEmpty;
  itemList.hidden = isEmpty;
  totalMessage.hidden = isEmpty;
  actions.hidden = isEmpty;

  if (!isEmpty) {
    const total = estimateTotal(preorderList);
    const count = countItems(preorderList);
    totalMessage.textContent =
      count + (count === 1 ? " item" : " items") +
      ". Estimated total: " + formatPriceRange(total.min, total.max) +
      ". We confirm the final price when we reply to your request.";
  }
}

// Each product's button shows how many are already in the list. The aria-label
// includes the product name so screen reader users know which button is which.
function renderAddButtons() {
  document.querySelectorAll(".add-button").forEach(function (button) {
    const quantity = getQuantity(button.dataset.productId);
    const productName = findProduct(button.dataset.productId).name;

    if (quantity === 0) {
      button.textContent = "Add to pre-order list";
      button.setAttribute("aria-label", "Add " + productName + " to your pre-order list");
    } else {
      button.textContent = "Add one more (" + quantity + " in list)";
      button.setAttribute("aria-label", "Add one more " + productName + ", " + quantity + " in your list");
    }
  });
}

// The bar only appears once there is something in the list.
function renderSummaryBar() {
  const hasItems = preorderList.length > 0;
  summaryBar.hidden = !hasItems;
  document.body.classList.toggle("has-preorder-bar", hasItems);
  if (hasItems && summaryText.textContent === "") {
    const count = countItems(preorderList);
    summaryText.textContent = count + (count === 1 ? " item" : " items") + " saved in your pre-order list.";
  }
}

function updatePage() {
  renderList();
  renderAddButtons();
  renderSummaryBar();
}

/* ---------- Setup ---------- */

function createAddButtons() {
  document.querySelectorAll("dt[data-product-id]").forEach(function (term) {
    const productId = term.dataset.productId;
    const product = findProduct(productId);
    const description = term.nextElementSibling;
    if (!product || !description) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "add-button";
    button.dataset.productId = productId;
    button.addEventListener("click", function () {
      changeQuantity(productId, 1);
    });

    description.append(" ", button);
  });
}

// One listener handles every +, -, and Remove button in the list.
function handleListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const productId = button.dataset.productId;
  if (button.dataset.action === "increase") {
    changeQuantity(productId, 1);
  } else if (button.dataset.action === "decrease") {
    changeQuantity(productId, -1);
  } else if (button.dataset.action === "remove") {
    removeItem(productId);
  }
}

function init() {
  if (!panel) {
    return;
  }
  panel.hidden = false;
  createAddButtons();
  itemList.addEventListener("click", handleListClick);
  clearButton.addEventListener("click", clearList);
  updatePage();
}

init();
