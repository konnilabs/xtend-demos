'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const {loadSchemaAudit}=require('../../scripts/load-schema-audit.cjs');
// Entry-loader models only; full private dependency-closure checks belong to Core.
function fixture(t){
 const coreRoot=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'demo-audit-loader-')));
 t.after(()=>fs.rmSync(coreRoot,{recursive:true,force:true}));
 const git=args=>execFileSync('git',args,{cwd:coreRoot,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init']);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.invalid']);
 const entry=path.join(coreRoot,'tools/schema-inventory/source-audit.cjs');fs.mkdirSync(path.dirname(entry),{recursive:true});
 fs.writeFileSync(entry,"module.exports={loadSourceAudit:options=>({kind:'entry-loader-model',...options})};\n");
 git(['add','.']);git(['commit','-m','test fixture']);
 return {coreRoot,coreSha:git(['rev-parse','HEAD']),entry,git};
}
test('loads only the clean pinned audit entry and passes its exact identity',t=>{
 const f=fixture(t),result=loadSchemaAudit(f);assert.equal(result.api.kind,'entry-loader-model');assert.equal(result.api.coreRoot,f.coreRoot);assert.equal(result.api.coreSha,f.coreSha);
});
test('rejects wrong and malformed Core identities',t=>{
 const f=fixture(t);for(const coreSha of ['main','0'.repeat(40),undefined])assert.throws(()=>loadSchemaAudit({...f,coreSha}),/commit|source/);
});
test('rejects dirty or index-masked modified executable bytes',t=>{
 const f=fixture(t);fs.appendFileSync(f.entry,'// changed\n');assert.throws(()=>loadSchemaAudit(f),/clean/);
 f.git(['update-index','--assume-unchanged','tools/schema-inventory/source-audit.cjs']);assert.throws(()=>loadSchemaAudit(f),/differs from pinned/);
});
test('rejects missing entries even when the tracked status hides removal',t=>{
 const f=fixture(t);f.git(['update-index','--assume-unchanged','tools/schema-inventory/source-audit.cjs']);fs.unlinkSync(f.entry);assert.throws(()=>loadSchemaAudit(f),/lacks the independent/);
});
test('rejects symlink substitution with identical entry bytes',t=>{
 const f=fixture(t),copy=path.join(f.coreRoot,'copy.cjs');fs.copyFileSync(f.entry,copy);f.git(['update-index','--assume-unchanged','tools/schema-inventory/source-audit.cjs']);fs.unlinkSync(f.entry);fs.symlinkSync(copy,f.entry);assert.throws(()=>loadSchemaAudit(f),/symlink/);
});
