/* 시안의 배경·캐릭터·게임 UI를 각각 분리해 합성합니다.
   월드·스테이지 버튼과 모든 대사는 실제 HTML 요소입니다. */
(function () {
  'use strict';
  const worlds = [
    {name:'시작의 마을', x:19,y:32}, {name:'별꽃광장',x:47,y:20},
    {name:'진실의 기록관',x:72,y:17}, {name:'분주한 항구도시',x:39,y:59},
    {name:'공방지구',x:61,y:42}, {name:'고디월드 왕국',x:79,y:66}
  ];
  function icon(name) {
    const paths = {
      home:'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',
      back:'M14 5 7 12l7 7M7 12h14', arrow:'m9 5 7 7-7 7',
      lock:'M6 10h12v11H6ZM8 10V6a4 4 0 0 1 8 0v4',
      flag:'M5 22V3c5-4 9 4 15 0v10c-6 4-10-4-15 0',
      sound:'M3 9h5l5-5v16l-5-5H3ZM17 8a7 7 0 0 1 0 8M20 4a12 12 0 0 1 0 16',
      mute:'M3 9h5l5-5v16l-5-5H3ZM17 8l6 8M23 8l-6 8',
      menu:'M4 6h16M4 12h16M4 18h16', skip:'m3 5 8 7-8 7Zm10 0 8 7-8 7Z',
      check:'m4 12 5 5L21 5', leaf:'M4 20C0 7 9 1 21 3c2 12-4 20-17 17Zm0 0L16 8'
    };
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.arrow}"/></svg>`;
  }
  const logo = () => `<span class="game-logo"><span class="logo-leaves">❧</span><span>고디<span class="logo-orange">월</span>드</span><span class="logo-leaves">❧</span></span>`;
  window.GDragonScreens = function (ctx) {
    const {state,C,K,esc,img,button,challenge,lesson,stageComplete,format,countDone} = ctx;
    const stageTitles = ['AI의 개념','AI의 기능 구분하기','LLM과 컨텍스트','LLM 대화의 요령','AI에 적합한 문제'];
    const icons = ['💡','🧩','📚','💬','🔎'];
    function header() {
      const screen=state.screen, done=countDone();
      const sound=button('sound',icon(state.sound ? 'sound' : 'mute'),'icon-button',`aria-label="효과음 ${state.sound ? '끄기' : '켜기'}" aria-pressed="${!state.sound}"`);
      const menu=button('settings',icon('menu'),'icon-button','aria-label="저장 및 모험 설정"');
      if (screen === 'worlds' || screen === 'welcome') return `<div class="nav-left">${button('home',icon('home'),'icon-button','id="brand" aria-label="홈으로"')}</div><div class="screen-title">${logo()}<span class="logo-subtitle">고드래곤과 함께하는 AI 모험</span></div><div class="nav-right">${sound}${menu}</div>`;
      let backAction='worlds', backText='월드 선택', title='<span>월드 1</span> · 시작의 마을';
      if (['stage','stage-intro','ending','finished'].includes(screen)) {backAction='map';backText='스테이지 선택';title=screen==='ending' || screen==='finished' ? '<span>월드 1</span> · 실전 출동' : `<span>${C.stages[state.stage].id}</span> · ${stageTitles[state.stage]}`;}
      if(screen==='intro') {backAction='home';backText='홈으로';title='<span>고디월드</span> · 우리의 첫 만남';}
      const progress=`<div class="header-progress">${icon('flag')}<strong>${done} / 5 완료</strong><div class="mini-progress"><span style="width:${done*20}%"></span></div></div>`;
      return `<div class="nav-left">${button(backAction,icon('back')+backText,'nav-button')}</div><div class="screen-title">${title}</div><div class="nav-right">${['intro','stage-intro','ending'].includes(screen) ? button('dialogue-skip',icon('skip')+'대화 건너뛰기','nav-button') : progress}${menu}</div>`;
    }
    function welcome() {
      const saved=!!state.name;
      return `<section class="screen welcome-screen"><div class="welcome-content paper-panel"><p class="eyebrow">고드래곤과 함께하는 AI 모험</p><h1>고디월드에<br>오신 걸 환영해요!</h1><p class="welcome-lead">봄맞이축제를 준비하는 왕국지원단.<br>오늘부터 고디와 한 팀으로 출발해요.</p>
        ${saved ? `<div class="resume-card"><p><strong>${esc(state.name)}</strong> 님의 모험<br><span>${countDone()} / 5 스테이지 완료</span></p><div class="actions">${button('resume','이어서 모험하기 '+icon('arrow'))}${button('worlds','월드 선택','secondary')}${button('reset','새로운 모험 시작','text-button')}</div></div>` : `<form id="name-form" class="name-form"><label for="player-name">당신의 이름을 알려주세요</label><input id="player-name" name="name" autocomplete="off" placeholder="이름 · 7자 이내" aria-describedby="name-guide name-error" required><p id="name-guide" class="small">고디월드에서 사용할 나만의 이름이에요.</p><p id="name-error" role="alert" class="input-error"></p><button type="submit" class="primary full-width">모험 시작하기 ${icon('arrow')}</button></form>`}
        <p class="welcome-note">힌트도, 다시 도전도 언제나 자유롭게!</p></div><div class="welcome-companion">${img('고디','greeting','hero-godi')}<div class="speech-bubble">반가워! 난 고디야.<br>함께 시작해 볼까?</div></div></section>`;
    }
    function worldMap() {
      return `<section class="screen world-screen"><div class="world-map"><div class="world-pins">${worlds.map((w,i)=>`<button class="world-pin ${i===0?'active':'locked'}" style="--x:${w.x}%;--y:${w.y}%" data-action="select-world" data-index="${i}" aria-label="월드 ${i+1} ${w.name}${i===0?' 선택':' 준비 중'}" ${i===0?'':'disabled'}><span class="pin-number">${i+1}</span>${i===0?'':icon('lock')}<span class="pin-label">${w.name}</span></button>`).join('')}</div><div class="world-companion">${img('고디','greeting','map-godi')}<div class="speech-bubble">함께 시작해 볼까요?</div></div></div>
        <aside class="world-detail paper-panel"><div class="world-preview"><img src="assets/backgrounds/village-square-v1.png" alt="햇살 가득한 시작의 마을 풍경"></div><p class="world-kicker">월드 1</p><h1>시작의 마을</h1><p class="world-description">AI의 기초를 알아보는 첫 모험</p><div class="world-progress">${icon('flag')} <strong>${countDone()} / 5 스테이지 완료</strong><div class="progress-track"><span style="width:${countDone()*20}%"></span></div></div>${button('map','스테이지 보기 '+icon('arrow'),'primary full-width')}<p class="world-note">다른 월드는 아직 준비 중이에요.</p></aside></section>`;
    }
    function map() {
      const done=K.allComplete(state);
      return `<section class="screen stage-map-screen"><div class="village-companion"><div class="quest-sign paper-panel"><h2>봄맞이축제를 도와주세요</h2><img src="assets/backgrounds/village-square-v1.png" alt="축제를 준비하는 마을 광장"></div>${img('고디','greeting','map-godi')}<div class="speech-bubble">${done?'다섯 가지 배움을 모았어!<br>나래를 만나러 가볼까?':'AI를 배우며<br>함께 축제를 준비해 봐요!'}</div></div><div class="stage-panel paper-panel"><div class="stage-list">${C.stages.map((s,i)=>{
        const p=state.progress[i],open=K.unlocked(state,i),started=p.steps.some(v=>v.checked||v.answers.some(Boolean)||v.choice!==null||v.reason);
        return `<button class="stage-card ${p.complete?'done':open?'available':'locked'}" data-action="open-stage" data-index="${i}" ${open?'':'disabled'}><span class="stage-orb">${s.id}</span><span class="stage-icon" aria-hidden="true">${icons[i]}</span><span class="stage-description"><strong>${stageTitles[i]}</strong><small>${s.brief}</small></span><span class="stage-action">${p.complete?icon('check')+'복습':open?(started?'이어하기':'시작하기')+icon('arrow'):icon('lock')+'잠김'}</span></button>`;
      }).join('')}</div><div class="stage-panel-foot"><span>❧</span> 스테이지를 선택해 모험을 시작하세요 <span>❧</span></div><div class="map-end-actions">${done?button('ending',state.ended?'엔딩 다시 보기':'나래를 만나러 가기 '+icon('arrow')):'<span class="mini-placeholder">미니게임 · 준비 중</span>'}</div></div></section>`;
    }
    function dialogue(kind) {
      const stageIntro=kind==='stage-intro';
      const lines=stageIntro?C.stageIntros[state.stage]:C[kind];
      const key=stageIntro?'stageIntroIndex':kind==='intro'?'introIndex':'endingIndex';
      const [speaker,text]=lines[state[key]];
      const name=speaker==='나래'?'마을 안내인 나래 🌱':speaker==='고디'?'동료 고드래곤':speaker==='나'?state.name:speaker;
      return `<section class="screen story-screen"><div class="story-cast"><figure class="cast godi ${speaker.includes('고디')?'speaking':''}">${img('고디',kind==='ending'?'celebrating':'neutral')}</figure><figure class="cast narae ${speaker==='나래'?'speaking':''}">${img('나래','neutral')}</figure></div><div class="dialogue paper-panel"><span class="speaker">${esc(name)}</span><div class="dialogue-copy"><p aria-live="polite">${esc(format(text))}</p></div><span class="dialogue-page">${state[key]+1} / ${lines.length}</span><div class="dialogue-actions">${button('dialogue-back','이전','text-button',state[key]===0?'disabled':'')}${button('dialogue-next',state[key]===lines.length-1?(kind==='ending'?'마무리':stageIntro?'도전 준비':'월드 선택')+' '+icon('arrow'):'다음 '+icon('arrow'))}</div></div></section>`;
    }
    function stage() {
      const s=C.stages[state.stage],p=state.progress[state.stage],t=s.tasks[p.task];
      return `<section class="screen play-screen"><aside class="play-companion">${img(p.mode==='lesson'?'나래':'고디',p.mode==='complete'?'celebrating':'thinking','companion-image')}<div class="companion-quote"><strong>${p.mode==='lesson'?'나래':'고디'}</strong><p>${p.mode==='complete'?'해냈다! 다음 모험도 함께하자.':p.mode==='lesson'?'차근차근 알아볼까요?':'괜찮아! 우리 같이 생각해보자.'}</p></div></aside><article class="activity-panel paper-panel"><div class="activity-heading"><span class="eyebrow">${s.id} · ${s.typeLabel}</span><span class="pill">${p.mode==='complete'?'완료':`${p.task+1} / ${s.tasks.length} 활동`}</span></div>${p.mode==='complete'?stageComplete(s):`<h2>${t.title}</h2>${p.mode==='lesson'?lesson(t):challenge(t,p.steps[p.task])}`}</article></section>`;
    }
    function finished() {
      return `<section class="screen finish-screen">${img('고디','celebrating','finish-godi')}<div class="finish-content paper-panel"><p class="world-kicker">월드 1 · 모험 완료</p><h1>잘했어요,<br>${esc(state.name)} 님!</h1><p>고디와 함께 AI 첫걸음을 마쳤어요.</p><ul class="learning-list">${C.stages.map((s,i)=>`<li>${icon('check')} ${stageTitles[i]}</li>`).join('')}</ul><div class="next-world"><strong>다음 이야기 · 별꽃광장</strong><p>월드 2는 준비 중입니다</p></div><div class="actions">${button('worlds','월드 선택 '+icon('arrow'))}${button('map','스테이지 복습','secondary')}</div><p class="small">게임에서 연습한 내용의 기록입니다.<br>실제 직무역량 평가나 공식 이수 증빙은 아니에요.</p></div></section>`;
    }
    return {header,welcome,worlds:worldMap,map,dialogue,stage,finished};
  };
}());
