#!/bin/bash

update_one() {
  local name=$1
  log_info "Updating submodule $name..."

  git submodule update --remote "$name" > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    log_fail "Failed to update submodule $name (could not fetch latest commit)"
    return 1
  fi

  git add "$name" .gitmodules

  if git diff --cached --quiet; then
    log_warn "Submodule $name is already up to date, nothing to commit"
    return 0
  fi

  git commit -m "Update $name submodule" > /dev/null 2>&1
  git push > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    log_fail "Push failed for submodule $name"
    return 1
  fi

  return 0
}

cmd_update() {
  local target=$1
  local updated=()

  if [ "$target" == "all" ]; then
    for name in "${SUBMODULES[@]}"; do
      if update_one "$name"; then
        updated+=("$name")
      fi
    done
    if [ ${#updated[@]} -gt 0 ]; then
      log_success "Updated submodules $(IFS=,; echo "${updated[*]}" | sed 's/,/, /g') at $(pwd)"
    fi
  else
    if [[ ! " ${SUBMODULES[@]} " =~ " ${target} " ]]; then
      log_fail "Submodule '$target' not found. Choose from: ${SUBMODULES[*]} or all"
      exit 1
    fi
    if update_one "$target"; then
      log_success "Updated submodule $target at $(pwd)"
    fi
  fi
}