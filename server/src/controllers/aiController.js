const dayjs = require('dayjs');

/**
 * Enhanced itinerary generator that processes current context
 */
exports.generateItineraryPlan = async (req, res) => {
  try {
    console.log('📥 AI Plan request body:', req.body);
    
    const {
      destination,
      startDate,
      endDate,
      suggestions = [],
      overallBudget,
      style = 'balanced',
      currentTitle,
      currentDescription,
      currentSections = [],
      startTime,
      endTime,
    } = req.body || {};

    if (!destination || !startDate || !endDate) {
      return res.status(400).json({ error: 'destination, startDate, endDate are required' });
    }

    const start = dayjs(startDate);
    const end = dayjs(endDate);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    const days = end.diff(start, 'day') + 1;
    const safeSuggestions = Array.isArray(suggestions) ? suggestions.slice(0, 12) : [];
    const basePerDay = overallBudget && overallBudget > 0 ? Math.round(overallBudget / days) : 150;

    // Style multipliers for different travel preferences
    const styleFactor = style === 'luxury' ? 1.8 : style === 'budget' ? 0.4 : 1.0;
    const adjustedPerDay = Math.round(basePerDay * styleFactor);

    console.log(`🎯 Generating ${days} day itinerary for ${destination}`);
    console.log(`💰 Budget: $${overallBudget || 'flexible'} (${adjustedPerDay}/day)`);
    console.log(`🎨 Style: ${style}, Suggestions: ${safeSuggestions.join(', ')}`);

    const sections = [];
    
    // Generate enhanced sections based on destination and suggestions
    // FIX: Generate sections with proper sequential dates within bounds
    const sectionsToGenerate = Math.min(days, 5);
    
    for (let i = 0; i < sectionsToGenerate; i++) {
      // Calculate dates for this section - distribute evenly across trip
      const totalDays = days;
      const daysPerSection = Math.max(1, Math.floor(totalDays / sectionsToGenerate));
      const remainderDays = totalDays % sectionsToGenerate;
      
      // Add extra day to first sections if there's remainder
      const extraDay = i < remainderDays ? 1 : 0;
      const startDay = i * daysPerSection + Math.min(i, remainderDays);
      const endDay = Math.min(startDay + daysPerSection + extraDay - 1, totalDays - 1);
      
      const sectionStart = start.add(startDay, 'day');
      const sectionEnd = start.add(endDay, 'day');
      
      console.log(`📅 Section ${i + 1}: days ${startDay}-${endDay}, ${sectionStart.format('YYYY-MM-DD')} to ${sectionEnd.format('YYYY-MM-DD')}`);
      
      let sectionTitle, sectionDesc;
      
      if (i === 0) {
        sectionTitle = `Day 1: Arrival in ${destination}`;
        sectionDesc = `Welcome to ${destination}! Start your adventure with:\n\n`;
        
        if (safeSuggestions.length > 0) {
          sectionDesc += `🎯 Focus Activities: ${safeSuggestions.join(' and ')}\n`;
        }
        
        sectionDesc += `• Check into your accommodation\n`;
        sectionDesc += `• Orient yourself with the local area\n`;
        
        if (safeSuggestions.includes('Food Tour') || safeSuggestions.includes('Cultural Journey')) {
          sectionDesc += `• Try local cuisine at a recommended restaurant\n`;
          sectionDesc += `• Visit a cultural landmark or museum\n`;
        } else {
          sectionDesc += `• Explore the main attractions nearby\n`;
          sectionDesc += `• Enjoy dinner at a local restaurant\n`;
        }
        
        if (startTime) {
          sectionDesc += `\n⏰ Suggested start time: ${startTime}`;
        }
        
      } else if (i === days - 1 && days > 1) {
        sectionTitle = `Day ${i + 1}: Departure from ${destination}`;
        sectionDesc = `Final day in ${destination} - make it memorable:\n\n`;
        
        if (safeSuggestions.length > 0) {
          sectionDesc += `🎯 Last-minute activities: ${safeSuggestions.join(' or ')}\n`;
        }
        
        sectionDesc += `• Pack and check out of accommodation\n`;
        sectionDesc += `• Visit any missed must-see locations\n`;
        sectionDesc += `• Purchase souvenirs or local products\n`;
        sectionDesc += `• Departure preparation\n`;
        
        if (endTime) {
          sectionDesc += `\n⏰ Suggested departure: ${endTime}`;
        }
        
      } else {
        sectionTitle = `Day ${i + 1}: ${destination} Exploration`;
        sectionDesc = `Full day of discovery in ${destination}:\n\n`;
        
        if (safeSuggestions.length > 0) {
          sectionDesc += `🎯 Today's theme: ${safeSuggestions.join(' and ')}\n`;
        }
        
        // Add activity-specific suggestions
        if (safeSuggestions.includes('Beach Paradise')) {
          sectionDesc += `• Beach activities and water sports\n• Seaside dining experiences\n`;
        }
        if (safeSuggestions.includes('Mountain Adventure')) {
          sectionDesc += `• Hiking or mountain activities\n• Scenic viewpoint visits\n`;
        }
        if (safeSuggestions.includes('City Explorer')) {
          sectionDesc += `• Urban exploration and city tours\n• Local neighborhood discovery\n`;
        }
        if (safeSuggestions.includes('Cultural Journey')) {
          sectionDesc += `• Museums and cultural sites\n• Traditional performances or workshops\n`;
        }
        if (safeSuggestions.includes('Food Tour')) {
          sectionDesc += `• Culinary experiences and food tours\n• Local market visits\n`;
        }
        if (safeSuggestions.includes('Nature Trek')) {
          sectionDesc += `• Nature walks and wildlife observation\n• Outdoor photography opportunities\n`;
        }
        
        sectionDesc += `• Rest and relaxation time\n`;
      }
      
      // Add budget and pacing information
      sectionDesc += `\n💰 Estimated cost: $${adjustedPerDay}\n`;
      sectionDesc += `🎨 Pacing: ${style === 'luxury' ? 'Leisurely with premium experiences' : style === 'budget' ? 'Efficient and cost-conscious' : 'Balanced mix of activities and rest'}`;

      sections.push({
        id: i + 1,
        title: sectionTitle,
        description: sectionDesc,
        dateRange: sectionStart.format('MMM D') + (sectionStart.isSame(sectionEnd, 'day') ? ', YYYY' : ` - ${sectionEnd.format('MMM D, YYYY')}`),
        budget: adjustedPerDay,
        allDay: true,
        startTime: null,
        endTime: null,
        // FIX: Ensure proper date format and bounds
        startDate: sectionStart.format('YYYY-MM-DD'),
        endDate: sectionEnd.format('YYYY-MM-DD'),
      });
    }

    const totalEstimated = sections.reduce((sum, s) => sum + s.budget, 0);
    
    const summary = {
      destination,
      days: sections.length,
      activitiesSampled: safeSuggestions.length,
      styleApplied: style,
      totalPlannedBudget: totalEstimated,
      budgetPerDay: adjustedPerDay,
      generatedSections: sections.length,
    };

    console.log('✅ Generated AI plan:', summary);

    res.json({ sections, summary });
  } catch (err) {
    console.error('💥 AI Planner generation error:', err);
    res.status(500).json({ error: 'Itinerary generation failed: ' + err.message });
  }
};
