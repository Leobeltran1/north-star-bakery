/* ==========================================================
   North Star Bakery - pre-order data and browser storage
   Shared by products.html (building the list) and
   contact.html (pre-filling the form from the list).
   ========================================================== */

// Every product that can be added to a pre-order list.
// minPrice and maxPrice are the ends of the price range shown on the Products page.
const PRODUCTS = [
  { id: "sourdough", name: "Sourdough Bread", category: "Breads", minPrice: 8, maxPrice: 10 },
  { id: "multigrain", name: "Multigrain", category: "Breads", minPrice: 8, maxPrice: 11 },
  { id: "baguette", name: "French Baguette", category: "Breads", minPrice: 4, maxPrice: 5 },
  { id: "loaves-rolls", name: "Loaves and Rolls", category: "Breads", minPrice: 6, maxPrice: 9 },
  { id: "croissants", name: "Butter Croissants", category: "Pastries", minPrice: 4, maxPrice: 6 },
  { id: "cinnamon-rolls", name: "Cinnamon Rolls", category: "Pastries", minPrice: 4, maxPrice: 5 },
  { id: "danishes", name: "Seasonal Fruit Danishes", category: "Pastries", minPrice: 4, maxPrice: 6 },
  { id: "cookies", name: "Cookies", category: "Pastries", minPrice: 2, maxPrice: 4 },
  { id: "everyday-cakes", name: "Everyday Cakes", category: "Cakes", minPrice: 22, maxPrice: 30 },
  { id: "custom-cakes", name: "Custom Celebration Cakes", category: "Cakes", minPrice: 45, maxPrice: 180 },
  { id: "cupcakes", name: "Cupcakes", category: "Cakes", minPrice: 15, maxPrice: 32 }
];

const STORAGE_KEY = "northStarPreorderList";
const MAX_QUANTITY = 24;

function findProduct(productId) {
  return PRODUCTS.find(function (product) {
    return product.id === productId;
  });
}

// Keep only entries that point to a real product with a sensible quantity,
// so old or hand-edited storage can't break the page.
function isValidEntry(entry) {
  return (
    entry !== null &&
    typeof entry === "object" &&
    findProduct(entry.id) !== undefined &&
    Number.isInteger(entry.quantity) &&
    entry.quantity >= 1 &&
    entry.quantity <= MAX_QUANTITY
  );
}

// Returns an array like [{ id: "croissants", quantity: 2 }].
function loadPreorderList() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved.filter(isValidEntry) : [];
  } catch (error) {
    return [];
  }
}

function savePreorderList(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    // Storage can be blocked (for example in private browsing). The list still
    // works on this page; it just won't be remembered.
  }
}

function clearPreorderList() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Nothing to clear if storage is blocked.
  }
}

function countItems(list) {
  return list.reduce(function (total, entry) {
    return total + entry.quantity;
  }, 0);
}

function formatPriceRange(minPrice, maxPrice) {
  return "$" + minPrice + " to $" + maxPrice;
}

// Estimated total for the whole list, using the low and high end of each price range.
function estimateTotal(list) {
  return list.reduce(
    function (total, entry) {
      const product = findProduct(entry.id);
      return {
        min: total.min + product.minPrice * entry.quantity,
        max: total.max + product.maxPrice * entry.quantity
      };
    },
    { min: 0, max: 0 }
  );
}

// One line per item, for example "2 x Butter Croissants ($4 to $6 each)".
function describeList(list) {
  return list
    .map(function (entry) {
      const product = findProduct(entry.id);
      return (
        entry.quantity + " x " + product.name +
        " (" + formatPriceRange(product.minPrice, product.maxPrice) + " each)"
      );
    })
    .join("\n");
}
