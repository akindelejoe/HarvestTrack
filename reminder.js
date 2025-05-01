function shouldSendReminder(harvestDate, daysBefore = 7) {
    const today = new Date();
    const diff = new Date(harvestDate) - today;
    const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return daysLeft === daysBefore;
  }
  
  module.exports = { shouldSendReminder };
  