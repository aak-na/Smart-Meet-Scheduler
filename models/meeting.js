const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  mail: { type: String, required: true },
  clientName: { type: String },
  title: { type: String },
  description: { type: String },
  startDateISO: { type: String },
  endDateISO: { type: String },
  timezone: { type: String },
  uniqid: { type: String },
  meetUrl: { type: String },
  eventId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Meeting', MeetingSchema);
