const { Budget } = require('../../models');

exports.createOrUpdateBudget = async (req, res) => {
  try {
    const { tripId, transport, stay, activities, meals, total, currency, startTime, endTime } = req.body;
    
    // Validate time format if provided
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (startTime && !timeRegex.test(startTime)) {
      return res.status(400).json({ error: 'Start time must be in HH:MM format (24-hour)' });
    }
    if (endTime && !timeRegex.test(endTime)) {
      return res.status(400).json({ error: 'End time must be in HH:MM format (24-hour)' });
    }
    
    let budget = await Budget.findOne({ tripId });
    if (budget) {
      budget.transport = transport;
      budget.stay = stay;
      budget.activities = activities;
      budget.meals = meals;
      if (total !== undefined) budget.total = total; // will be recalculated anyway in pre-save
      if (currency) budget.currency = currency;
      if (startTime !== undefined) budget.startTime = startTime;
      if (endTime !== undefined) budget.endTime = endTime;
      await budget.save();
    } else {
      budget = await Budget.create({ 
        tripId, 
        transport, 
        stay, 
        activities, 
        meals, 
        total, 
        currency, 
        startTime, 
        endTime,
        userId: req.user._id // Track who created this budget
      });
    }
    res.status(201).json(budget);
  } catch (err) {
    console.error('Create/update budget error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getBudgetForTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const budget = await Budget.findOne({ tripId });
    if (!budget) return res.status(404).json({ error: 'Budget not found' });
    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
