// controllers/tripController.js
const roomPrices = require("../models/tripModel");

// Example array to simulate trips
// let trips = [
//   {
//     id: 1,
//     name: "Trip to Cairo",
//     destination: "Cairo",
//     startDate: "2024-07-01",
//     endDate: "2024-07-05",
//     price: 500,
//   },
//   {
//     id: 2,
//     name: "Luxor Adventure",
//     destination: "Luxor",
//     startDate: "2024-08-10",
//     endDate: "2024-08-15",
//     price: 800,
//   },
//   // Add more trips as needed
// ];

// Controller functions
exports.getTrips = (req, res) => {
  res.json(trips);
};

exports.getTripById = (req, res) => {
  const tripId = parseInt(req.params.id);
  const trip = trips.find((trip) => trip.id === tripId);
  if (!trip) {
    return res.status(404).json({ message: "Trip not found" });
  }
  res.json(trip);
};

exports.createTrip = (req, res) => {
  const { name, destination, startDate, endDate, price } = req.body;
  const id = trips.length + 1;
  const newTrip = { id, name, destination, startDate, endDate, price };
  trips.push(newTrip);
  res.status(201).json(newTrip);
};

exports.updateTrip = (req, res) => {
  const tripId = parseInt(req.params.id);
  const { name, destination, startDate, endDate, price } = req.body;
  let updatedTrip = trips.find((trip) => trip.id === tripId);
  if (!updatedTrip) {
    return res.status(404).json({ message: "Trip not found" });
  }
  updatedTrip.name = name;
  updatedTrip.destination = destination;
  updatedTrip.startDate = startDate;
  updatedTrip.endDate = endDate;
  updatedTrip.price = price;
  res.json(updatedTrip);
};

exports.deleteTrip = (req, res) => {
  const tripId = parseInt(req.params.id);
  trips = trips.filter((trip) => trip.id !== tripId);
  res.status(204).end();
};
