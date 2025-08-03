#!/bin/bash

# GitHub Labels Setup Script
# Run this once to create all labels for multi-agent coordination

echo "Setting up GitHub labels for multi-agent coordination..."

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Install it with: sudo apt install gh  # or brew install gh on macOS"
    echo "Then run: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"

# Area Labels (what part of the system)
gh label create "frontend" --color "0052CC" --description "End-user frontend work" --force
gh label create "admin" --color "5319E7" --description "Admin dashboard work" --force
gh label create "api" --color "FBCA04" --description "API/Backend work" --force
gh label create "database" --color "B60205" --description "Database schema/query work" --force
gh label create "infrastructure" --color "1D76DB" --description "Deployment/hosting/CI work" --force

# Type Labels (what kind of work)
gh label create "feature" --color "0E8A16" --description "New feature or enhancement" --force
gh label create "bug" --color "D93F0B" --description "Something isn't working" --force
gh label create "schema" --color "F9D0C4" --description "Database schema change" --force
gh label create "migration" --color "C5DEF5" --description "Data migration required" --force
gh label create "refactor" --color "E99695" --description "Code refactoring" --force
gh label create "performance" --color "FEF2C0" --description "Performance improvement" --force
gh label create "security" --color "D4C5F9" --description "Security issue or improvement" --force

# Status Labels (current state)
gh label create "needs-review" --color "FFD700" --description "Needs code review" --force
gh label create "needs-triage" --color "EDEDED" --description "Needs priority/assignment" --force
gh label create "in-progress" --color "008080" --description "Currently being worked on" --force
gh label create "blocked" --color "D93F0B" --description "Blocked by dependency" --force
gh label create "ready-to-merge" --color "0E8A16" --description "Approved and ready" --force

# Dependency Labels (coordination)
gh label create "blocks-api" --color "FF6B6B" --description "Blocks API implementation" --force
gh label create "blocks-frontend" --color "FF6B6B" --description "Blocks frontend work" --force
gh label create "blocks-admin" --color "FF6B6B" --description "Blocks admin work" --force
gh label create "has-dependency" --color "FFA500" --description "Depends on other work" --force

# Priority Labels
gh label create "P0" --color "B60205" --description "Critical - Drop everything" --force
gh label create "P1" --color "FF6B6B" --description "High priority" --force
gh label create "P2" --color "FFA500" --description "Medium priority" --force
gh label create "P3" --color "77DD77" --description "Low priority" --force

# Agent Labels (who should work on this)
gh label create "agent:database" --color "76448A" --description "Database agent should handle" --force
gh label create "agent:frontend" --color "2E86AB" --description "Frontend agent should handle" --force
gh label create "agent:admin" --color "F18F01" --description "Admin agent should handle" --force
gh label create "agent:any" --color "666666" --description "Any agent can handle" --force

# Special Labels
gh label create "good-first-issue" --color "7057FF" --description "Good for newcomers" --force
gh label create "epic" --color "3F51B5" --description "Large feature spanning multiple issues" --force
gh label create "hotfix" --color "FF0000" --description "Urgent production fix" --force

echo "✅ All labels created successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Go to GitHub Issues → Labels to verify they were created"
echo "2. Create your first issue using one of the templates"
echo "3. Start your first agent session: claude code --session db-agent"