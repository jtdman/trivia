// Debug script to test the exact Supabase queries the frontend makes
// This simulates what happens in useVenues.ts

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

console.log('=== FRONTEND QUERY DEBUG ===');
console.log('Today:', todayStr);

// Test tomorrow calculation (same as useVenues.ts)
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];
console.log('Tomorrow:', tomorrowStr);

// Test this-week calculation  
const weekOut = new Date(today);
weekOut.setDate(today.getDate() + 6);
const endDate = weekOut.toISOString().split('T')[0];
console.log('This Week Range:', todayStr, 'to', endDate);

console.log('\n=== POTENTIAL ISSUES TO CHECK ===');
console.log('1. Timezone mismatch between JS and DB');
console.log('2. Date string format incompatibility');
console.log('3. React state not updating properly');  
console.log('4. Supabase client date filtering differences');

console.log('\n=== DEBUGGING STEPS ===');
console.log('1. Open browser dev tools');
console.log('2. Go to localhost:5173');
console.log('3. Enter "Franklin, TN" as location');
console.log('4. Watch console for these log messages:');
console.log('   - 🔍 useVenues fetchVenues called with options:');
console.log('   - 📅 TOMORROW filter: Using date', tomorrowStr);
console.log('   - 📊 Final date filter params:');
console.log('   - PostGIS distance query successful:');
console.log('   - Found X event occurrences for nearby venues');
console.log('5. Click Tomorrow button and see if console shows:');
console.log('   - 🟡 TOMORROW button clicked');
console.log('   - 🟡 Date filter set to: tomorrow');
console.log('   - New API calls being made');

console.log('\n=== EXPECTED RESULTS FOR FRANKLIN, TN ===');
console.log('- Today: 28 events');
console.log('- Tomorrow: 24 events'); 
console.log('- This Week: 90+ events');

console.log('\n=== NEXT STEPS IF ISSUE FOUND ===');
console.log('1. If no console logs appear → React state update bug');
console.log('2. If logs appear but 0 results → Supabase query issue');
console.log('3. If network errors → API/authentication issue');
console.log('4. If wrong date strings → timezone/calculation bug');