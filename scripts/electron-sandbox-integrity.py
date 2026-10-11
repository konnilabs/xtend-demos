#!/usr/bin/env python3
"""Bounded official Electron closure validation; this module never elevates privileges."""
import hashlib,json,os,pathlib,stat,sys,zipfile
VERSION='42.10.0'
ZIP_SHA='edcfae0a8cf2a75ceee8a9842a0117521283164708b193495f4cb60ab2d6aa0d'
DEST=pathlib.Path('/opt/xtend-electron')/VERSION/ZIP_SHA

PREFLIGHT_REASONS={'Ephemeral GitHub Linux x64 runner required': 'epf-runner-context', 'Application must remain non-root Linux x64': 'epf-app-context', 'Unreviewed sandbox/runtime override rejected': 'epf-runtime-override', 'Sandbox-disabling option rejected': 'epf-sandbox-option', 'Missing immutable destination ancestor': 'epf-ancestor-missing', 'Symlink/non-directory destination ancestor': 'epf-ancestor-type', 'Destination ancestor not root-owned immutable': 'epf-ancestor-owner-mode', 'Foreign destination': 'epf-destination-identity', 'Destination must be new': 'epf-destination-existing', 'Official ZIP checksum mismatch': 'epf-archive-digest', 'Unsafe official archive member': 'epf-archive-path', 'Archive links/special members rejected': 'epf-archive-type', 'Archive privileged mode rejected': 'epf-archive-mode', 'Duplicate archive member': 'epf-archive-duplicate', 'Official helper/executable missing': 'epf-archive-required'}

ANCESTOR_POSITIONS=('root','opt','installation-parent','version-parent','destination')
ANCESTOR_INVARIANTS=('root-uid','root-gid','writable-mode')

def emit_preflight_reason(error,mode,env=None,write=None):
    # Only validator-owned fixed codes; never emit message/path/stdout/stderr.
    try:
        if mode!='preflight' or (os.environ if env is None else env).get('GITHUB_ACTIONS')!='true':return
        reason=getattr(error,'_owned_preflight_reason',None)
        if reason not in PREFLIGHT_REASONS.values():return
        detail=''
        position=getattr(error,'_owned_ancestor_position',None);invariant=getattr(error,'_owned_ancestor_invariant',None)
        if reason=='epf-ancestor-owner-mode' and position in ANCESTOR_POSITIONS and invariant in ANCESTOR_INVARIANTS:
            detail=' position='+position+' invariant='+invariant
        line='::error::runtime-preparation stage=checksum-preflight reason='+reason+detail+' exit=1'
        (write or (lambda value:print(value,file=sys.stderr)))(line)
    except Exception:pass # Observability cannot replace the original blocking failure.

def check(value,message):
    if not value:
        error=ValueError(message)
        error._owned_preflight_reason=PREFLIGHT_REASONS.get(message)
        raise error
def sha(data):return hashlib.sha256(data).hexdigest()
def archive(zip_path):
    data=pathlib.Path(zip_path).read_bytes();check(sha(data)==ZIP_SHA,'Official ZIP checksum mismatch')
    members={}
    with zipfile.ZipFile(zip_path) as z:
        for item in z.infolist():
            p=pathlib.PurePosixPath(item.filename)
            check(item.filename and not p.is_absolute() and '..' not in p.parts and '\\' not in item.filename and p.as_posix()==item.filename.rstrip('/'),'Unsafe official archive member')
            mode=item.external_attr>>16
            check(not stat.S_ISLNK(mode) and (not stat.S_IFMT(mode) or stat.S_ISREG(mode) or stat.S_ISDIR(mode)),'Archive links/special members rejected')
            check(not mode&0o6000,'Archive privileged mode rejected')
            if item.is_dir():continue
            check(item.filename not in members,'Duplicate archive member')
            b=z.read(item);members[item.filename]={'sha256':sha(b),'bytes':len(b),'executable':bool(mode&0o111)}
    check('chrome-sandbox' in members and 'electron' in members,'Official helper/executable missing')
    return members

def ancestors(destination,require_existing=False):
    p=pathlib.Path(destination)
    for index,current in enumerate([*reversed(p.parents),p]):
        if not current.exists() and not current.is_symlink():
            check(not require_existing,'Missing immutable destination ancestor');continue
        st=current.lstat();check(stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode),'Symlink/non-directory destination ancestor')
        try:
            check(st.st_uid==0 and st.st_gid==0 and not st.st_mode&0o022,'Destination ancestor not root-owned immutable')
        except ValueError as error:
            # Positions refer only to the fixed configured destination ancestry.
            if p==DEST and index<len(ANCESTOR_POSITIONS):
                error._owned_ancestor_position=ANCESTOR_POSITIONS[index]
                error._owned_ancestor_invariant='root-uid' if st.st_uid!=0 else ('root-gid' if st.st_gid!=0 else 'writable-mode')
            raise

def context(env,uid,platform,arch):
    check(env.get('GITHUB_ACTIONS')=='true' and env.get('RUNNER_OS')=='Linux' and env.get('RUNNER_ARCH')=='X64','Ephemeral GitHub Linux x64 runner required')
    check(uid!=0 and platform=='linux' and arch=='x86_64','Application must remain non-root Linux x64')
    check(not env.get('ELECTRON_OVERRIDE_DIST_PATH') and not env.get('CHROME_DEVEL_SANDBOX'),'Unreviewed sandbox/runtime override rejected')
    for key in ['ELECTRON_ARGS','NODE_OPTIONS']:
        check(not any(flag in env.get(key,'') for flag in ['--no-sandbox','--disable-setuid-sandbox']),'Sandbox-disabling option rejected')

def live_policy(main_path):
    import re
    source=pathlib.Path(main_path).read_text()
    check(not re.search(r'\bsandbox\s*:\s*false\b',source),'Actual product BrowserWindow renderer disables sandbox')
    check(re.search(r'\bsandbox\s*:\s*true\b',source),'Explicit live product renderer sandbox required')
    return True

def installed(zip_path,dist,armed=True):
    members=archive(zip_path);dist=pathlib.Path(dist)
    check(dist==DEST/'dist','Foreign installation destination')
    ancestors(dist,True)
    actual=set()
    for p in dist.rglob('*'):
        st=p.lstat();check(not stat.S_ISLNK(st.st_mode),'Installed closure symlink rejected')
        name=p.relative_to(dist).as_posix();allowed_owner_write=armed and name=='chrome-sandbox'
        check(st.st_uid==0 and st.st_gid==0 and not st.st_mode&0o022 and (allowed_owner_write or not st.st_mode&0o200),'Installed closure writable/non-root')
        if p.is_dir():check(not st.st_mode&0o6000,'Privileged directory mode');continue
        check(p.is_file(),'Installed special member');name=p.relative_to(dist).as_posix();actual.add(name)
        check(name in members and sha(p.read_bytes())==members[name]['sha256'],'Installed member digest mismatch')
        expected=0o4755 if armed and name=='chrome-sandbox' else (0o555 if members[name]['executable'] else 0o444)
        check(stat.S_IMODE(st.st_mode)==expected,'Exact installed member mode mismatch: '+name)
    check(actual==set(members),'Missing/extra installed members')
    return {'schema':'xtend.electron-sandbox-provisioning.v1','version':VERSION,'zipSha256':ZIP_SHA,'dist':str(dist),'helperSha256':members['chrome-sandbox']['sha256'],'electronSha256':members['electron']['sha256'],'helperMode':'04755' if armed else '0555','rootOwned':True,'applicationUid':os.getuid(),'sandboxEnabled':True,'memberCount':len(members)}

if __name__=='__main__':
    try:
        mode=sys.argv[1]
        if mode=='live-policy':print(json.dumps({'livePolicyVerified':live_policy(sys.argv[2])}))
        elif mode=='archive':print(json.dumps(archive(sys.argv[2]),sort_keys=True))
        elif mode=='preflight':
            import platform
            context(os.environ,os.getuid(),sys.platform,platform.machine());check(pathlib.Path(sys.argv[2])==DEST,'Foreign destination');ancestors(DEST);check(not DEST.exists() and not DEST.is_symlink(),'Destination must be new');archive(sys.argv[3]);print('preflight passed')
        elif mode=='copied':
            check(pathlib.Path(sys.argv[2])==DEST/'distribution.zip','Foreign copied ZIP');ancestors(DEST,True);st=pathlib.Path(sys.argv[2]).lstat();check(stat.S_ISREG(st.st_mode) and st.st_uid==0 and st.st_gid==0 and stat.S_IMODE(st.st_mode)==0o444,'Copied ZIP not immutable root-owned');archive(sys.argv[2]);print('immutable copied ZIP passed')
        elif mode in ('installed-unarmed','installed'):print(json.dumps(installed(sys.argv[2],sys.argv[3],mode=='installed'),sort_keys=True))
        else:raise ValueError('Unknown validation mode')
    except Exception as error:emit_preflight_reason(error,locals().get('mode'));print(str(error),file=sys.stderr);sys.exit(1)
