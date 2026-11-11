#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 VPS for the bonbon demo. Run as root:
#   curl -fsSL https://raw.githubusercontent.com/JzangTran/bonbon/main/deploy/vps/bootstrap.sh | bash
# Installs Docker, adds 2 GB of swap, opens only SSH/HTTP/HTTPS, and creates the `deploy` user that GitHub Actions logs in as.
set -euo pipefail

apt-get update -y
apt-get install -y ca-certificates curl ufw

# Docker from Docker's own repository
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# 2 GB of swap, for the moments the JVM and Postgres peak together
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swappiness.conf
fi

# only SSH, HTTP and HTTPS from outside
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# the user GitHub Actions deploys as: may use Docker, owns /opt/bonbon
id deploy >/dev/null 2>&1 || adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -o deploy -g deploy -m 750 /opt/bonbon
curl -fsSL https://raw.githubusercontent.com/JzangTran/bonbon/main/deploy/vps/deploy.sh -o /opt/bonbon/deploy.sh
chown deploy:deploy /opt/bonbon/deploy.sh && chmod 750 /opt/bonbon/deploy.sh
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh

echo
echo "Done. Next: put /opt/bonbon/.env.prod in place (deploy/.env.demo.example), then add the GitHub Actions key to"
echo "/home/deploy/.ssh/authorized_keys as described in deploy/README.md."
