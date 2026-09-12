
Setup · SH
#!/bin/bash
 
# ===== setup.sh =====
# Run this once after cloning the repo to activate the git aliases
# (git update, git check, git bonbon-help) defined in .gitconfig
 
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$DIR/.gitconfig"
 
# Make sure we are inside a git repo
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Error: this is not a git repository. Run this script inside the bonbon repo."
  exit 1
fi
 
# Make sure .gitconfig exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: .gitconfig not found at $CONFIG_FILE"
  exit 1
fi
 
# Point git's include.path to the repo's .gitconfig (absolute path for reliability)
git config --local include.path "$CONFIG_FILE"
 
if [ $? -eq 0 ]; then
  echo "Setup complete."
  echo "Try:"
  echo "  git check"
  echo "  git update backend"
  echo "  git update all"
  echo "  git bonbon-help"
else
  echo "Error: could not write to .git/config"
  exit 1
fi
 
