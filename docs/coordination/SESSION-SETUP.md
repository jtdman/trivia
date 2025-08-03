# Agent Session Setup Guide

Quick reference for setting up Claude Code sessions for multi-agent development.

## Session Commands

### Database Agent
```bash
# Start database agent session
claude code --session db-agent

# Navigate to project root  
cd /path/to/trivia

# Common workflow
# 1. Check current schema: docs/database/schema.md
# 2. Review migration log: docs/database/migrations.md  
# 3. Work on database issues labeled: database, schema, migration
```

### Frontend Agent
```bash
# Start frontend agent session
claude code --session frontend-agent

# Navigate to frontend directory
cd /path/to/trivia/trivia-nearby

# Start development server
pnpm dev

# Common workflow
# 1. Check API documentation: docs/api/endpoints.md
# 2. Work on issues labeled: frontend, feature, bug (frontend)
# 3. Test mobile responsiveness and dark theme
```

### Admin Agent  
```bash
# Start admin agent session
claude code --session admin-agent

# Navigate to frontend directory (shared codebase)
cd /path/to/trivia/trivia-nearby

# Start development server
pnpm dev

# Common workflow
# 1. Check API documentation: docs/api/endpoints.md
# 2. Work on issues labeled: admin, feature
# 3. Test with different admin permissions
```

## Session Context Files

Each agent should read these files at session start:

### All Agents
- `/CLAUDE.md` - Project instructions and context
- `/docs/coordination/README.md` - Coordination overview
- `/docs/coordination/WORKFLOW.md` - Detailed workflow

### Database Agent
- `/docs/database/schema.md` - Current database schema
- `/docs/database/migrations.md` - Migration history
- `/docs/agents/database-agent.md` - Database agent guide

### Frontend Agent
- `/docs/api/endpoints.md` - API contract documentation
- `/docs/agents/frontend-agent.md` - Frontend agent guide
- `/trivia-nearby/package.json` - Dependencies and scripts

### Admin Agent
- `/docs/api/endpoints.md` - API contract documentation  
- `/docs/agents/admin-agent.md` - Admin agent guide
- `/trivia-nearby/package.json` - Dependencies and scripts

## GitHub Integration

### Issue Filtering

Each agent should filter GitHub issues by their labels:

**Database Agent**:
```
is:issue is:open label:database
is:issue is:open label:schema  
is:issue is:open label:migration
is:issue is:open label:"agent:database"
```

**Frontend Agent**:
```
is:issue is:open label:frontend
is:issue is:open label:"agent:frontend"
is:issue is:open label:feature label:frontend
is:issue is:open label:bug label:frontend
```

**Admin Agent**:
```
is:issue is:open label:admin
is:issue is:open label:"agent:admin" 
is:issue is:open label:feature label:admin
is:issue is:open label:bug label:admin
```

### Creating Issues

Use these templates based on work type:
- **Database Change** - Schema, migrations, queries
- **Frontend Feature** - End-user features
- **Admin Dashboard Feature** - Admin functionality
- **API Endpoint** - Backend API work
- **Bug Report** - Issues in any area

## Environment Setup

### First Time Setup (Any Computer)
```bash
# Clone repository
git clone <your-repo-url>
cd trivia

# Install frontend dependencies
cd trivia-nearby
pnpm install

# Verify setup
pnpm dev # Should start development server
```

### Development Workflow
```bash
# 1. Start Claude Code session
claude code --session <agent-name>

# 2. Check for assigned issues
# Visit GitHub issues or use CLI: gh issue list --assignee @me

# 3. Create or checkout branch  
git checkout -b db/add-user-preferences-123
# or
git checkout existing-branch

# 4. Read relevant documentation
# Check docs/ directory for latest contracts

# 5. Implement and test changes

# 6. Update documentation if needed

# 7. Create pull request
# 8. Update GitHub issue with progress
```

## Agent Handoff Protocol

### Completing Work
```bash
# 1. Commit all changes
git add .
git commit -m "Complete user preferences database schema

- Add user_preferences table
- Add notification settings columns  
- Update schema documentation
- Create migration scripts

Closes #123"

# 2. Push branch
git push origin db/add-user-preferences-123

# 3. Update issue
# Add comment: "✅ Database schema completed. API endpoint can now be implemented. See updated docs/database/schema.md"

# 4. Tag next agent if known
# "Ready for @agent:api implementation"
```

### Picking Up Work
```bash
# 1. Check issue dependencies
# Read issue description for "Depends on" section

# 2. Verify dependencies are completed
# Check linked issues are closed

# 3. Pull latest changes
git checkout main
git pull origin main

# 4. Create new branch or checkout existing
git checkout -b frontend/user-preferences-ui-124

# 5. Read updated documentation
# Check docs/api/endpoints.md for new API contracts

# 6. Start implementation
```

## Common Session Workflows

### Database Agent Session
```bash
claude code --session db-agent
cd /path/to/trivia

# Typical workflow:
# 1. Check pending schema issues
# 2. Review current schema docs
# 3. Plan migration strategy
# 4. Implement database changes
# 5. Update documentation
# 6. Test migrations
# 7. Create API issues for new endpoints needed
```

### Frontend Agent Session  
```bash
claude code --session frontend-agent
cd /path/to/trivia/trivia-nearby
pnpm dev

# Typical workflow:
# 1. Check API documentation for available endpoints
# 2. Create/update React components
# 3. Implement API integration
# 4. Test mobile responsiveness
# 5. Test dark/light theme
# 6. Write/update tests
```

### Admin Agent Session
```bash
claude code --session admin-agent  
cd /path/to/trivia/trivia-nearby
pnpm dev

# Typical workflow:
# 1. Check admin API endpoints
# 2. Implement admin UI components
# 3. Add permission checks
# 4. Test with different admin roles
# 5. Implement data management features
# 6. Test bulk operations
```

## Session Troubleshooting

### Can't Find Recent Changes
```bash
# Pull latest from main
git checkout main
git pull origin main

# Check if documentation is updated
git log --oneline docs/

# Switch back to your branch and rebase
git checkout your-branch
git rebase main
```

### API Integration Issues
```bash
# Check if API documentation is current
git log docs/api/endpoints.md

# Test API endpoints directly
curl -X GET "http://localhost:3000/api/events/nearby?lat=36.1627&lng=-86.7816"

# Check if backend is running
# Verify Supabase connection
```

### Database Connection Issues
```bash
# Check Supabase status
supabase status

# Reset local database if needed
supabase db reset

# Check connection settings
cat supabase/config.toml
```

### Documentation Out of Sync
```bash
# Check when docs were last updated
git log --oneline docs/

# Look for recent database changes
git log --oneline docs/database/

# Check API changes
git log --oneline docs/api/
```

## Quick Reference

### File Locations
- **Project instructions**: `/CLAUDE.md`
- **API contracts**: `/docs/api/endpoints.md`
- **Database schema**: `/docs/database/schema.md`
- **Migration log**: `/docs/database/migrations.md`
- **Agent guides**: `/docs/agents/*.md`
- **Coordination**: `/docs/coordination/*.md`

### Key Commands
```bash
# Session management
claude code --session <agent-name>

# Development
pnpm dev          # Start frontend dev server
pnpm build        # Build frontend
pnpm lint         # Lint code

# Git workflow
git checkout -b area/description-issue#
git add .
git commit -m "Descriptive message"
git push origin branch-name

# Issue management
gh issue list --assignee @me
gh issue view 123
gh pr create --title "Title" --body "Description"
```

### Emergency Contacts
- **Production Issues**: Create P0 issue immediately
- **Merge Conflicts**: Coordinate in relevant GitHub issue
- **API Problems**: Check `/docs/api/endpoints.md` first
- **Database Issues**: Check `/docs/database/schema.md` first