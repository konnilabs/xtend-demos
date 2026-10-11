"""Portable validation/risk tests only: no privileged execution or ownership mutation."""
import importlib.util,os,pathlib,stat,tempfile,unittest,zipfile
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('integrity',pathlib.Path(__file__).parents[1]/'scripts/electron-sandbox-integrity.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
class Integrity(unittest.TestCase):
 def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name);self.addCleanup(self.tmp.cleanup)
 def zip(self,name='fixture.zip',members=None):
  p=self.root/name
  with zipfile.ZipFile(p,'w') as z:
   for name,mode,data in members or [('chrome-sandbox',stat.S_IFREG|0o755,b'helper'),('electron',stat.S_IFREG|0o755,b'app')]:
    row=zipfile.ZipInfo(name);row.external_attr=mode<<16;z.writestr(row,data)
  return p
 def test_real_official_archive_identity_and_regular_closure(self):
  p=os.environ['XTEND_OFFICIAL_ELECTRON_ZIP'];members=v.archive(p);self.assertGreater(len(members),2);self.assertIn('chrome-sandbox',members);self.assertIn('electron',members)
 def test_actual_source_sandbox_false_mutation_blocks_provisioning(self):
  main=pathlib.Path(__file__).parents[1]/'products/xtend-llm/src/main/electron-main.mjs'
  p=self.root/'actual-main-negative.mjs';p.write_text(main.read_text().replace('sandbox: true','sandbox: false'))
  with self.assertRaisesRegex(ValueError,'disables sandbox'):v.live_policy(p)
 def test_explicit_sandboxed_product_policy_positive_control(self):
  p=self.root/'main.mjs';p.write_text('new BrowserWindow({webPreferences:{sandbox: true,nodeIntegration: false,contextIsolation: true}})');self.assertTrue(v.live_policy(p))
 def test_wrong_zip_digest_rejects(self):
  with self.assertRaisesRegex(ValueError,'checksum'):v.archive(self.zip())
 def test_path_escape_symlink_privileged_extra_duplicate_members_reject(self):
  for name,mode in [('../outside',stat.S_IFREG|0o644),('/absolute',stat.S_IFREG|0o644),('link',stat.S_IFLNK|0o777),('setuid',stat.S_IFREG|0o4755),('device',stat.S_IFCHR|0o644)]:
   p=self.zip(members=[(name,mode,b'x')])
   with patch.object(v,'ZIP_SHA',v.sha(p.read_bytes())):
    with self.assertRaises(ValueError):v.archive(p)
  p=self.zip(members=[('electron',stat.S_IFREG|0o755,b'a'),('electron',stat.S_IFREG|0o755,b'b')])
  with patch.object(v,'ZIP_SHA',v.sha(p.read_bytes())):
   with self.assertRaisesRegex(ValueError,'Duplicate'):v.archive(p)
 def test_missing_helper_rejects(self):
  p=self.zip(members=[('electron',stat.S_IFREG|0o755,b'app')])
  with patch.object(v,'ZIP_SHA',v.sha(p.read_bytes())):
   with self.assertRaisesRegex(ValueError,'missing'):v.archive(p)
 def test_nonrunner_root_foreign_arch_override_and_flags_reject(self):
  env={'GITHUB_ACTIONS':'true','RUNNER_OS':'Linux','RUNNER_ARCH':'X64'};v.context(env,1000,'linux','x86_64')
  for args in [({},1000,'linux','x86_64'),(env,0,'linux','x86_64'),(env,1000,'linux','arm64'),({**env,'ELECTRON_OVERRIDE_DIST_PATH':'/foreign'},1000,'linux','x86_64'),({**env,'CHROME_DEVEL_SANDBOX':'/foreign'},1000,'linux','x86_64'),({**env,'NODE_OPTIONS':'--no-sandbox'},1000,'linux','x86_64'),({**env,'ELECTRON_ARGS':'--disable-setuid-sandbox'},1000,'linux','x86_64')]:
   with self.assertRaises(ValueError):v.context(*args)
 def test_symlink_ancestor_rejects_before_any_write(self):
  outside=self.root/'outside';outside.mkdir();link=self.root/'link';link.symlink_to(outside,target_is_directory=True)
  with self.assertRaises(ValueError):v.ancestors(link/'new'/'dist')
  self.assertEqual(list(outside.iterdir()),[])
 def test_writable_or_nonroot_ancestor_rejects(self):
  with self.assertRaises(ValueError):v.ancestors(self.root/'new')
 def test_foreign_installation_destination_rejects(self):
  p=self.zip()
  with patch.object(v,'ZIP_SHA',v.sha(p.read_bytes())):
   with self.assertRaisesRegex(ValueError,'Foreign'):v.installed(p,self.root/'foreign')
 def test_exact_helper_mode_uid_gid_bytes_extra_suid_and_missing_member_reject(self):
  # Controlled metadata simulation is boundary evidence, never installed/runtime proof.
  p=self.zip();dist=self.root/'dist';dist.mkdir();(dist/'electron').write_bytes(b'app');(dist/'chrome-sandbox').write_bytes(b'helper')
  original=pathlib.Path.lstat
  def metadata(mode=0o4755,uid=0,gid=0,extra=False):
   def read(file):
    st=original(file);values=list(st);values[0]=stat.S_IFDIR|0o555 if file.is_dir() else stat.S_IFREG|(mode if file.name=='chrome-sandbox' else (0o4555 if extra else 0o555));values[4]=uid;values[5]=gid;return os.stat_result(values)
   return read
  with patch.object(v,'DEST',self.root),patch.object(v,'ZIP_SHA',v.sha(p.read_bytes())),patch.object(v,'ancestors'),patch.object(pathlib.Path,'lstat',metadata()):self.assertTrue(v.installed(p,dist)['rootOwned'])
  for changes in [{'mode':0o755},{'uid':1000},{'gid':1000},{'extra':True}]:
   with patch.object(v,'DEST',self.root),patch.object(v,'ZIP_SHA',v.sha(p.read_bytes())),patch.object(v,'ancestors'),patch.object(pathlib.Path,'lstat',metadata(**changes)):
    with self.assertRaises(ValueError):v.installed(p,dist)
  (dist/'chrome-sandbox').write_bytes(b'tampered')
  with patch.object(v,'DEST',self.root),patch.object(v,'ZIP_SHA',v.sha(p.read_bytes())),patch.object(v,'ancestors'),patch.object(pathlib.Path,'lstat',metadata()):
   with self.assertRaisesRegex(ValueError,'digest'):v.installed(p,dist)
  (dist/'chrome-sandbox').unlink()
  with patch.object(v,'DEST',self.root),patch.object(v,'ZIP_SHA',v.sha(p.read_bytes())),patch.object(v,'ancestors'),patch.object(pathlib.Path,'lstat',metadata()):
   with self.assertRaisesRegex(ValueError,'Missing'):v.installed(p,dist)
 def test_owned_preflight_reasons_preserve_original_failure_and_never_leak(self):
  for message,reason in v.PREFLIGHT_REASONS.items():
   with self.assertRaises(ValueError) as caught:v.check(False,message)
   self.assertEqual(str(caught.exception),message);out=[]
   v.emit_preflight_reason(caught.exception,'preflight',{'GITHUB_ACTIONS':'true'},out.append)
   self.assertEqual(out,['::error::runtime-preparation stage=checksum-preflight reason='+reason+' exit=1'])
   for mode,env in [('archive',{'GITHUB_ACTIONS':'true'}),('preflight',{})]:
    quiet=[];v.emit_preflight_reason(caught.exception,mode,env,quiet.append);self.assertEqual(quiet,[])
  secret='/private/token=SECRET\n::error file=SECRET::LEAK'
  for reason in [None,secret,'epf-archive-digest-foreign']:
   error=ValueError(secret);error._owned_preflight_reason=reason;out=[]
   v.emit_preflight_reason(error,'preflight',{'GITHUB_ACTIONS':'true'},out.append);self.assertEqual(out,[])
  error=ValueError(secret);out=[];v.emit_preflight_reason(error,'preflight',{'GITHUB_ACTIONS':'true'},out.append);self.assertEqual(out,[])
  v.emit_preflight_reason(caught.exception,'preflight',{'GITHUB_ACTIONS':'true'},lambda _:(_ for _ in ()).throw(RuntimeError(secret)))
 def test_actual_cli_context_failure_retains_exit_and_adds_only_fixed_reason(self):
  # Deliberately incomplete synthetic environment, NOT hosted-context evidence.
  import subprocess,sys
  script=pathlib.Path(__file__).parents[1]/'scripts/electron-sandbox-integrity.py'
  result=subprocess.run([sys.executable,str(script),'preflight',str(v.DEST),'unused'],env={'GITHUB_ACTIONS':'true'},capture_output=True,text=True)
  self.assertEqual(result.returncode,1);self.assertEqual(result.stdout,'')
  self.assertEqual(result.stderr,'::error::runtime-preparation stage=checksum-preflight reason=epf-runner-context exit=1\nEphemeral GitHub Linux x64 runner required\n')
if __name__=='__main__':unittest.main(verbosity=2)
