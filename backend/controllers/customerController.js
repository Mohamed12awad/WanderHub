const Customer = require("../models/customerModel");
const Booking = require("../models/bookingModel");
const Payment = require("../models/partialPaymentModel");

// Create a new customer
exports.createCustomer = async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all customers
// exports.getCustomers = async (req, res) => {
//   const { page = 1, limit = 10, s = {} } = req.query;
//   try {
//     const customers = await Customer.find(s)
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(parseInt(limit));

//     const count = await Customer.countDocuments();

//     res.json({
//       customers,
//       totalPages: Math.ceil(count / limit),
//       currentPage: page,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// Get a single customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate("bookingHistory")
      .populate("owner");

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a customer by ID
exports.updateCustomer = async (req, res) => {
  try {
    // console.log(req.body);
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a customer by ID
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (customer.bookingHistory.length > 0) {
      // Use Promise.all to wait for all deletions to complete
      await Promise.all(
        customer.bookingHistory.map(async (bookingId) => {
          const booking = await Booking.findById(bookingId);
          if (booking) {
            // Delete related payments
            await Payment.deleteMany({ booking: booking._id });
            // Delete the booking itself
            await Booking.findByIdAndDelete(bookingId);
          }
        })
      );
    }

    // Delete the customer itself
    await Customer.findByIdAndDelete(req.params.id);

    res
      .status(204)
      .json({ message: "Customer, related bookings, and payments deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
