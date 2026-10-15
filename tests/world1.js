/* 실제 브라우저 DOM을 조작하는 회귀 검사. 테스트용 프로필에서 실행합니다.
   정답 데이터만 직접 읽고, 완료 처리는 모두 화면 버튼을 통해 수행합니다. */
(async function () {
  'use strict';
  const frame = document.getElementById('game'), output = document.getElementById('results');
  const results = [], errors = [];
  let w, d, C, K, A;
  const assert = (value, message) => {if (!value) throw new Error(message); results.push('PASS ' + message);};
  // 새로고침 뒤에도 새 Window의 예외·외부 호출을 감시합니다.
  const connect = () => {
    w=frame.contentWindow;d=frame.contentDocument;C=w.GDragonContent;K=w.GDragonCore;A=w.GDragonApp;
    w.addEventListener('error',event=>errors.push(event.message));
    w.fetch=()=>{throw new Error('외부 요청은 금지되어야 합니다');};
  };
  const waitLoad = () => new Promise((resolve, reject) => {const timer=setTimeout(()=>reject(new Error('iframe 로드 시간 초과')),15000);frame.addEventListener('load',()=>{clearTimeout(timer);connect();resolve();},{once:true});});
  const $ = s => {const el=d.querySelector(s); if(!el) throw new Error('요소 없음: '+s);return el;};
  const click = s => {const el=$(s);if(el.disabled) throw new Error('비활성 버튼: '+s);el.click();};
  const act = name => click('[data-action="'+name+'"]');
  const input = (selector,value) => {const el=$(selector);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
  const current = () => {const s=A.getState();return {s,p:s.progress[s.stage],t:C.stages[s.stage].tasks[s.progress[s.stage].task]};};
  // 최초 진입과 복습은 대화를 거치며, 다중 활동의 다음 문항은 설명으로 바로 이동합니다.
  function goChallenge() {
    if(A.getState().screen === 'stage-intro') act('dialogue-skip');
    act('challenge');
  }
  function goHome() {act('settings');click('#home-button');}
  const fitsViewport = () => d.documentElement.scrollWidth <= d.documentElement.clientWidth;
  function solve() {
    const {t}=current();
    assert(d.documentElement.scrollWidth<=d.documentElement.clientWidth,'활동 화면 가로 넘침 없음: '+t.title);
    if(t.type === 'cloze') t.correct.forEach((word,i)=>{click('[data-value="'+word+'"]');click('[data-action="place-word"][data-index="'+i+'"]');});
    if(t.type === 'category') t.correct.forEach((group,i)=>{click('[data-action="select-card"][data-index="'+i+'"]');click('[data-action="place-card"][data-group="'+group+'"]');});
    if(t.type === 'choice' || t.type === 'reason') click('[data-action="choose"][data-index="'+t.correct+'"]');
    if(t.type === 'reason') input('#reason','자료의 특징과 도구의 역할을 비교했고, 결과의 근거도 확인해야 합니다.');
    act('check');assert(!!d.querySelector('.feedback.success'),'정답 해설: '+t.title);act('advance');
  }
  try {
    if(frame.contentDocument.readyState === 'complete' && frame.contentWindow.GDragonApp) connect(); else await waitLoad();
    assert(!K.validateName('        ').ok,'빈 이름 차단');
    assert(!K.validateName('가나다라마바사아').ok,'8자 이름 차단');
    assert(K.validateName('가나다라마바사').ok,'7자 이름 허용');
    assert(K.validateName('👨‍👩‍👧‍👦가').ok,'유니코드 사용자 인식 문자 이름');
    const unavailable={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};
    assert(!K.save(K.fresh(),unavailable),'저장 차단 예외 처리');
    assert(!!K.load(unavailable).notice,'저장 차단 로드 안내');
    const broken={getItem:()=>'{bad json'};
    assert(!!K.load(broken).notice,'손상 JSON 복구 안내');
    let bad=K.fresh();bad.version=999;
    assert(!!K.load({getItem:()=>JSON.stringify(bad)}).notice,'지원하지 않는 저장 버전 처리');
    const oldSave=K.fresh();
    delete oldSave.stageIntroIndex;delete oldSave.sound;
    oldSave.progress.forEach(p=>delete p.introSeen);
    const migrated=K.restore(JSON.stringify(oldSave));
    assert(migrated.stageIntroIndex===0 && migrated.sound===true,'구버전 저장의 새 대사·소리 설정 기본값 보완');
    assert(migrated.progress.every(p=>p.introSeen===false),'구버전 미시작 스테이지에 새 시작 대화 제공');
    const lockedResume=K.fresh();lockedResume.name='테스터';lockedResume.epithet=C.epithets[0];lockedResume.stage=4;lockedResume.resumeScreen='stage';
    assert(!!K.load({getItem:()=>JSON.stringify(lockedResume)}).notice,'잠긴 스테이지를 가리키는 손상된 이어하기 기록 차단');
    w.localStorage.removeItem(K.KEY);A.reload();
    input('#player-name','가나다라마바사아');$('#name-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    assert(!!$('#name-error').textContent,'이름 초과 실제 화면 안내');
    input('#player-name','테스터');$('#name-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    assert(A.getState().screen === 'intro','이름 입력 후 인트로');
    act('dialogue-next');const epithet=A.getState().epithet;
    assert(d.body.textContent.includes(epithet),'랜덤 수식어 표시');
    const load1=waitLoad();frame.contentWindow.location.reload();await load1;
    assert(A.getState().introIndex===1 && A.getState().epithet===epithet,'실제 새로고침 대사 위치·수식어 복구');
    act('dialogue-skip');assert(A.getState().screen === 'worlds','인트로에서 월드 선택 연결');
    assert(d.querySelectorAll('.world-pin').length===6,'월드 선택에 6개 월드 표시');
    assert(d.querySelectorAll('.world-pin:disabled').length===5,'미구현 5개 월드 잠금');
    assert(d.querySelectorAll('.world-pin:not(:disabled)').length===1,'월드 1만 선택 가능');
    $('.world-pin:disabled').click();
    assert(A.getState().screen==='worlds','잠긴 월드 버튼으로 화면 전환되지 않음');
    const soundBefore=A.getState().sound;act('sound');
    assert(A.getState().sound!==soundBefore,'소리 설정 버튼 상태 변경');
    act('sound');
    frame.style.width='390px';w.dispatchEvent(new w.Event('resize'));
    assert(fitsViewport(),'390px 월드 선택 화면 가로 넘침 없음');
    act('map');assert(A.getState().screen === 'map','월드 선택에서 시작의 마을 연결');
    assert(d.querySelectorAll('.stage-card:disabled').length===4,'후속 4개 스테이지 잠금');
    $('.stage-card:disabled').click();
    assert(A.getState().screen==='map','잠긴 스테이지 버튼으로 활동에 진입하지 않음');
    assert(fitsViewport(),'390px 스테이지 선택 화면 가로 넘침 없음');
    act('open-stage');assert(A.getState().screen==='stage-intro','첫 스테이지 진입 전 캐릭터 대화');
    assert(d.querySelectorAll('.story-cast img').length>=2,'대화 화면에 고디와 나래 등장');
    act('dialogue-next');
    const stageDialogueLoad=waitLoad();frame.contentWindow.location.reload();await stageDialogueLoad;
    assert(A.getState().screen==='stage-intro' && A.getState().stageIntroIndex===1,'스테이지 대화 도중 새로고침 위치 복구');
    assert(fitsViewport(),'390px 대화 화면 가로 넘침 없음');
    goChallenge();act('check');
    assert(!!d.querySelector('.retry'),'미완성 답안 오답 안내');
    act('hint');assert(!$('#hint-box').hidden,'무료 힌트 열림');
    act('toggle-help');assert(d.body.textContent.includes('작은 예시') || d.body.textContent.includes('사과'),'도전 중 설명·예제 다시 보기');
    click('[data-value="패턴"]');click('[data-action="place-word"][data-index="0"]');
    const load2=waitLoad();frame.contentWindow.location.reload();await load2;
    assert(A.getState().progress[0].steps[0].answers[0]==='패턴','새로고침 중간 답안 복구');
    // 이전 시제품의 실제 진행 답안도 새 필드 없이 이어받을 수 있어야 합니다.
    const oldProgress=A.getState();
    delete oldProgress.stageIntroIndex;delete oldProgress.sound;
    oldProgress.progress.forEach(p=>delete p.introSeen);
    w.localStorage.setItem(K.KEY,JSON.stringify(oldProgress));A.reload();
    assert(A.getState().screen==='stage' && A.getState().progress[0].steps[0].answers[0]==='패턴','구버전 진행 저장의 답안·화면 보존');
    assert(A.getState().progress[0].mode==='challenge','구버전 진행 저장의 도전 모드 보존');
    goHome();act('resume');assert(A.getState().screen === 'stage','홈에서 진행 중 활동 이어하기');
    // 네이티브 HTML 드래그 이벤트의 dataTransfer 경로도 실제 DOM에서 확인합니다.
    const word=$('[data-value="예측"]'),blank=$('[data-action="place-word"][data-index="2"]'),transfer=new w.DataTransfer();
    word.dispatchEvent(new w.DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));
    blank.dispatchEvent(new w.DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    blank.dispatchEvent(new w.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    assert(A.getState().progress[0].steps[0].answers[2]==='예측','빈칸 드래그 배치');
    solve();assert(A.getState().progress[0].complete,'1-1 완료');act('next-stage');
    assert(A.getState().screen==='stage-intro' && A.getState().stage===1,'다음 스테이지도 시작 대화로 연결');
    goChallenge();
    const card=$('[data-action="select-card"][data-index="0"]'),bin=$('[data-drop="category"][data-group="분류"]'),transfer2=new w.DataTransfer();
    card.dispatchEvent(new w.DragEvent('dragstart',{bubbles:true,dataTransfer:transfer2}));bin.dispatchEvent(new w.DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer2}));
    assert(A.getState().progress[1].steps[0].answers[0]==='분류','카드 드래그 배치');
    solve();act('next-stage');goChallenge();solve();
    assert(A.getState().progress[2].task===1,'1-3 두 번째 활동 연결');
    goChallenge();act('check');
    assert(A.getState().progress[2].steps[0].passed,'후속 활동 오답 시 이전 활동 유지');solve();
    act('next-stage');for(let i=0;i<3;i++){goChallenge();solve();}
    act('next-stage');goChallenge();
    click('[data-action="choose"][data-index="0"]');act('check');
    assert(!!d.querySelector('.retry'),'1-5 이유 미입력 차단');
    input('#reason','입력한 이유를 저장합니다.');A.reload();assert($('#reason').value==='입력한 이유를 저장합니다.','서술형 이유 저장 복구');
    assert(d.body.textContent.includes('실제 AI 채점 없음'),'더미 평가 명시');solve();
    for(let i=1;i<3;i++){goChallenge();solve();}
    assert(K.allComplete(A.getState()),'5개 스테이지 전체 완료');
    act('next-stage');assert(A.getState().screen==='ending','마지막 스테이지에서 엔딩');
    act('dialogue-next');assert(d.body.textContent.includes('피카츄'),'사용자 엔딩 대사 유지');
    const load3=waitLoad();frame.contentWindow.location.reload();await load3;assert(A.getState().endingIndex===1,'엔딩 위치 새로고침 복구');
    while(A.getState().screen==='ending') act('dialogue-next');
    assert(A.getState().screen==='finished','엔딩에서 완료 화면 연결');
    assert(d.body.textContent.includes('월드 2는 준비 중'),'월드 2 미구현 안내');
    act('map');click('[data-action="open-stage"][data-index="0"]');
    assert(A.getState().screen==='stage-intro','완료 스테이지 복습도 캐릭터 대화로 시작');
    goChallenge();
    act('check');act('map');assert(K.allComplete(A.getState()),'복습 중 오답이어도 완료 이력 보존');
    click('[data-action="open-stage"][data-index="0"]');goChallenge();act('check');
    act('settings');click('#home-button');act('worlds');
    assert(A.getState().screen==='worlds' && K.allComplete(A.getState()),'복습에서 홈·월드 선택으로 이탈해도 완료 이력 보존');
    act('map');click('[data-action="open-stage"][data-index="0"]');goChallenge();act('check');
    const reviewLoad=waitLoad();frame.contentWindow.location.reload();await reviewLoad;
    assert(K.allComplete(A.getState()) && A.getState().progress[0].complete,'복습 중 새로고침에도 원래 완료 이력 복구');
    goHome();act('reset');$('#cancel-reset').click();assert(K.allComplete(A.getState()),'초기화 취소 시 이력 보존');
    const badStorage={getItem:()=>null,setItem(){throw new Error('quota');}};A.setStorageForTest(badStorage);act('settings');click('#save-button');
    assert(d.getElementById('save-status').textContent.includes('저장 불가'),'저장 실패 실제 화면 안내');
    click('#close-settings');A.setStorageForTest(w.localStorage);act('reset');$('#confirm-reset').click();assert(!A.getState().name,'확인 후 초기화');
    input('#player-name','<b>');$('#name-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));act('dialogue-next');
    assert(!d.querySelector('.dialogue-copy b') && d.body.textContent.includes('<b>'),'이름 HTML 이스케이프');
    goHome();act('reset');$('#confirm-reset').click();
    input('#player-name','$&');$('#name-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));act('dialogue-next');
    assert(d.body.textContent.includes('$&'),'특수문자 이름을 그대로 대사에 표시');
    assert(errors.length===0,'게임 브라우저 런타임 오류 없음');
    assert(!w.performance.getEntriesByType('resource').some(r=>/^https?:/.test(r.name) && new URL(r.name).origin !== w.location.origin),'게임 외부 HTTP 요청 없음');
    frame.style.width='390px';w.dispatchEvent(new w.Event('resize'));
    assert(d.documentElement.scrollWidth<=d.documentElement.clientWidth,'390px 화면 가로 넘침 없음');
    results.push('ALL PASSED · '+results.length+' checks');
    output.textContent=results.join('\n');document.title='PASS · 월드 1';
  } catch(error) {results.push('FAIL '+error.stack);output.textContent=results.join('\n');document.title='FAIL · 월드 1';}
}());
