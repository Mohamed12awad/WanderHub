const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  date: { type: Date, required: true },
  supplier: { type: String, required: true },
  shippingCost: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  insurance: { type: Number, default: 0 },
  otherCosts: { type: Number, default: 0 },
  landedCost: {
    type: Number,
    default: function () {
      return (
        this.price +
        this.shippingCost +
        this.tax +
        this.insurance +
        this.otherCosts
      );
    },
  },
});

const Purchase = mongoose.model("Purchase", purchaseSchema);
module.exports = Purchase;
