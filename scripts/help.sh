#!/bin/bash

cmd_help() {
  echo "bonbon.sh - submodule management tool (backend, web, mobile)"
  echo ""
  echo "- check          | Compare local version against remote"
  echo "- update <name>  | Update one submodule (backend | web | mobile)"
  echo "- update all     | Update all submodules"
  echo "- help           | Show this help"
  echo ""
  echo -e "Colors: ${WHITE}white${NC}=info  ${GREEN}green${NC}=success  ${YELLOW}yellow${NC}=new version available  ${RED}red${NC}=failure"
}