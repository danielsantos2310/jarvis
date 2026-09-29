import type { Action, Item, Notice, Snapshot } from '../shared/contracts.ts';
import { parseCommand } from '../core/commands.ts';
// Only included in the explicit static demo build. No fetch, storage or credentials.
let state: Snapshot | undefined;
const delivered = new Set<string>();
function workspace(): Snapshot {
  if (state) return state;
  const now = Date.now();
  const item = (kind: Item['kind'], title: string, dueAt: number | null): Item => ({ id: crypto.randomUUID(), kind, title, dueAt, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, schedule: null, createdAt: now, state: 'active' });
  state = { now, paused: false, grant: true,
    items: [item('task', 'Explore your JARVIS workspace', null), item('task', 'Plan the first room sensor', null), item('reminder', 'Take a screen break', now + 30 * 60000), item('timer', '5 minutes timer', now + 5 * 60000)],
    notices: [], automaticBackups: { state: 'off', nextAttemptAt: null }, recovery: { configured: false, deletionSync: 'not-configured', lastBackupAt: null },
    presence: { state: 'unknown', synthetic: true, expiresAt: null }, services: { core: 'ready', storage: 'ready', voice: 'not-installed', model: 'not-installed', cloud: 'disabled' }, audit: [] };
  return state;
}
function action(value: Action) {
  const s = workspace();
  if (!s.grant) throw new Error('Restore demo workspace permission in Controls.');
  if (value.type === 'item.create') {
    if (s.paused) throw new Error('Demo actions are paused. Resume them in Controls.');
    if (s.items.length >= 100) throw new Error('This preview holds up to 100 sample items. Reset the demo to start again.');
    if (value.schedule) throw new Error('Calendar recurrence is available in the local installation.');
    const title = value.title.trim(); if (!title || title.length > 160) throw new Error('Enter a title of up to 160 characters.');
    s.items.unshift({id:crypto.randomUUID(),kind:value.kind,title,dueAt:value.dueAt??null,timezone:value.timezone??'UTC',schedule:null,createdAt:Date.now(),state:'active'});
  } else if (value.type === 'notice.dismiss') s.notices = s.notices.filter(n => n.id !== value.id);
  else {
    const item = s.items.find(i=>i.id===value.id); if (!item) throw new Error('This demo item no longer exists.');
    if (value.type === 'item.delete') s.items = s.items.filter(i=>i.id!==value.id); else item.state='done';
    s.notices=s.notices.filter(n=>n.itemId!==value.id);
  }
  s.audit.unshift({action:value.type,decision:'demo',at:Date.now()});s.audit=s.audit.slice(0,8);return {ok:true};
}
export async function demoRequest(path: string, body?: unknown): Promise<unknown> {
  const s=workspace();const now=Date.now();
  if(path==='session')return {authenticated:true,setupRequired:false,csrf:'sample-preview'};
  if(path==='snapshot'){
    s.now=now;
    if(s.presence.expiresAt!==null&&s.presence.expiresAt<=now)s.presence={state:'unknown',synthetic:true,expiresAt:null};
    if(!s.paused&&s.grant)for(const item of s.items)if(item.state==='active'&&item.dueAt!==null&&item.dueAt<=now&&!delivered.has(item.id)){
      delivered.add(item.id);const notice:Notice={id:crypto.randomUUID(),itemId:item.id,title:item.title,kind:item.kind,dueAt:item.dueAt,late:now-item.dueAt>5000};s.notices.unshift(notice);
    }
    return structuredClone({...s,items:s.grant?s.items:[],notices:s.grant?s.notices:[]});
  }
  if(path==='actions')return action((body as {action:Action}).action);
  if(path==='commands'){
    const request=body as {text:string;timezone:string};
    if(/^(hello|hi|status)[!.]?$/i.test(request.text.trim()))return {reply:'This is a browser-only preview with sample data. No local core, AI model, microphone or devices are connected.'};
    const parsed=parseCommand(request.text,now,request.timezone);return 'action' in parsed?action(parsed.action):parsed;
  }
  if(path==='control'){
    const {change}=body as {change:string};
    if(change==='stop')s.paused=true;else if(change==='resume')s.paused=false;else if(change==='revoke')s.grant=false;else if(change==='grant')s.grant=true;else throw new Error('Unknown demo control.');return {ok:true};
  }
  if(path==='synthetic-presence'){
    const value=(body as {state:Snapshot['presence']['state']}).state;
    if(!['unknown','vacant','occupied'].includes(value))throw new Error('Unknown sample state.');
    s.presence={state:value,synthetic:true,expiresAt:now+30000};return {ok:true};
  }
  throw new Error('This feature requires the local JARVIS installation.');
}
