/* 전체 화면 게임 컨트롤러. 기존 학습 기록은 유지하고 새 화면 계층을 적용합니다.
   화면 출력(screens), 문항 출력(activities), 상태/판정(core)을 분리합니다. */
(function () {
  'use strict';
  const C=window.GDragonContent, K=window.GDragonCore;
  const main=document.getElementById('main'),header=document.getElementById('header');
  const settings=document.getElementById('settings-dialog'),resetDialog=document.getElementById('reset-dialog');
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const button=(action,label,cls='primary',extra='')=>`<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
  const img=(who,mood='neutral',cls='')=>`<img class="${cls}" src="${who==='나래'?'assets/characters/residents/narae-neutral-v1.png':`assets/characters/godragon/${mood}.png`}" alt="${who==='나래'?'나래':'고드래곤'}" draggable="false">`;
  let storage;
  try{storage=window.localStorage;}catch(_){storage=null;}
  const loaded=K.load(storage);
  let state=loaded.state,notice=loaded.notice,selected=null,helpOpen=false,review=null,audio=null;
  let hints=new Set();
  function durableState() {
    const copy=JSON.parse(JSON.stringify(state));
    if(review)copy.progress[review.index]=review.progress;
    return copy;
  }
  function persist(manual=false) {
    const okay=K.save(durableState(),storage),status=document.getElementById('save-status');
    status.classList.toggle('save-warning',!okay);
    status.textContent=okay?(manual?'진행 상황을 저장했어요.':'자동 저장 · '+(state.name?state.name+' 님':'이 브라우저')):'저장 불가 · 이 창에서는 계속할 수 있어요. 브라우저를 닫으면 기록이 사라질 수 있어요.';
  }
  function countDone(){return durableState().progress.filter(p=>p.complete).length;}
  function format(text){return text.replaceAll('{이름}',()=>state.name).replaceAll('{별명}',()=>state.epithet);}
  function chime() {
    if(!state.sound)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      if(!audio)audio=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});
      const tone=audio.createOscillator(),gain=audio.createGain();
      tone.connect(gain);gain.connect(audio.destination);tone.frequency.setValueAtTime(650,audio.currentTime);tone.frequency.exponentialRampToValueAtTime(920,audio.currentTime+.055);
      gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.085);tone.start();tone.stop(audio.currentTime+.09);
    }catch(_){/* 소리를 사용할 수 없어도 모험은 계속합니다. */}
  }
  function render() {
    const focused=document.activeElement;
    const focusData=focused && focused.dataset.action?{...focused.dataset}:null;
    const context={state,C,K,esc,img,button,format,countDone,selected,helpOpen};
    const activities=window.GDragonActivities(context);
    const screens=window.GDragonScreens({...context,...activities});
    const view={intro:()=>screens.dialogue('intro'),'stage-intro':()=>screens.dialogue('stage-intro'),ending:()=>screens.dialogue('ending'),...screens};
    header.innerHTML=screens.header();
    main.dataset.screen=state.screen;
    main.innerHTML=(notice?`<div class="notice" role="alert">${esc(notice)} ${button('dismiss-notice','알겠어요','text-button')}</div>`:'')+view[state.screen]();
    if(focusData){const next=Array.from(document.querySelectorAll('[data-action]')).find(el=>Object.keys(focusData).every(key=>el.dataset[key]===focusData[key]));if(next)next.focus({preventScroll:true});}
    const hint=document.getElementById('hint-box');if(hint)hint.hidden=!hints.has(state.stage+':'+state.progress[state.stage].task);
    persist();
  }
  function go(screen) {
    if(screen==='welcome' && state.screen!=='welcome')state.resumeScreen=state.screen;
    state.screen=screen;selected=null;helpOpen=false;
    render();main.focus({preventScroll:true});window.scrollTo(0,0);
  }
  function leaveReview() {
    if(!review)return;
    state.progress[review.index]=review.progress;review=null;
  }
  function startStage(index) {
    if(!K.unlocked(durableState(),index))return;
    leaveReview();state.stage=index;const p=state.progress[index];
    if(p.complete){review={index,progress:JSON.parse(JSON.stringify(p))};state.progress[index]=K.fresh().progress[index];}
    if(!state.progress[index].introSeen){state.stageIntroIndex=0;go('stage-intro');}else go('stage');
  }
  function finishDialogue() {
    if(state.screen==='intro'){state.introIndex=C.intro.length-1;go('worlds');}
    else if(state.screen==='stage-intro'){state.progress[state.stage].introSeen=true;go('stage');}
    else{state.ended=true;go('finished');}
  }
  function edit(callback) {
    const step=state.progress[state.stage].steps[state.progress[state.stage].task];
    callback(step);step.checked=false;step.passed=false;persist();
  }
  function dispatch(action,element) {
    if(action==='dismiss-notice'){notice='';render();return;}
    if(action==='settings'){settings.showModal();return;}
    if(action==='sound'){state.sound=!state.sound;persist();render();return;}
    if(action==='home'){leaveReview();go('welcome');return;}
    if(action==='worlds' || action==='map'){
      if(!state.name)return;leaveReview();go(action);return;
    }
    if(action==='select-world'){if(Number(element.dataset.index)!==0)return;render();return;}
    if(action==='resume'){
      if(!state.name)return;let target=state.resumeScreen==='welcome'?'worlds':state.resumeScreen;
      if(['stage','stage-intro'].includes(target) && !K.unlocked(state,state.stage))target='map';
      go(target);return;
    }
    if(action==='reset'){resetDialog.showModal();return;}
    if(action==='open-stage'){startStage(Number(element.dataset.index));return;}
    if(action==='ending'){if(!K.allComplete(durableState()))return;leaveReview();state.endingIndex=0;go('ending');return;}
    if(action.startsWith('dialogue-')){
      const kind=state.screen;if(!['intro','stage-intro','ending'].includes(kind))return;
      const lines=kind==='stage-intro'?C.stageIntros[state.stage]:C[kind];
      const key=kind==='stage-intro'?'stageIntroIndex':kind==='intro'?'introIndex':'endingIndex';
      if(action==='dialogue-skip' || (action==='dialogue-next' && state[key]===lines.length-1)){finishDialogue();return;}
      state[key]=Math.max(0,Math.min(lines.length-1,state[key]+(action==='dialogue-back'?-1:1)));render();return;
    }
    if(state.screen!=='stage')return;
    const p=state.progress[state.stage],task=C.stages[state.stage].tasks[p.task],step=p.steps[p.task];
    if(action==='challenge'){p.mode='challenge';selected=null;render();}
    if(action==='toggle-help'){helpOpen=!helpOpen;render();}
    if(action==='hint'){hints.add(state.stage+':'+p.task);document.getElementById('hint-box').hidden=false;}
    if(action==='select-word'){
      selected=selected===element.dataset.value?null:element.dataset.value;render();
      if(selected){const target=main.querySelector('.blank:not(.filled)')||main.querySelector('.blank');if(target)target.focus({preventScroll:true});}
    }
    if(action==='place-word'){
      const index=Number(element.dataset.index),word=selected;
      edit(v=>{if(word!==null)v.answers=v.answers.map((a,i)=>i!==index&&a===word?null:a);v.answers[index]=word;});selected=null;render();
    }
    if(action==='select-card'){
      const i=Number(element.dataset.index);selected=selected===i?null:i;render();if(selected!==null)main.querySelector('.category-title').focus({preventScroll:true});
    }
    if(action==='place-card' && Number.isInteger(selected)){
      const i=selected;edit(v=>{v.answers[i]=element.dataset.group;});selected=null;render();
    }
    if(action==='unassign' && Number.isInteger(selected)){const i=selected;edit(v=>{v.answers[i]=null;});selected=null;render();}
    if(action==='choose'){edit(v=>{v.choice=Number(element.dataset.index);});render();}
    if(action==='clear'){p.steps[p.task]=K.fresh().progress[state.stage].steps[p.task];selected=null;render();}
    if(action==='check'){
      const result=K.grade(task,step);step.checked=true;step.passed=result.ok;render();
      main.querySelector('.feedback').scrollIntoView({block:'nearest',behavior:'smooth'});
    }
    if(action==='advance' && step.passed){
      selected=null;helpOpen=false;
      if(p.task<C.stages[state.stage].tasks.length-1){p.task++;p.mode='lesson';}else{p.complete=true;p.mode='complete';}
      render();main.querySelector('.activity-panel').scrollTop=0;main.focus({preventScroll:true});
    }
    if(action==='review'){const index=state.stage;leaveReview();startStage(index);}
    if(action==='next-stage'){
      const i=state.stage;leaveReview();
      if(i===C.stages.length-1){state.endingIndex=0;go('ending');}else startStage(i+1);
    }
  }
  document.addEventListener('click',event=>{
    const element=event.target.closest('[data-action]');if(!element || element.disabled)return;
    chime();dispatch(element.dataset.action,element);
  });
  main.addEventListener('submit',event=>{
    if(event.target.id!=='name-form')return;event.preventDefault();
    const checked=K.validateName(document.getElementById('player-name').value);
    if(!checked.ok){document.getElementById('name-error').textContent=checked.message;document.getElementById('player-name').focus();return;}
    const sound=state.sound;state=K.fresh();state.sound=sound;state.name=checked.name;state.epithet=C.epithets[Math.floor(Math.random()*C.epithets.length)];notice='';go('intro');
  });
  main.addEventListener('input',event=>{
    if(event.target.id!=='reason')return;edit(v=>{v.reason=event.target.value.slice(0,1000);});
    const old=main.querySelector('.feedback');if(old)old.remove();
    const advance=main.querySelector('[data-action="advance"]');if(advance){advance.dataset.action='check';advance.textContent='확인하기 →';}
  });
  main.addEventListener('dragstart',event=>{
    const item=event.target.closest('[data-drag]');if(!item)return;
    selected=item.dataset.drag==='word'?item.dataset.value:Number(item.dataset.index);
    event.dataTransfer.setData('text/plain',String(selected));event.dataTransfer.effectAllowed='move';
  });
  main.addEventListener('dragover',event=>{if(event.target.closest('[data-drop]')){event.preventDefault();event.dataTransfer.dropEffect='move';}});
  main.addEventListener('drop',event=>{
    const target=event.target.closest('[data-drop]');if(!target)return;event.preventDefault();
    const p=state.progress[state.stage],t=C.stages[state.stage].tasks[p.task];
    if(target.dataset.drop==='blank' && t.type==='cloze' && t.words.includes(selected))dispatch('place-word',target);
    if(target.dataset.drop==='category' && t.type==='category')dispatch('place-card',target);
    if(target.dataset.drop==='unassigned' && t.type==='category')dispatch('unassign',target);
  });
  document.addEventListener('keydown',event=>{
    if(event.key!==' ' && event.key!=='ArrowRight' && event.key!=='ArrowLeft')return;
    if(!['intro','stage-intro','ending'].includes(state.screen) || settings.open || resetDialog.open || /INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName))return;
    event.preventDefault();dispatch(event.key==='ArrowLeft'?'dialogue-back':'dialogue-next');
  });
  document.getElementById('save-button').addEventListener('click',()=>persist(true));
  document.getElementById('home-button').addEventListener('click',()=>{settings.close();dispatch('home');});
  document.getElementById('reset-button').addEventListener('click',()=>{settings.close();resetDialog.showModal();});
  document.getElementById('close-settings').addEventListener('click',()=>settings.close());
  document.getElementById('fullscreen-button').addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();settings.close();}
    catch(_){document.getElementById('save-status').textContent='전체 화면을 사용할 수 없어요. 브라우저의 F11 키로도 전환할 수 있어요.';}
  });
  document.getElementById('cancel-reset').addEventListener('click',()=>resetDialog.close());
  document.getElementById('confirm-reset').addEventListener('click',()=>{resetDialog.close();review=null;state=K.fresh();notice='';hints=new Set();go('welcome');});
  window.GDragonApp={getState:()=>JSON.parse(JSON.stringify(state)),reload:()=>{leaveReview();const r=K.load(storage);state=r.state;notice=r.notice;selected=null;helpOpen=false;render();},setStorageForTest:value=>{storage=value;}};
  render();
}());
