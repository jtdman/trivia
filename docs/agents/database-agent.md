# Database Agent Session Guide

This guide is for the **Database Agent** working on database schema, migrations, and queries.

## Role & Responsibilities

The Database Agent handles:
- Database schema design and changes
- Migration scripts (forward and rollback)
- Query optimization and indexing
- RLS policies and security
- Database functions and triggers
- PostGIS spatial queries

## Session Setup

```bash
# Start database agent session
claude code --session db-agent

# Work from project root
cd /path/to/trivia
```

## Issue Labels to Watch

Filter GitHub issues for:
- `database` + `agent:database`
- `schema` + `needs-review`
- `migration` + `P0/P1/P2`
- `blocks-api` (your work blocks API development)

## Pre-Work Checklist

Before starting any database work:

1. **Check Dependencies**
   - Read the full issue description
   - Identify what APIs/frontend features depend on this change
   - Ensure no conflicting schema work is in progress

2. **Review Current Schema**
   - Read `/docs/database/schema.md`
   - Check recent migrations in `/docs/database/migrations.md`
   - Understand existing relationships

3. **Plan the Change**
   - Design the schema change
   - Plan migration strategy (zero-downtime if needed)
   - Prepare rollback plan
   - Identify affected code

## Workflow

### 1. Schema Changes

For any schema change:

1. **Update Local Files First**
   ```bash
   # Update schema documentation
   # Edit docs/database/schema.md
   
   # Document the migration
   # Edit docs/database/migrations.md
   ```

2. **Create Migration**
   - Use Supabase CLI or write SQL directly
   - Include both forward and rollback scripts
   - Test locally if possible

3. **Update API Contract**
   - If schema affects API responses, update `/docs/api/endpoints.md`
   - Create issues for API agents with schema details

4. **Create Pull Request**
   - Include migration scripts
   - Update documentation
   - List all affected code/endpoints

### 2. Query Optimization

For performance improvements:

1. **Analyze Current Performance**
   - Use EXPLAIN ANALYZE
   - Check slow query logs
   - Identify bottlenecks

2. **Implement Optimization**
   - Add indexes
   - Rewrite queries
   - Add materialized views

3. **Test Performance Impact**
   - Measure before/after
   - Check query plans
   - Monitor production if available

### 3. PostGIS/Location Queries

For spatial features:

1. **Understand Requirements**
   - Distance calculations
   - Radius searches
   - Geographic boundaries

2. **Implement Spatial Queries**
   - Use proper indexes (GIST)
   - Optimize for distance calculations
   - Consider projection systems

## Common Tasks

### Adding a New Table

1. Design the table schema
2. Plan relationships and foreign keys
3. Add appropriate indexes
4. Create RLS policies
5. Add audit triggers (updated_at)
6. Update schema documentation
7. Create issues for APIs that need this data

### Adding a Column

1. Check for existing data impact
2. Plan default values
3. Consider nullable vs NOT NULL
4. Update related queries/views
5. Plan API contract changes
6. Create dependent issues

### Performance Optimization

1. Identify slow queries
2. Add indexes strategically
3. Consider partitioning for large tables
4. Create materialized views if needed
5. Update query documentation

## Integration Points

### With API Agents
- Document new endpoints needed in issues
- Provide sample queries and expected performance
- Specify data formats and relationships

### With Frontend Agents  
- Communicate data structure changes
- Provide realistic test data
- Explain performance characteristics

### With Admin Agents
- Design admin-specific tables/views
- Plan permission systems
- Consider audit/logging needs

## Testing Database Changes

### Local Testing
```bash
# Connect to local Supabase
supabase db reset

# Apply migrations
supabase db push

# Test queries
psql -h localhost -p 54322 -U postgres -d postgres
```

### Staging Testing
```bash
# Apply to staging branch
supabase db push --linked

# Run performance tests
# Verify data integrity
```

## Common Gotchas

1. **PostGIS Data Types**
   - Use GEOGRAPHY for lat/lng data
   - Remember distance functions return meters
   - Index with GIST for spatial queries

2. **RLS Policies**
   - Test policies with different user roles
   - Remember policies affect all queries
   - Consider bypass for service role

3. **Migrations**
   - Always test rollback scripts
   - Consider data size for large migrations
   - Plan for zero-downtime if needed

4. **Indexes**
   - Don't over-index
   - Consider partial indexes for filtered queries
   - Monitor index usage

## Emergency Procedures

### Production Issue
1. Create P0 issue immediately
2. Identify root cause
3. Plan hotfix or rollback
4. Coordinate with other agents
5. Test fix thoroughly
6. Document incident

### Migration Failure
1. Stop migration immediately
2. Assess data integrity
3. Execute rollback if safe
4. Document failure cause
5. Plan corrective action

## Documentation Updates

Always update these files:
- `/docs/database/schema.md` - Current schema
- `/docs/database/migrations.md` - Migration log
- `/docs/api/endpoints.md` - If API affected
- GitHub issues - Progress and blockers