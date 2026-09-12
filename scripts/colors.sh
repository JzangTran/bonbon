#!/bin/bash

WHITE='\033[1;37m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # reset color

DATE_NOW=$(date +%d-%m-%Y)

log_info()    { echo -e "${WHITE}[$DATE_NOW] - $1${NC}"; }
log_success() { echo -e "${GREEN}[$DATE_NOW] - $1${NC}"; }
log_warn()    { echo -e "${YELLOW}[$DATE_NOW] - $1${NC}"; }
log_fail()    { echo -e "${RED}[$DATE_NOW] - $1${NC}"; }