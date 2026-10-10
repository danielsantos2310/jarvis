import {test,expect} from '@playwright/test';
import {openTool} from './spatial-helpers.ts';

test('preview asks consent, gives local replies, detects a clap and releases capture',async({page})=>{
  const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const events=new EventTarget();
    const f={starts:0,aborts:0,micCalls:0,spoken:[] as string[],speech:null as any,recognition:null as any,tracks:[] as MediaStreamTrack[],loud:false};
    (window as any).conversationFixture=f;
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class{text:string;constructor(text:string){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'Test local',voiceURI:'test',lang:'en-GB',localService:true}],speak:(u:any)=>{f.spoken.push(u.text);f.speech=u;u.onstart?.();},cancel:()=>{},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)}});
    Object.defineProperty(window,'SpeechRecognition',{value:class{
      onresult:any;onerror:any;onend:any;onstart:any;
      start(){f.starts++;f.recognition=this;this.onstart?.();}abort(){f.aborts++;}
    }});
    const original=AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser=function(){const analyser=original.call(this);analyser.getByteTimeDomainData=(data:Uint8Array)=>{data.fill(f.loud?224:128);};return analyser;};
    Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
      f.micCalls++;const context=new AudioContext(),source=context.createOscillator(),out=context.createMediaStreamDestination();source.connect(out);source.start();
      for(const track of out.stream.getTracks()){f.tracks.push(track);const stop=track.stop.bind(track);track.stop=()=>{stop();void context.close();};}return out.stream;
    }});
  });
  await page.goto('./');await openTool(page,'Microphone');page.on('request',r=>requests.push(r.url()));
  const conversation=page.getByRole('region',{name:'Preview conversation'}),mic=page.getByRole('region',{name:'Microphone test'});
  await expect(conversation.getByRole('button',{name:'Ask by voice'})).toBeDisabled();
  expect(await page.evaluate(()=>(window as any).conversationFixture.starts)).toBe(0);
  expect(await page.evaluate(()=>(window as any).conversationFixture.micCalls)).toBe(0);
  await conversation.getByLabel('Preview question').fill('What time is it?');await conversation.getByRole('button',{name:'Get preview reply'}).click();
  await expect(conversation.locator('.email-body')).toContainText('time on this device');
  await page.evaluate(()=>(window as any).conversationFixture.speech.onend());
  await conversation.getByRole('checkbox').check();await conversation.getByRole('button',{name:'Ask by voice'}).click();
  await expect(mic.getByRole('button',{name:'Start microphone test'})).toBeDisabled();
  await page.evaluate(()=>(window as any).conversationFixture.recognition.onresult({results:[{isFinal:true,0:{transcript:'Hello Jarvis'}}]}));
  await expect(conversation.locator('.email-body')).toContainText('Hello Daniel');
  expect(await page.evaluate(()=>(window as any).conversationFixture.aborts)).toBe(1);
  await page.evaluate(()=>(window as any).conversationFixture.speech.onend());
  await mic.getByRole('button',{name:'Enable clap greeting'}).click();
  await expect(mic.getByRole('status')).toContainText('Clap greeting armed');
  await expect(conversation.getByRole('button',{name:'Ask by voice'})).toBeDisabled();
  await page.waitForTimeout(650);await page.evaluate(()=>(window as any).conversationFixture.loud=true);await page.waitForTimeout(65);await page.evaluate(()=>(window as any).conversationFixture.loud=false);
  await expect(mic.getByRole('status')).toContainText('Clap-like sound detected');
  await expect.poll(()=>page.evaluate(()=>(window as any).conversationFixture.spoken.at(-1))).toContain('clap-like sound');
  expect(await page.evaluate(()=>(window as any).conversationFixture.tracks.every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
  // A clap never starts provider recognition automatically.
  expect(await page.evaluate(()=>(window as any).conversationFixture.starts)).toBe(1);
  await page.evaluate(()=>(window as any).conversationFixture.speech.onend());
  await conversation.getByRole('button',{name:'Ask by voice'}).click();
  const stale=await page.evaluate(()=>{(window as any).staleResult=(window as any).conversationFixture.recognition.onresult;return (window as any).conversationFixture.spoken.length;});
  await page.getByRole('button',{name:'Close panel',exact:true}).click();
  await page.evaluate(()=>(window as any).staleResult({results:[{isFinal:true,0:{transcript:'hello'}}]}));
  expect(await page.evaluate(()=>(window as any).conversationFixture.spoken.length)).toBe(stale);
  await openTool(page,'Microphone');await expect(conversation.getByRole('checkbox')).not.toBeChecked();
  await conversation.getByRole('checkbox').check();await conversation.getByRole('button',{name:'Ask by voice'}).click();
  await page.evaluate(()=>(window as any).conversationFixture.recognition.onerror({error:'not-allowed'}));
  await expect(conversation.getByRole('status')).toContainText('denied');
  await page.clock.install();await conversation.getByRole('button',{name:'Ask by voice'}).click();await page.clock.fastForward(16000);
  await expect(conversation.getByRole('status')).toContainText('15-second');
  await conversation.getByRole('button',{name:'Ask by voice'}).click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(conversation.getByRole('status')).toContainText('tab is hidden');
  await expect(conversation.getByRole('checkbox')).not.toBeChecked();
  expect(errors).toEqual([]);expect(requests).toEqual([]);
});

test('unsupported recognition keeps typed questions available',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(window,'SpeechRecognition',{value:undefined});Object.defineProperty(window,'webkitSpeechRecognition',{value:undefined});});
  await page.goto('./');await openTool(page,'Microphone');
  const panel=page.getByRole('region',{name:'Preview conversation'});
  await expect(panel).toContainText('Speech recognition is not available');
  await panel.getByLabel('Preview question').fill('delete my email');await panel.getByRole('button',{name:'Get preview reply'}).click();
  await expect(panel.locator('.email-body')).toContainText('No command was executed');
});
