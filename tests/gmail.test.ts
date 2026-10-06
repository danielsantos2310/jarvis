import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GmailService, gmailScope } from '../src/core/gmail.ts';
import { createApp } from '../src/core/app.ts';
import { Store } from '../src/core/database.ts';
import { hashPassword } from '../src/core/security.ts';

test('Gmail uses PKCE, one-use session-bound state, read-only access, expiry and revocation', async () => {
  let now = 1000; const calls: {url:string;body:string}[] = [];
  const transport = (async (url: string | URL | Request, options: RequestInit) => {
    calls.push({url:String(url),body:String(options.body ?? '')});
    if (String(url).endsWith('/token')) return Response.json({access_token:'test-token',token_type:'Bearer',expires_in:3600,scope:gmailScope});
    if (String(url).endsWith('/revoke')) return new Response('');
    if (String(url).endsWith('/profile')) return Response.json({emailAddress:'fixture@example.test'});
    if (String(url).includes('messages?')) return Response.json({messages:[{id:'abc'}]});
    return Response.json({id:'abc',snippet:'Preview',payload:{headers:[{name:'Subject',value:'<script>inert</script>'},{name:'From',value:'Fixture sender'}],mimeType:'text/plain',body:{data:Buffer.from('Full private message').toString('base64url')}}});
  }) as typeof fetch;
  const gmail = new GmailService({clientId:'id',clientSecret:'secret'},'http://127.0.0.1:3000',()=>now,transport);
  const auth = new URL(gmail.start('session1',100000).url);
  assert.equal(auth.searchParams.get('scope'),gmailScope); assert.equal(auth.searchParams.get('access_type'),'online');
  assert.equal(auth.searchParams.get('code_challenge_method'),'S256'); assert(!auth.href.includes('secret'));
  await assert.rejects(gmail.complete('session2','code',auth.searchParams.get('state')!,new AbortController().signal),/AUTH_EXPIRED/);
  assert.equal(calls.length,0);
  await gmail.complete('session1','code',auth.searchParams.get('state')!,new AbortController().signal);
  assert(calls[0].body.includes('code_verifier=')); assert.equal(gmail.status('session1').connected,true);
  assert.deepEqual(await gmail.profile('session1',new AbortController().signal),{emailAddress:'fixture@example.test'});
  await assert.rejects(gmail.complete('session1','code',auth.searchParams.get('state')!,new AbortController().signal),/AUTH_EXPIRED/);
  const list = await gmail.inbox('session1',new AbortController().signal); assert.equal(list.messages[0].subject,'<script>inert</script>');
  assert.equal((await gmail.message('session1','abc',new AbortController().signal)).body,'Full private message');
  assert.equal((await gmail.disconnect('session1')).revoked,true); assert.equal(gmail.status('session1').connected,false);
  const second = new URL(gmail.start('session1',10000).url); now = 11000;
  gmail.prune(); await assert.rejects(gmail.complete('session1','code',second.searchParams.get('state')!,new AbortController().signal),/AUTH_EXPIRED/);
  assert.equal(gmail.status('session1').connected,false);
});

test('Gmail rejects denied scopes and oversized upstream responses', async () => {
  for (const response of [() => Response.json({access_token:'x',expires_in:100,token_type:'Bearer',scope:'wrong'}), () => new Response('x'.repeat(2000001))]) {
    const gmail = new GmailService({clientId:'id',clientSecret:'secret'},'http://127.0.0.1:3000',Date.now,(async () => response()) as typeof fetch);
    const auth = new URL(gmail.start('session',Date.now()+100000).url);
    await assert.rejects(gmail.complete('session','code',auth.searchParams.get('state')!,new AbortController().signal));
    assert.equal(gmail.status('session').connected,false);
  }
});

test('Gmail routes enforce auth, CSRF, pause and logout; tokens never reach API clients', async () => {
  const dir = mkdtempSync(join(tmpdir(),'jarvis-gmail-')); const store = new Store(join(dir,'test.sqlite'));
  const password = 'Test Gmail passphrase'; store.enroll(await hashPassword(password),Date.now());
  let hold = false; let begin: () => void = () => {};
  const transport = (async (url: string | URL | Request, options: RequestInit) => {
    if (String(url).endsWith('/token')) return Response.json({access_token:'PRIVATE_TOKEN',expires_in:3600,token_type:'Bearer',scope:gmailScope});
    if (hold) { begin(); await new Promise((_,reject) => { if (options.signal?.aborted) reject(new Error('aborted')); else options.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}); }); }
    return Response.json({messages:[]});
  }) as typeof fetch;
  const app = await createApp({store,bootstrapCode:'fixture',serveWeb:false,scheduler:false,gmail:{clientId:'id',clientSecret:'PRIVATE_SECRET'},gmailFetch:transport});
  let cookie = '', csrf = '';
  const request = (url:string,body?:unknown,extra={}) => app.inject({method:body === undefined ? 'GET':'POST',url,headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000',cookie,'x-csrf-token':csrf,...(body ? {'content-type':'application/json'}:{}),...extra},...(body ? {payload:JSON.stringify(body)}:{})});
  async function login() { cookie='';csrf=''; const response = await request('/api/login',{password});assert.equal(response.statusCode,200,response.body);cookie=String(response.headers['set-cookie']).split(';')[0];csrf=response.json().csrf; }
  async function connect() { const start = await request('/api/gmail/connect',{}); const state = new URL(start.json().url).searchParams.get('state'); const result=await request('/api/gmail/complete',{code:'fixture',state}); assert.equal(result.statusCode,200); assert(!result.body.includes('PRIVATE')); }
  try {
    assert.equal((await request('/api/gmail/status')).statusCode,401); await login();
    assert.equal((await request('/api/gmail/connect',{}, {'x-csrf-token':'wrong'})).statusCode,403);
    await connect(); assert.equal((await request('/api/gmail/status')).json().connected,true);
    assert.deepEqual((await request('/api/gmail/inbox')).json(),{messages:[]});
    assert.equal((await request('/api/gmail/messages/not-an-id')).statusCode,400);
    hold = true; const started = new Promise<void>(r=>{begin=r;}); const pending=request('/api/gmail/inbox'); void pending.then(()=>{}); await started;
    await request('/api/control',{change:'stop'}); assert.notEqual((await pending).statusCode,200);
    assert.equal((await request('/api/gmail/inbox')).statusCode,403);
    await request('/api/control',{change:'resume',password}); assert.equal((await request('/api/gmail/status')).json().connected,false);
    hold=false; await connect(); await request('/api/logout',{}); await login(); assert.equal((await request('/api/gmail/status')).json().connected,false);
    assert(!JSON.stringify(store.db.prepare('SELECT * FROM audit').all()).includes('PRIVATE'));
  } finally {await app.close();store.close();rmSync(dir,{recursive:true,force:true});}
});
