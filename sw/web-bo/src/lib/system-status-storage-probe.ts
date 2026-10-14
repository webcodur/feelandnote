// Read-only probe. Never inventory the large render cache or return SMTP credentials.
export const STORAGE_PROBE = String.raw`
printf 'StorageJson='
sudo -n python3 - <<'STORAGE_PY'
import importlib.util,json,os,re,shutil,subprocess
from datetime import datetime,timezone
from pathlib import Path

errors=[]
def command(args):
    result=subprocess.run(args,capture_output=True,text=True,timeout=4)
    if result.returncode:
        errors.append(' '.join(args[:2])+' 조회 실패')
    return result.stdout

def iso(value):
    if not value or value=='n/a': return None
    try: return datetime.strptime(value,'%a %Y-%m-%d %H:%M:%S %Z').replace(tzinfo=timezone.utc).isoformat()
    except ValueError: return None

def properties(unit):
    fields=['LoadState','ActiveState','SubState','Result','ExecMainStatus',
            'ExecMainExitTimestamp','LastTriggerUSec','NextElapseUSecRealtime']
    output=command(['systemctl','show',unit]+['-p'+field for field in fields])
    return dict(line.split('=',1) for line in output.splitlines() if '=' in line)

def task(name):
    timer=properties(name+'.timer');service=properties(name+'.service')
    next_run=iso(timer.get('NextElapseUSecRealtime'))
    if not next_run and timer.get('ActiveState')=='active':
        listing=command(['systemctl','list-timers',name+'.timer','--no-legend','--no-pager'])
        match=re.search(r'^([A-Za-z]{3} \d{4}-\d\d-\d\d \d\d:\d\d:\d\d \S+)',listing)
        if match: next_run=iso(match.group(1))
    return {'timerState':timer.get('ActiveState'), 'timerLoaded':timer.get('LoadState')=='loaded',
            'serviceState':service.get('ActiveState'), 'result':service.get('Result'),
            'exitCode':int(service['ExecMainStatus']) if service.get('ExecMainStatus','').isdigit() else None,
            'lastFinishedAt':iso(service.get('ExecMainExitTimestamp')),
            'nextRunAt':next_run}

def last_json(unit):
    records=command(['journalctl','-u',unit,'-n','40','-o','json','--no-pager'])
    for line in reversed(records.splitlines()):
        try:
            record=json.loads(line);message=json.loads(record.get('MESSAGE',''))
            if isinstance(message,dict):
                return message,datetime.fromtimestamp(int(record['__REALTIME_TIMESTAMP'])/1e6,timezone.utc).isoformat()
        except (ValueError,TypeError,KeyError): pass
    return {},None

def module(path,name):
    if not path.exists(): return None
    spec=importlib.util.spec_from_file_location(name,path)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value)
    return value

web=Path('/opt/feelandnote/web').exists()
root='/opt/feelandnote/web' if web else '/opt/feelandnote/database'
disk=shutil.disk_usage(root);fs=os.statvfs(root)
data={'disk':{'totalBytes':disk.total,'usedBytes':disk.used,'freeBytes':disk.free,
              'usedPercent':disk.used*100/(disk.used+disk.free),
              'inodeUsedPercent':round((fs.f_files-fs.f_ffree)*100/fs.f_files,2) if fs.f_files else None},
      'cleanup':None,'mail':None,'retention':{},'error':None}

if web:
    cleanup=task('feelandnote-rendercache-clean')
    record,at=last_json('feelandnote-rendercache-clean.service')
    cleanup.update({'cacheBytes':record.get('cacheBytes'),'removedBytes':record.get('removedBytes'),
                    'measuredAt':at,'status':record.get('status'),'pressure':record.get('pressure')})
    if not cleanup['lastFinishedAt']: cleanup['lastFinishedAt']=at
    prune=module(Path('/usr/local/sbin/feelandnote-prune-render-cache.py'),'prune_status')
    cleanup.update({'targetFreePercent':prune.MIN_FREE_FRACTION*100 if prune else None,
                    'maxCacheBytes':prune.MAX_CACHE_BYTES if prune else None})
    data['cleanup']=cleanup
    mail=task('feelandnote-disk-alert')
    record,at=last_json('feelandnote-disk-alert.service')
    mail.update({'status':record.get('status'),'checkedAt':at,'recipient':None,
                 'alertPercent':None,'resetPercent':None,'alerted':None,
                 'lastSentAt':None,'lastTestSentAt':None,'configPresent':False})
    config=Path('/etc/feelandnote/disk-alert.json')
    if config.exists():
        mail['recipient']=json.loads(config.read_text()).get('to')
        mail['configPresent']=True
    alert=module(Path('/usr/local/sbin/feelandnote-disk-alert.py'),'mail_status')
    if alert: mail.update({'alertPercent':alert.ALERT_PERCENT,'resetPercent':alert.RESET_PERCENT})
    state=Path('/var/lib/feelandnote-disk-alert/state.json')
    if state.exists():
        state=json.loads(state.read_text())
        for key in ('alerted','lastSentAt','lastTestSentAt'): mail[key]=state.get(key)
    else: mail['alerted']=False
    data['mail']=mail

for name,path in [('journal','/etc/systemd/journald.conf.d/99-feelandnote.conf'),
                  ('temporary','/etc/tmpfiles.d/tmp.conf'),
                  ('packages','/etc/apt/apt.conf.d/99feelandnote-cache')]:
    p=Path(path)
    if not p.exists(): continue
    text=p.read_text()
    if name=='journal':
        data['retention'][name]=dict(line.split('=',1) for line in text.splitlines() if '=' in line and not line.startswith('#'))
    elif name=='temporary':
        data['retention'][name]={parts[1]:parts[5] for parts in (line.split() for line in text.splitlines()) if len(parts)>5 and parts[0]=='d'}
    else:
        data['retention'][name]=dict(re.findall(r'APT::Periodic::([A-Za-z]+)[ ]+"([^"]+)"',text))
data['retention']['logRotation']=properties('logrotate.timer').get('ActiveState')
data['retention']['tempCleanup']=properties('systemd-tmpfiles-clean.timer').get('ActiveState')
data['error']=' · '.join(dict.fromkeys(errors)) or None
print(json.dumps(data,ensure_ascii=False))
STORAGE_PY`
