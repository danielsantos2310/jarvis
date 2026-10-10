import { useEffect, useRef, useState } from 'react';
import { Form } from './Form.tsx';
import { MicrophoneTest } from './MicrophoneTest.tsx';
import { previewReply } from './preview-voice.ts';

interface Recognition {
  lang:string; continuous:boolean; interimResults:boolean; maxAlternatives:number;
  onresult:((event:{results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>})=>void)|null;
  onerror:((event:{error:string})=>void)|null; onend:(()=>void)|null; onstart:(()=>void)|null;
  start:()=>void; abort:()=>void;
}
type Activity = {listening:boolean;level:number;requesting?:boolean};
export function PreviewConversation({ onSay, onStopVoice, busy, onActivity }: {onSay:(text:string)=>void;onStopVoice:()=>void;busy:boolean;onActivity:(activity:Activity)=>void}) {
  const [consent,setConsent]=useState(false),[recognizing,setRecognizing]=useState(false);
  const [started,setStarted]=useState(false);
  const [input,setInput]=useState<Activity>({listening:false,level:0});
  const [draft,setDraft]=useState(''),[answer,setAnswer]=useState('');
  const [note,setNote]=useState('Choose a local voice above. Ask the time, the date, say hello, or try a clap greeting.');
  const [micKey,setMicKey]=useState(0);
  const recognition=useRef<Recognition|null>(null),deadline=useRef<ReturnType<typeof setTimeout>|null>(null);
  const browser=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  const Recognizer=browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  const capturing=recognizing || input.listening || !!input.requesting;
  useEffect(()=>{onActivity({listening:started||input.listening,level:input.level,requesting:(recognizing&&!started)||input.requesting});},[recognizing,started,input,onActivity]);
  useEffect(()=>()=>onActivity({listening:false,level:0}),[onActivity]);
  function dispose() {
    if(deadline.current)clearTimeout(deadline.current);deadline.current=null;
    const current=recognition.current;recognition.current=null;
    if(current){current.onresult=null;current.onerror=null;current.onend=null;current.onstart=null;try{current.abort();}catch{/* Already ended. */}}
  }
  useEffect(()=>{if(!draft&&!answer)return;const timer=setTimeout(()=>{setDraft('');setAnswer('');},300000);return()=>clearTimeout(timer);},[draft,answer]);
  function stop() {dispose();setRecognizing(false);setStarted(false);setMicKey(k=>k+1);onStopVoice();setNote('Preview stopped. Microphone and voice are off.');}
  useEffect(()=>{
    const hide=()=>{if(document.hidden){dispose();setRecognizing(false);setStarted(false);setDraft('');setAnswer('');setConsent(false);setNote('Voice input stopped because this tab is hidden.');}};
    const leave=()=>dispose();
    document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);
    return ()=>{dispose();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);};
  },[]);
  function respond(text:string) {
    const reply=previewReply(text);setAnswer(reply);onSay(reply);
    setNote('Simple preview reply shown below. If speech is blocked, use Read preview reply. No workspace action was executed.');
  }
  function start() {
    if(!Recognizer || !consent || busy || capturing || recognition.current || document.hidden)return;
    let current:Recognition;
    try{current=new Recognizer();}catch{setNote('Speech recognition could not initialize. Type a question instead.');return;}
    recognition.current=current;
    current.lang='en-GB';current.continuous=false;current.interimResults=false;current.maxAlternatives=1;
    setRecognizing(true);setStarted(false);setNote('Waiting for browser microphone access. The test stops after 15 seconds.');
    current.onstart=()=>{if(recognition.current!==current)return;setStarted(true);setNote('Listening for one phrase, up to 15 seconds.');};
    current.onresult=event=>{
      if(recognition.current!==current || document.hidden)return;
      const result=Array.from(event.results).find(r=>r.isFinal);
      if(!result)return;
      const text=result[0].transcript.trim().slice(0,300);
      dispose();setRecognizing(false);setStarted(false);setDraft(text);
      if(text)respond(text);else setNote('No words received. Try again or type a question.');
    };
    current.onerror=event=>{if(recognition.current!==current)return;dispose();setRecognizing(false);setStarted(false);setNote(event.error==='not-allowed' || event.error==='service-not-allowed'?'Speech permission or the browser service was denied. Nothing is listening. Type a question instead, or check browser permissions.':'Speech recognition was unavailable or heard no speech. Try again or type a question.');};
    current.onend=()=>{if(recognition.current!==current)return;dispose();setRecognizing(false);setStarted(false);setNote('Listening ended. Try again or type a question.');};
    deadline.current=setTimeout(()=>{if(recognition.current!==current)return;dispose();setRecognizing(false);setStarted(false);setNote('15-second voice-input limit reached. Microphone is off.');},15000);
    try{current.start();}catch{dispose();setRecognizing(false);setStarted(false);setNote('This browser could not start speech recognition. Use typed questions instead.');}
  }
  return <>
    <section className="card preview-conversation" aria-label="Preview conversation"><h2>Try a simple conversation</h2>
      <p>This is a small scripted demo, not an AI mind. It cannot read real Gmail, identify you or execute commands.</p>
      <p>Optional browser voice input may send audio to your browser provider’s speech service. It can require internet access. JARVIS keeps the text only in memory, clearing it after five minutes, when this panel closes or when the tab is hidden.</p>
      {Recognizer ? <><label><input type="checkbox" checked={consent} disabled={recognizing} onChange={e=>setConsent(e.target.checked)}/> I allow browser speech recognition for this test, including possible provider processing.</label><button disabled={!consent || busy || capturing} onClick={start}>Ask by voice</button></> : <p>Speech recognition is not available in this browser. You can still type a question or test the clap greeting below.</p>}
      <Form noValidate onSubmit={event=>{event.preventDefault();if(!busy&&!capturing)respond(draft);}} className="service-form">
        <label>Preview question<input required maxLength={300} value={draft} disabled={capturing} onChange={e=>setDraft(e.target.value)} placeholder="What time is it?"/></label>
        <button disabled={busy||capturing}>Get preview reply</button>
      </Form>
      {answer && <><p className="email-body">{answer}</p><button disabled={busy||capturing} onClick={()=>onSay(answer)}>Read preview reply</button></>}
      <button onClick={stop}>Stop preview conversation</button><p role="status">{note}</p>
      <p className="fineprint">Keep this tab visible. Phone locking, background tabs and browser permission rules can interrupt the test. No always-on wake word or background listening.</p>
    </section>
    <MicrophoneTest key={micKey} publicPreview onActivity={setInput} disabled={busy||recognizing} onClap={()=>{const reply='Hello Daniel. I heard a clap-like sound. I am ready. Tap Ask by voice, or type a question, to continue.';setAnswer(reply);onSay(reply);}}/>
  </>;
}
