#!/usr/bin/env bash
# Feel&Note 사용자 웹 VM(Oracle x86_64, Ubuntu 24.04 Oracle 이미지) 프로비저닝. 실행: PUB_IP=<공인IP> bash provision-web-vm.sh (VM 안에서)
# 기존 VM(168.107.58.90) 조사 결과를 재현한다. 비밀 파일(web.env, origin.key)과 인증서, 슬롯은
# 이 스크립트가 아니라 로컬 경유 scp / rsync 로 따로 넣는다. 여러 번 실행해도 안전하다.
set -euo pipefail

NODE_VER=v24.19.0
HEAP_MB=${HEAP_MB:-1280}
MEM_HIGH=${MEM_HIGH:-1700M}
MEM_MAX=${MEM_MAX:-2000M}

log() { printf '\n== %s\n' "$*"; }

log "1. 패키지"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ca-certificates curl xz-utils rsync caddy netfilter-persistent iptables-persistent
# UFW 는 쓰지 않는다. 옛 VM 조사에서 Oracle 이미지의 rules.v4 가 먼저 판정해 UFW 체인은 패킷 0건이었다.
if systemctl is-enabled ufw >/dev/null 2>&1; then sudo ufw --force disable || true; sudo systemctl disable --now ufw || true; fi

log "2. Node ${NODE_VER} tarball"
if [ ! -x /opt/node-${NODE_VER}-linux-x64/bin/node ]; then
  curl -fsSL https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-linux-x64.tar.xz | sudo tar -xJ -C /opt --no-same-owner
fi
for b in node npm npx corepack; do sudo ln -sfn /opt/node-${NODE_VER}-linux-x64/bin/$b /usr/local/bin/$b; done
/usr/local/bin/node --version

log "3. 스왑 2G + sysctl"
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile
fi
grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
sudo swapon /swapfile 2>/dev/null || true
printf 'vm.swappiness=10\nvm.vfs_cache_pressure=50\n' | sudo tee /etc/sysctl.d/99-feelandnote-memory.conf >/dev/null
sudo sysctl --system >/dev/null

log "4. 디렉터리 골격"
sudo install -d -o root -g ubuntu -m 0750 /etc/feelandnote
sudo install -d -o root -g caddy -m 0750 /etc/caddy/certs
sudo mkdir -p /opt/feelandnote/web
sudo install -d -o ubuntu -g ubuntu -m 0750 /opt/feelandnote/web/slots

log "5. Caddyfile (공인 IP 는 메타데이터에서)"
PUB_IP=${PUB_IP:-$(curl -s -H "Authorization: Bearer Oracle" http://169.254.169.254/opc/v2/vnics/ | grep -o "\"publicIp\" *: *\"[0-9.]*\"" | head -1 | grep -o "[0-9.]*$" || true)}; [ -n "$PUB_IP" ] || { echo "PUB_IP missing"; exit 1; }
echo "public ip: ${PUB_IP}"
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
(feelandnote_app) {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000 {
		header_up X-Forwarded-For {http.request.header.Cf-Connecting-Ip}
		header_up X-Real-IP {http.request.header.Cf-Connecting-Ip}
		header_down Location "^https?://(?:localhost|127[.]0[.]0[.]1|0[.]0[.]0[.]0):3000(.*)\$" "https://feelandnote.com\$1"
	}
}
feelandnote.com {
	tls /etc/caddy/certs/feelandnote-origin.crt /etc/caddy/certs/feelandnote-origin.key {
		client_auth {
			mode require_and_verify
			trusted_ca_cert_file /etc/caddy/certs/feelandnote-aop-rootca.crt
		}
	}
	import feelandnote_app
}
www.feelandnote.com {
	tls /etc/caddy/certs/feelandnote-origin.crt /etc/caddy/certs/feelandnote-origin.key {
		client_auth {
			mode require_and_verify
			trusted_ca_cert_file /etc/caddy/certs/feelandnote-aop-rootca.crt
		}
	}
	redir https://feelandnote.com{uri} permanent
}
http://${PUB_IP} {
	redir https://feelandnote.com{uri} permanent
}
EOF

log "6. 방화벽 — iptables 한 곳. 80·443 은 Cloudflare 대역만"
CF4=$(curl -fsSL https://www.cloudflare.com/ips-v4); CF6=$(curl -fsSL https://www.cloudflare.com/ips-v6)
write_rules() { # $1=family(4|6) $2=cidrs
  local f=/etc/iptables/rules.v$1 tmp; tmp=$(mktemp)
  # Oracle 이미지 기본 규칙에서 Feel&Note 줄을 제거한 뒤, REJECT 직전에 다시 넣는다
  sudo grep -v 'Feel&Note' "$f" > "$tmp"
  local ins=""
  while read -r c; do [ -n "$c" ] || continue
    ins+="-A INPUT -s $c -p tcp -m state --state NEW -m multiport --dports 80,443 -m comment --comment \"Feel&Note web via Cloudflare\" -j ACCEPT\n"
  done <<< "$2"
  awk -v ins="$ins" '/^-A INPUT( .*)? -j REJECT/ && !done { printf "%s", ins; done=1 } { print }' "$tmp" | sudo tee "$f" >/dev/null
  rm -f "$tmp"
}
write_rules 4 "$CF4"; write_rules 6 "$CF6"
sudo netfilter-persistent reload >/dev/null
(sudo iptables -S INPUT | grep -c 'Feel&Note' || true) | sed 's/^/ipv4 Feel\&Note rules: /'

log "7. systemd 유닛"
sudo tee /etc/systemd/system/feelandnote-web.service >/dev/null <<EOF
[Unit]
Description=Feel&Note web
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/feelandnote/web/current/sw/web
EnvironmentFile=/etc/feelandnote/web.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=NODE_OPTIONS=--max-old-space-size=${HEAP_MB}
ExecStart=/usr/local/bin/node server.js
Restart=always
RestartSec=5
TimeoutStopSec=15
MemoryHigh=${MEM_HIGH}
MemoryMax=${MEM_MAX}
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
sudo tee /etc/systemd/system/feelandnote-today-figure.service >/dev/null <<'EOF'
[Unit]
Description=Refresh Feel&Note today figure
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=ubuntu
Group=ubuntu
EnvironmentFile=/etc/feelandnote/web.env
ExecStart=/usr/local/sbin/feelandnote-today-figure

[Install]
WantedBy=multi-user.target
EOF
sudo tee /etc/systemd/system/feelandnote-today-figure.timer >/dev/null <<'EOF'
[Unit]
Description=Refresh Feel&Note today figure every day

[Timer]
OnCalendar=*-*-* 15:05:00 UTC
Persistent=true
AccuracySec=1min
Unit=feelandnote-today-figure.service

[Install]
WantedBy=timers.target
EOF
sudo tee /usr/local/sbin/feelandnote-today-figure >/dev/null <<'EOF'
#!/bin/sh
set -eu
[ -n "${CRON_SECRET:-}" ] || { echo "CRON_SECRET missing" >&2; exit 1; }
curl --fail --silent --show-error --max-time 600 --retry 2 \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://feelandnote.com/api/cron/today-figure -o /dev/null
EOF
sudo chmod 0755 /usr/local/sbin/feelandnote-today-figure
sudo systemctl daemon-reload
sudo systemctl enable feelandnote-web.service >/dev/null 2>&1 || true
# 타이머는 DNS 전환 뒤에 켠다(옛 VM 과 이중 실행 방지)

log "8. hostname"
sudo hostnamectl set-hostname feelandnote-web
grep -q 'feelandnote-web' /etc/hosts || echo '127.0.1.1 feelandnote-web' | sudo tee -a /etc/hosts >/dev/null

log "done. 다음: 비밀·인증서 scp → caddy validate/enable → 슬롯 rsync → 서비스 start"
