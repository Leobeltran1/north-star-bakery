/* ==========================================================
   North Star Bakery - contact and pre-order form
   1. Pre-fills the form from the pre-order list saved on the
      Products page (localStorage).
   2. Validates each field with clear messages next to it and
      blocks submission until everything is fixed.
   Needs preorder-store.js to load first.
   ========================================================== */

const form = document.getElementById("preorder-form");

// How many days' notice each kind of request needs before pickup.
const LEAD_TIME_DAYS = {
  "pre-order": 2,
  "event": 2,
  "custom-cake": 7,
  "question": 0
};

const CLOSED_DAY = 1; // Monday (0 is Sunday)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- Date helpers ---------- */

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// "2026-10-03" -> a local Date. Parsing it this way avoids time zone shifts.
function parseDateInput(value) {
  const parts = value.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function toDateInputValue(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

function formatReadableDate(date) {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getLeadTime() {
  const requestType = form.elements["request-type"].value;
  return LEAD_TIME_DAYS[requestType] !== undefined ? LEAD_TIME_DAYS[requestType] : 2;
}

/* ---------- Validation rules ---------- */
// Each rule takes the field's value and returns an error message,
// or an empty string when the value is fine.

const validators = {
  name: function (value) {
    if (value === "") {
      return "Please enter your name so we know who the order is for.";
    }
    if (value.length < 2) {
      return "Your name should be at least 2 characters long.";
    }
    return "";
  },

  email: function (value) {
    if (value === "") {
      return "Please enter your email address so we can confirm your order.";
    }
    if (!EMAIL_PATTERN.test(value)) {
      return "That email address doesn't look complete. Check that it looks like name@example.com.";
    }
    return "";
  },

  "request-type": function (value) {
    return value === "" ? "Please choose what kind of request this is." : "";
  },

  "pickup-date": function (value) {
    if (value === "") {
      return "Please choose a pickup date.";
    }
    const chosen = parseDateInput(value);
    const earliest = addDays(startOfToday(), getLeadTime());

    if (chosen < earliest) {
      return "The earliest pickup date for this request is " + formatReadableDate(earliest) + ".";
    }
    if (chosen.getDay() === CLOSED_DAY) {
      return "We are closed on Mondays. Please choose another day.";
    }
    return "";
  },

  "item-details": function (value) {
    if (value === "") {
      return "Please tell us what you would like to order, or type your question.";
    }
    if (value.length < 10) {
      return "Please add a little more detail (at least 10 characters).";
    }
    if (value.length > 1000) {
      return "Please keep item details under 1,000 characters.";
    }
    return "";
  },

  "allergy-notes": function (value) {
    return value.length > 500 ? "Please keep allergy notes under 500 characters." : "";
  }
};

/* ---------- Showing and clearing errors ---------- */

// Creates (once) the error message element that sits right under a field.
function getErrorElement(field) {
  const errorId = field.id + "-error";
  let errorElement = document.getElementById(errorId);

  if (!errorElement) {
    errorElement = document.createElement("span");
    errorElement.id = errorId;
    errorElement.className = "field-error";
    field.insertAdjacentElement("afterend", errorElement);
  }
  return errorElement;
}

// Adds or removes the error id in aria-describedby without losing the hint text id.
function updateDescribedBy(field, errorId, hasError) {
  const ids = (field.getAttribute("aria-describedby") || "")
    .split(" ")
    .filter(function (id) {
      return id !== "" && id !== errorId;
    });

  if (hasError) {
    ids.unshift(errorId);
  }

  if (ids.length > 0) {
    field.setAttribute("aria-describedby", ids.join(" "));
  } else {
    field.removeAttribute("aria-describedby");
  }
}

function showError(field, message) {
  const errorElement = getErrorElement(field);
  errorElement.textContent = message;
  field.setAttribute("aria-invalid", "true");
  updateDescribedBy(field, errorElement.id, true);
}

function clearError(field) {
  const errorElement = document.getElementById(field.id + "-error");
  if (errorElement) {
    errorElement.textContent = "";
  }
  field.removeAttribute("aria-invalid");
  updateDescribedBy(field, field.id + "-error", false);
}

// Checks one field and shows or clears its message. Returns true if valid.
function validateField(field) {
  const message = validators[field.id](field.value.trim());
  if (message) {
    showError(field, message);
    return false;
  }
  clearError(field);
  return true;
}

function getValidatedFields() {
  return Object.keys(validators).map(function (id) {
    return document.getElementById(id);
  });
}

// Checks every field so all problems show at once, then returns the first bad one.
function validateForm() {
  const invalidFields = getValidatedFields().filter(function (field) {
    return !validateField(field);
  });
  return invalidFields[0] || null;
}

/* ---------- Pre-filling from the saved pre-order list ---------- */

function prefillFromPreorderList() {
  const list = loadPreorderList();
  const details = form.elements["item-details"];
  const requestType = form.elements["request-type"];

  if (list.length === 0 || details.value.trim() !== "") {
    return;
  }

  details.value = describeList(list);
  if (requestType.value === "") {
    requestType.value = "pre-order";
  }

  const total = estimateTotal(list);
  const count = countItems(list);
  const note = document.createElement("p");
  note.className = "form-note";
  note.textContent =
    "We added the " + count + (count === 1 ? " item" : " items") +
    " from your pre-order list to Item details " +
    "(estimated " + formatPriceRange(total.min, total.max) + "). You can edit them before sending.";
  form.insertAdjacentElement("beforebegin", note);
}

/* ---------- Pickup date limits ---------- */

// Keeps the date picker's earliest selectable day in step with the request type.
function updateEarliestPickupDate() {
  const earliest = addDays(startOfToday(), getLeadTime());
  form.elements["pickup-date"].min = toDateInputValue(earliest);
}

/* ---------- Submitting ---------- */

function showConfirmation(name, email) {
  const confirmation = document.createElement("div");
  confirmation.className = "form-success";
  confirmation.setAttribute("role", "status");
  confirmation.tabIndex = -1;

  const heading = document.createElement("h3");
  heading.textContent = "Thank you, " + name + "!";

  const message = document.createElement("p");
  message.textContent =
    "We received your request and will reply to " + email +
    " within one business day to confirm the details.";

  confirmation.append(heading, message);
  form.replaceWith(confirmation);

  const note = document.querySelector(".form-note");
  if (note) {
    note.remove();
  }
  confirmation.focus();
}

function handleSubmit(event) {
  event.preventDefault();

  const firstInvalidField = validateForm();
  if (firstInvalidField) {
    firstInvalidField.focus();
    return;
  }

  // This site has no server yet, so we confirm on the page instead of sending.
  // The saved list is cleared because the order has been placed.
  clearPreorderList();
  showConfirmation(form.elements["name"].value.trim(), form.elements["email"].value.trim());
}

/* ---------- Live feedback while correcting ---------- */

// Check a field when the user leaves it, but only once they have typed something,
// so they aren't warned about fields they haven't reached yet.
function handleBlur(event) {
  const field = event.target;
  if (validators[field.id] && field.value.trim() !== "") {
    validateField(field);
  }
}

// Once a field is showing an error, re-check it as the user types so the
// message disappears as soon as the problem is fixed.
function handleInput(event) {
  const field = event.target;
  if (validators[field.id] && field.getAttribute("aria-invalid") === "true") {
    validateField(field);
  }
}

function handleRequestTypeChange() {
  updateEarliestPickupDate();
  const dateField = form.elements["pickup-date"];
  if (dateField.value !== "") {
    validateField(dateField);
  }
}

/* ---------- Setup ---------- */

function init() {
  if (!form) {
    return;
  }

  // Turn off the browser's pop-up messages; our messages appear next to each field.
  // Without JavaScript, the HTML required/type/minlength attributes still work.
  form.noValidate = true;

  prefillFromPreorderList();
  updateEarliestPickupDate();

  form.addEventListener("submit", handleSubmit);
  form.addEventListener("focusout", handleBlur);
  form.addEventListener("input", handleInput);
  form.elements["request-type"].addEventListener("change", handleRequestTypeChange);
}

init();
