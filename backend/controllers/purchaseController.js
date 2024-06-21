const Purchase = require("../models/purchaseModel");

exports.createPurchase = async (req, res) => {
  try {
    let purchase = new Purchase(req.body);
    purchase.landedCost =
      purchase.price +
      purchase.shippingCost +
      purchase.tax +
      purchase.insurance +
      purchase.otherCosts;
    await purchase.save();
    res.status(201).json(purchase);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find();
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// And so on for other CRUD operations...
