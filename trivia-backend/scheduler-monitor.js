#!/usr/bin/env node

/**
 * Sunday Night Scheduler Monitoring System
 * 
 * This script provides monitoring, health checks, and alerting
 * for the Sunday night event scheduler system.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import { format, subDays, parseISO } from 'date-fns'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Configuration
const LOG_FILE = process.env.SCHEDULER_LOG_FILE || '/var/log/trivia-scheduler.log'
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'jtdman+tfadmin@gmail.com'
const MAX_DAYS_WITHOUT_RUN = 8 // Alert if no run in 8 days (should run weekly)

/**
 * Check scheduler health and generate report
 */
async function checkSchedulerHealth() {
  console.log('🏥 Checking Sunday Night Scheduler Health...')
  console.log('=' .repeat(50))
  
  const report = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    issues: [],
    warnings: [],
    stats: {},
    recommendations: []
  }

  try {
    // 1. Check recent system logs
    const recentLogs = await checkRecentLogs()
    report.stats.recentRuns = recentLogs
    
    // 2. Check database connectivity
    const dbHealth = await checkDatabaseHealth()
    report.stats.database = dbHealth
    
    // 3. Check event generation trends
    const eventStats = await checkEventGenerationStats()
    report.stats.events = eventStats
    
    // 4. Check cron job configuration
    const cronStatus = await checkCronJob()
    report.stats.cronJob = cronStatus
    
    // 5. Check for any issues
    await identifyIssues(report)
    
    // Generate final status
    if (report.issues.length > 0) {
      report.status = 'unhealthy'
    } else if (report.warnings.length > 0) {
      report.status = 'warning'
    }
    
    // Display report
    displayHealthReport(report)
    
    // Log to database
    await logHealthCheck(report)
    
    return report
    
  } catch (error) {
    console.error('❌ Health check failed:', error)
    report.status = 'error'
    report.issues.push(`Health check failed: ${error.message}`)
    return report
  }
}

/**
 * Check recent scheduler runs from system logs
 */
async function checkRecentLogs() {
  console.log('📋 Checking recent scheduler runs...')
  
  try {
    // Check system_logs table for recent scheduler runs
    const { data: logs, error } = await supabase
      .from('system_logs')
      .select('*')
      .eq('type', 'sunday_scheduler')
      .gte('created_at', subDays(new Date(), 14).toISOString())
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) throw error
    
    const logSummary = {
      totalRuns: logs.length,
      lastRun: logs[0]?.created_at || null,
      successfulRuns: logs.filter(log => !log.message.includes('failed')).length,
      failedRuns: logs.filter(log => log.message.includes('failed')).length,
      recentLogs: logs.map(log => ({
        date: log.created_at,
        success: !log.message.includes('failed'),
        metadata: log.metadata
      }))
    }
    
    console.log(`  ✅ Found ${logSummary.totalRuns} runs in last 14 days`)
    if (logSummary.lastRun) {
      console.log(`  📅 Last run: ${format(parseISO(logSummary.lastRun), 'yyyy-MM-dd HH:mm')}`)
    }
    
    return logSummary
    
  } catch (error) {
    console.error('❌ Error checking recent logs:', error)
    return { error: error.message, totalRuns: 0 }
  }
}

/**
 * Check database connectivity and performance
 */
async function checkDatabaseHealth() {
  console.log('🗄️  Checking database health...')
  
  try {
    const startTime = Date.now()
    
    // Test basic connectivity
    const { data: connectionTest, error: connectionError } = await supabase
      .from('events')
      .select('count', { count: 'exact', head: true })
      .limit(1)
    
    if (connectionError) throw connectionError
    
    const responseTime = Date.now() - startTime
    
    // Get table sizes
    const [events, occurrences, providers] = await Promise.all([
      supabase.from('events').select('id', { count: 'exact', head: true }),
      supabase.from('event_occurrences').select('id', { count: 'exact', head: true }),
      supabase.from('trivia_providers').select('id', { count: 'exact', head: true })
    ])
    
    const dbHealth = {
      connected: true,
      responseTime,
      tables: {
        events: events.count || 0,
        occurrences: occurrences.count || 0,
        providers: providers.count || 0
      }
    }
    
    console.log(`  ✅ Database connected (${responseTime}ms)`)
    console.log(`  📊 Tables: ${dbHealth.tables.events} events, ${dbHealth.tables.occurrences} occurrences, ${dbHealth.tables.providers} providers`)
    
    return dbHealth
    
  } catch (error) {
    console.error('❌ Database health check failed:', error)
    return { connected: false, error: error.message }
  }
}

/**
 * Check event generation statistics
 */
async function checkEventGenerationStats() {
  console.log('📅 Checking event generation statistics...')
  
  try {
    // Get recent event occurrences
    const { data: recentOccurrences, error } = await supabase
      .from('event_occurrences')
      .select('id, occurrence_date, status, created_at')
      .gte('created_at', subDays(new Date(), 7).toISOString())
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Get upcoming occurrences
    const { data: upcomingOccurrences } = await supabase
      .from('event_occurrences')
      .select('id, occurrence_date, status')
      .gte('occurrence_date', new Date().toISOString().split('T')[0])
      .order('occurrence_date')
      .limit(50)
    
    const stats = {
      recentlyCreated: recentOccurrences.length,
      upcomingEvents: upcomingOccurrences?.length || 0,
      statusBreakdown: upcomingOccurrences?.reduce((acc, occurrence) => {
        acc[occurrence.status] = (acc[occurrence.status] || 0) + 1
        return acc
      }, {}) || {}
    }
    
    console.log(`  ✅ ${stats.recentlyCreated} occurrences created in last 7 days`)
    console.log(`  📅 ${stats.upcomingEvents} upcoming events`)
    console.log(`  📊 Status: ${JSON.stringify(stats.statusBreakdown)}`)
    
    return stats
    
  } catch (error) {
    console.error('❌ Event statistics check failed:', error)
    return { error: error.message }
  }
}

/**
 * Check cron job configuration (requires shell access)
 */
async function checkCronJob() {
  console.log('⏰ Checking cron job configuration...')
  
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    const { stdout } = await execAsync('crontab -l 2>/dev/null | grep sunday-night-scheduler || echo "NOT_FOUND"')
    
    const cronConfigured = !stdout.includes('NOT_FOUND')
    const cronEntry = cronConfigured ? stdout.trim() : null
    
    console.log(`  ${cronConfigured ? '✅' : '❌'} Cron job ${cronConfigured ? 'configured' : 'not found'}`)
    if (cronEntry) {
      console.log(`  📝 Entry: ${cronEntry}`)
    }
    
    return {
      configured: cronConfigured,
      entry: cronEntry
    }
    
  } catch (error) {
    console.log('  ⚠️  Could not check cron job (requires shell access)')
    return { configured: 'unknown', error: error.message }
  }
}

/**
 * Identify issues and warnings
 */
async function identifyIssues(report) {
  const { stats } = report
  
  // Check for critical issues
  if (!stats.database?.connected) {
    report.issues.push('Database connection failed')
  }
  
  if (stats.recentRuns?.totalRuns === 0) {
    report.issues.push('No scheduler runs found in last 14 days')
  }
  
  if (stats.recentRuns?.lastRun) {
    const lastRunDate = parseISO(stats.recentRuns.lastRun)
    const daysSinceLastRun = (Date.now() - lastRunDate.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceLastRun > MAX_DAYS_WITHOUT_RUN) {
      report.issues.push(`Last run was ${Math.floor(daysSinceLastRun)} days ago (max: ${MAX_DAYS_WITHOUT_RUN})`)
    }
  }
  
  if (stats.cronJob?.configured === false) {
    report.issues.push('Cron job not configured')
  }
  
  // Check for warnings
  if (stats.database?.responseTime > 5000) {
    report.warnings.push('Database response time is slow (>5s)')
  }
  
  if (stats.recentRuns?.failedRuns > 0) {
    report.warnings.push(`${stats.recentRuns.failedRuns} failed runs in last 14 days`)
  }
  
  if (stats.events?.upcomingEvents === 0) {
    report.warnings.push('No upcoming events scheduled')
  }
  
  // Generate recommendations
  if (report.issues.length === 0 && report.warnings.length === 0) {
    report.recommendations.push('System appears healthy - continue monitoring')
  }
  
  if (stats.database?.responseTime > 2000) {
    report.recommendations.push('Consider database performance optimization')
  }
  
  if (stats.events?.statusBreakdown?.scheduled > 100) {
    report.recommendations.push('High number of unconfirmed events - follow up with providers')
  }
}

/**
 * Display health report
 */
function displayHealthReport(report) {
  console.log('\n' + '='.repeat(50))
  console.log('📊 SCHEDULER HEALTH REPORT')
  console.log('='.repeat(50))
  
  // Status
  const statusIcon = {
    'healthy': '✅',
    'warning': '⚠️',
    'unhealthy': '❌',
    'error': '💥'
  }[report.status]
  
  console.log(`\nSTATUS: ${statusIcon} ${report.status.toUpperCase()}`)
  console.log(`TIMESTAMP: ${format(parseISO(report.timestamp), 'yyyy-MM-dd HH:mm:ss')}`)
  
  // Issues
  if (report.issues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:')
    report.issues.forEach(issue => console.log(`  ❌ ${issue}`))
  }
  
  // Warnings
  if (report.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:')
    report.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`))
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:')
    report.recommendations.forEach(rec => console.log(`  💡 ${rec}`))
  }
  
  // Quick stats
  console.log('\n📈 QUICK STATS:')
  if (report.stats.recentRuns) {
    console.log(`  • Recent runs: ${report.stats.recentRuns.totalRuns}/14 days`)
    console.log(`  • Success rate: ${report.stats.recentRuns.successfulRuns}/${report.stats.recentRuns.totalRuns}`)
  }
  if (report.stats.database) {
    console.log(`  • DB response: ${report.stats.database.responseTime}ms`)
  }
  if (report.stats.events) {
    console.log(`  • Upcoming events: ${report.stats.events.upcomingEvents}`)
  }
  
  console.log('\n' + '='.repeat(50))
}

/**
 * Log health check to database
 */
async function logHealthCheck(report) {
  try {
    await supabase.from('system_logs').insert({
      type: 'scheduler_health_check',
      message: `Scheduler health check: ${report.status}`,
      metadata: {
        status: report.status,
        issues: report.issues,
        warnings: report.warnings,
        stats: report.stats
      }
    })
  } catch (error) {
    console.error('Failed to log health check to database:', error)
  }
}

/**
 * Send alert if there are critical issues
 */
async function sendAlert(report) {
  if (report.status === 'unhealthy' || report.status === 'error') {
    console.log('🚨 CRITICAL ISSUES DETECTED - ALERT NEEDED!')
    console.log('In a production environment, this would:')
    console.log(`  • Send email to ${ALERT_EMAIL}`)
    console.log('  • Log to monitoring system')
    console.log('  • Potentially trigger automated remediation')
    
    // In production, implement actual alerting here
    // - Email notifications
    // - Slack/Discord webhooks
    // - SMS alerts
    // - Integration with monitoring systems (DataDog, New Relic, etc.)
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Sunday Night Scheduler Monitor

Usage:
  node scheduler-monitor.js [options]

Options:
  --help, -h     Show this help message
  --json         Output report in JSON format
  --alert        Send alerts if issues are found
  --continuous   Run continuously (every 5 minutes)

Examples:
  node scheduler-monitor.js                    # Run health check once
  node scheduler-monitor.js --json             # Output JSON report
  node scheduler-monitor.js --alert            # Check and alert if needed
  node scheduler-monitor.js --continuous       # Monitor continuously
`)
    return
  }
  
  try {
    const report = await checkSchedulerHealth()
    
    if (args.includes('--json')) {
      console.log(JSON.stringify(report, null, 2))
    }
    
    if (args.includes('--alert')) {
      await sendAlert(report)
    }
    
    if (args.includes('--continuous')) {
      console.log('\n🔄 Running in continuous mode (checking every 5 minutes)...')
      setInterval(async () => {
        console.log('\n' + '─'.repeat(50))
        console.log(`⏰ ${new Date().toISOString()} - Running scheduled health check...`)
        const continuousReport = await checkSchedulerHealth()
        if (args.includes('--alert')) {
          await sendAlert(continuousReport)
        }
      }, 5 * 60 * 1000) // 5 minutes
    }
    
    // Exit with error code if unhealthy (useful for CI/CD)
    if (report.status === 'unhealthy' || report.status === 'error') {
      process.exit(1)
    }
    
  } catch (error) {
    console.error('💥 Monitor failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { checkSchedulerHealth, main }