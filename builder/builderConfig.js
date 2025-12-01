const path = require("path");
const fs = require("fs");

const sizesPath = path.join(__dirname, "sizes.json");
const toppingsPath = path.join(__dirname, "toppings.json");

function loadJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function getSizes() {
  return loadJson(sizesPath);
}

function getToppings() {
  return loadJson(toppingsPath);
}

function getToppingsByCategory() {
  const toppings = getToppings();
  const grouped = {};

  toppings.forEach((t) => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });

  return grouped;
}

function getSizeById(id) {
  const sizes = getSizes();
  return sizes.find((s) => s.id === id) || null;
}

function getToppingById(id) {
  const toppings = getToppings();
  return toppings.find((t) => t.id === id) || null;
}

module.exports = {
  getSizes,
  getToppings,
  getToppingsByCategory,
  getSizeById,
  getToppingById
};
