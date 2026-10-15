const test=require('node:test'),assert=require('node:assert/strict');
const {loadTS}=require('./support/load-ts.cjs');const p=loadTS('lib/auth/permissions.ts');
test('roles deny unlisted access and isolate finance and coaching',()=>{
 assert.equal(p.hasPermission('owner','staff.manage'),false);
 assert.equal(p.hasPermission('treinador','finance.read'),false);
 assert.equal(p.hasPermission('financeiro','students.read'),false);
 assert.equal(p.hasPermission('secretaria','staff.manage'),false);
 assert.equal(p.hasPermission('secretaria','staff.coaches.manage'),true);
 assert.equal(p.hasPermission('treinador','staff.coaches.manage'),false);
 assert.equal(p.permissionForPath('/equipe'),'staff.coaches.manage');
 assert.equal(p.hasPermission('secretaria','finance.reverse'),true);
 assert.equal(p.hasPermission('secretaria','communications.manage'),true);
 assert.equal(p.hasPermission('admin','staff.manage'),true);
 assert.equal(p.hasPermission('treinador','attendance.write'),true);
});
test('login destinations remain local and respect route boundaries',()=>{
 for(const input of ['https://example.com','//example.com','/\\example.com','/\nexample.com',null])assert.equal(p.safeNextPath(input),null);
 assert.equal(p.safeNextPath('/chamada?date=2026-10-14'),'/chamada?date=2026-10-14');
 assert.equal(p.permissionForPath('/alunos/novo'),'students.write');
 assert.equal(p.permissionForPath('/equipe-falsa'),null);
 assert.equal(p.homeForRole('financeiro'),'/financeiro');
});
test('only administrator and secretary manage enrollment plans',()=>{
 for(const role of ['admin','secretaria'])for(const permission of ['plans.read','plans.write'])assert.equal(p.hasPermission(role,permission),true);
 for(const role of ['financeiro','treinador','owner'])for(const permission of ['plans.read','plans.write'])assert.equal(p.hasPermission(role,permission),false);
 assert.equal(p.permissionForPath('/planos'),'plans.read');
 assert.equal(p.permissionForPath('/planos-falso'),null);
});
