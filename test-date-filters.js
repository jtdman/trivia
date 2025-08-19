// Quick test script to debug date filter logic
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

console.log('=== DATE FILTER DEBUG TEST ===');
console.log('Today:', todayStr, '(', today.toDateString(), ')');

// Test Tomorrow calculation
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];
console.log('Tomorrow:', tomorrowStr, '(', tomorrow.toDateString(), ')');

// Test This Week calculation  
const weekOut = new Date(today);
weekOut.setDate(today.getDate() + 6); // Today + 6 more days = 7 days total
const endDate = weekOut.toISOString().split('T')[0];
console.log('This Week Range:', todayStr, 'to', endDate);
console.log('This Week Start:', today.toDateString());
console.log('This Week End:', weekOut.toDateString());

// Test the exact date strings that would be used in the SQL query
console.log('\n=== SQL QUERY DATE STRINGS ===');
console.log('TODAY filter: occurrence_date =', todayStr);
console.log('TOMORROW filter: occurrence_date =', tomorrowStr);
console.log('THIS-WEEK filter: occurrence_date >=', todayStr, 'AND occurrence_date <=', endDate);