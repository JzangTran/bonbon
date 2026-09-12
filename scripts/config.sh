#!/bin/bash

SUBMODULES=("backend" "web" "mobile")

get_branch() {
  local name=$1
  local branch=$(git config -f .gitmodules --get "submodule.$name.branch")
  echo "${branch:-main}"
}