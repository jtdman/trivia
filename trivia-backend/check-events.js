#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkEventStatus() {
  console.log('📊 CURRENT EVENT GENERATION STATUS\n');
  
  try {
    // Check total events and occurrences
    const { data: events } = await supabase
      .from('events')
      .select('id, provider_id, event_type, day_of_week, trivia_providers(name)');
    
    const { data: occurrences } = await supabase
      .from('event_occurrences')
      .select('id, occurrence_date, status, event_id, events(trivia_providers(name))');
    
    console.log(`📅 Total events in database: ${events?.length || 0}`);
    console.log(`🔄 Total occurrences generated: ${occurrences?.length || 0}\n`);
    
    // Group by provider
    const providerStats = {};
    events?.forEach(event => {
      const providerName = event.trivia_providers?.name || 'Unknown';
      if (!providerStats[providerName]) {
        providerStats[providerName] = { events: 0, occurrences: 0 };
      }
      providerStats[providerName].events++;
    });
    
    occurrences?.forEach(occ => {
      const providerName = occ.events?.trivia_providers?.name || 'Unknown';
      if (providerStats[providerName]) {
        providerStats[providerName].occurrences++;
      }
    });
    
    console.log('🏢 BREAKDOWN BY PROVIDER:');
    Object.entries(providerStats).forEach(([name, stats]) => {
      console.log(`   ${name}: ${stats.events} events → ${stats.occurrences} occurrences`);
    });
    
    // Check recent occurrences
    const { data: recentOccurrences } = await supabase
      .from('event_occurrences')
      .select('occurrence_date, status, events(event_type, trivia_providers(name))')
      .gte('occurrence_date', new Date().toISOString().split('T')[0])
      .order('occurrence_date')
      .limit(10);
      
    console.log('\n📋 UPCOMING OCCURRENCES (next 10):');
    recentOccurrences?.forEach(occ => {
      const providerName = occ.events?.trivia_providers?.name || 'Unknown';
      console.log(`   ${occ.occurrence_date} - ${occ.events?.event_type} (${providerName}) - ${occ.status}`);
    });
    
    // Check for this week's generation
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
    
    const { data: thisWeekOccurrences } = await supabase
      .from('event_occurrences')
      .select('id')
      .gte('occurrence_date', startOfWeek.toISOString().split('T')[0])
      .lt('occurrence_date', new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    console.log('\n🤖 GENERATION STATUS:');
    console.log(`- This week's occurrences: ${thisWeekOccurrences?.length || 0}`);
    console.log('- Weekly generation job: Should run every Sunday');
    console.log('- Brain Blast fix: Ran manually to add missing occurrences');
    
  } catch (error) {
    console.error('Error checking events:', error);
  }
}

checkEventStatus();