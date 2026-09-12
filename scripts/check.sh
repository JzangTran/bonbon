#!/bin/bash

cmd_check() {
  printf "%-10s | %-16s | %-12s | %-16s\n" "submodule" "current version" "last update" "new version"
  printf -- "-----------|------------------|--------------|------------------\n"

  for name in "${SUBMODULES[@]}"; do
    local branch=$(get_branch "$name")

    local current=$(git -C "$name" rev-parse --short HEAD 2>/dev/null)
    local last_update=$(git -C "$name" log -1 --format=%cd --date=format:'%d-%m-%Y' 2>/dev/null)

    git -C "$name" fetch origin "$branch" --quiet 2>/dev/null
    local newest=$(git -C "$name" rev-parse --short "origin/$branch" 2>/dev/null)

    if [ -z "$current" ] || [ -z "$newest" ]; then
      printf "%-10s | ${RED}%-16s${NC} | %-12s | %-16s\n" "$name" "read error" "-" "-"
      continue
    fi

    if [ "$current" != "$newest" ]; then
      printf "%-10s | %-16s | %-12s | ${YELLOW}%-16s${NC}\n" "$name" "$current" "$last_update" "$newest"
    else
      printf "%-10s | %-16s | %-12s | ${GREEN}%-16s${NC}\n" "$name" "$current" "$last_update" "$newest (up to date)"
    fi
  done
}