#!/usr/bin/env python3
"""Send a disk-pressure email once per incident; --test-email does not alter alert state."""
import argparse
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import format_datetime, formataddr, parseaddr
import json
import os
from pathlib import Path
import shutil
import smtplib
import ssl

ALERT_PERCENT = 80
RESET_PERCENT = 75
DISK_PATH = '/opt/feelandnote/web'
STATE_PATH = Path('/var/lib/feelandnote-disk-alert/state.json')


def usage_percent(disk):
    # Match df: root-reserved blocks are unavailable to the web process.
    return disk.used * 100 / (disk.used + disk.free)


def send_email(config, disk, test=False):
    percent = usage_percent(disk)
    message = EmailMessage()
    sender = config['mailFrom']
    if isinstance(sender, dict):
        sender = formataddr((sender.get('name', ''), sender['address']))
    envelope_sender = parseaddr(sender)[1]
    if not envelope_sender or '@' not in envelope_sender:
        raise ValueError('Invalid sender mailbox')
    message['From'] = sender
    message['To'] = config['to']
    message['Date'] = format_datetime(datetime.now(timezone.utc))
    message['Subject'] = (f'[Feel&Note] 디스크 {ALERT_PERCENT}% 알림 설정 테스트' if test else
                          f'[Feel&Note] 웹 서버 디스크 경고: {percent:.1f}% 사용')
    message.set_content(
        ('메일 발송 경로를 확인하는 테스트입니다. 실제 장애 알림이 아닙니다.\n\n' if test else
         '웹 서버 디스크 사용률이 경고 기준에 도달했습니다.\n\n') +
        f'서비스: https://feelandnote.com\n'
        f'점검 경로: {DISK_PATH}\n'
        f'사용률: {percent:.1f}%\n'
        f'사용 가능 여유: {disk.free / 1024**3:.2f} GiB\n'
        f'경고 기준: {ALERT_PERCENT}% 이상\n'
        f'같은 경고는 반복 발송하지 않습니다. 사용률이 {RESET_PERCENT}% 미만으로 내려가면 다시 경고할 수 있습니다.\n'
        '자동 캐시 정리는 별도로 계속 실행됩니다. 경고가 발생하면 청소 작업 실패와 디스크 증가 원인을 확인해 주세요.\n')
    smtp = config['smtp']
    context = ssl.create_default_context()
    if smtp.get('secure'):
        client = smtplib.SMTP_SSL(smtp['host'], smtp['port'], timeout=15, context=context)
    else:
        client = smtplib.SMTP(smtp['host'], smtp['port'], timeout=15)
    with client:
        if not smtp.get('secure'):
            client.ehlo()
            client.starttls(context=context)
            client.ehlo()
        client.login(smtp['auth']['user'], smtp['auth']['pass'])
        refused = client.send_message(message, from_addr=envelope_sender, to_addrs=[config['to']])
        if refused:
            raise smtplib.SMTPRecipientsRefused(refused)


def save_state(path, state):
    temporary = path.with_suffix('.tmp')
    with temporary.open('w', encoding='utf-8') as output:
        json.dump(state, output)
        output.flush()
        os.fsync(output.fileno())
    temporary.replace(path)


def check(config, disk, state_path, send=send_email):
    state = json.loads(state_path.read_text()) if state_path.exists() else {'alerted': False}
    if not isinstance(state.get('alerted'), bool):
        raise ValueError('Invalid alert state')
    percent = usage_percent(disk)
    if percent < RESET_PERCENT and state['alerted']:
        save_state(state_path, {**state, 'alerted': False})
        status = 'rearmed'
    elif percent >= ALERT_PERCENT and not state['alerted']:
        send(config, disk)
        # Do not suppress future retries when SMTP rejects or times out.
        save_state(state_path, {**state, 'alerted': True,
                               'lastSentAt': datetime.now(timezone.utc).isoformat()})
        status = 'sent'
    else:
        status = 'already-alerted' if state['alerted'] else 'below-threshold'
    return {'status': status, 'usedPercent': round(percent, 2), 'freeBytes': disk.free}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--test-email', action='store_true')
    args = parser.parse_args()
    credentials = Path(os.environ.get('CREDENTIALS_DIRECTORY', '/etc/feelandnote'))
    config = json.loads((credentials / 'disk-alert.json').read_text())
    disk = shutil.disk_usage(DISK_PATH)
    if args.test_email:
        send_email(config, disk, test=True)
        state = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {'alerted': False}
        save_state(STATE_PATH, {**state, 'lastTestSentAt': datetime.now(timezone.utc).isoformat()})
        result = {'status': 'test-sent', 'usedPercent': round(usage_percent(disk), 2)}
    else:
        result = check(config, disk, STATE_PATH)
    print(json.dumps(result), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # SMTP responses may contain provider/account details; log only the error kind/code.
        print(json.dumps({'status': 'failed', 'error': type(error).__name__,
                          'smtpCode': getattr(error, 'smtp_code', None)}), flush=True)
        raise SystemExit(1)
