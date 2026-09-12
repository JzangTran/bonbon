#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$DIR/scripts/colors.sh"
source "$DIR/scripts/config.sh"
source "$DIR/scripts/update.sh"
source "$DIR/scripts/check.sh"
source "$DIR/scripts/help.sh"

case "$1" in
  update)
    if [ -z "$2" ]; then
      log_fail "Missing argument. Usage: ./bonbon.sh update <backend|web|mobile|all>"
      exit 1
    fi
    cmd_update "$2"
    ;;
  check)
    cmd_check
    ;;
  help)
    cmd_help
    ;;
  *)
    cmd_help
    exit 1
    ;;
esac