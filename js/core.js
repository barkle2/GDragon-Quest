/* 상태와 판정은 DOM에서 독립적으로 관리합니다. 브라우저 저장은 편의 기능이며
   중앙 이수 증빙이 아닙니다. 저장 오류가 플레이 자체를 중단시키지 않게 합니다. */
(function () {
  'use strict';
  const C = window.GDragonContent;
  const KEY = 'gdragon.quest.world1.v1';
  const screens = ['welcome', 'intro', 'worlds', 'map', 'stage-intro', 'stage', 'ending', 'finished'];
  function units(value) {
    return typeof Intl.Segmenter === 'function'
      ? Array.from(new Intl.Segmenter('ko', {granularity: 'grapheme'}).segment(value), x => x.segment)
      : Array.from(value);
  }
  function validateName(value) {
    const name = String(value).trim().normalize('NFC');
    if (!name || /[\u0000-\u001f\u007f]/u.test(name)) return {ok: false, message: '이름을 1~7자로 입력해 주세요. 줄바꿈은 사용할 수 없어요.'};
    if (units(name).length > 7) return {ok: false, message: '이름은 7자 이내로 정해주세요.'};
    return {ok: true, name};
  }
  function fresh() {
    return {version: 1, name: '', epithet: '', screen: 'welcome', resumeScreen: 'intro', stage: 0, introIndex: 0, endingIndex: 0, stageIntroIndex: 0, sound: true, ended: false,
      progress: C.stages.map(s => ({task: 0, mode: 'lesson', complete: false, introSeen: false,
        steps: s.tasks.map(t => ({answers: (t.type === 'cloze' || t.type === 'category') ? Array(t.correct.length).fill(null) : [], choice: null, reason: '', checked: false, passed: false}))}))};
  }
  function grade(task, step) {
    if (task.type === 'cloze' || task.type === 'category') {
      const wrong = task.correct.map((v, i) => step.answers[i] !== v ? i : -1).filter(i => i >= 0);
      return {ok: !wrong.length, wrong, message: wrong.length ? '아직 맞지 않거나 비어 있는 곳이 있어요. 표시된 부분만 다시 생각해봐요.' : '잘했어요! 왜 맞는지도 함께 살펴봐요.'};
    }
    if (step.choice !== task.correct) return {ok: false, wrong: [], message: step.choice === null ? '먼저 하나를 선택해 주세요.' : '이 상황의 목적과 조건을 다시 살펴봐요. 다른 선택으로 바꿀 수 있어요.'};
    if (task.type === 'reason' && !step.reason.trim()) return {ok: false, wrong: [], message: '선택한 이유를 한 문장 이상 적어보세요.'};
    return {ok: true, wrong: [], message: task.type === 'reason' ? '선택을 확인했어요. 아래는 시제품용 예시 피드백입니다. 작성한 이유의 의미를 자동 평가하지 않습니다.' : '잘했어요! 이 상황에서 적절한 이유를 확인해봐요.'};
  }
  const unlocked = (state, index) => index >= 0 && index < C.stages.length && (index === 0 || state.progress[index - 1].complete);
  const allComplete = state => state.progress.every(p => p.complete);
  /* 외부 저장을 신뢰하지 않습니다. 지원 버전·배열 크기·선택 범위를 확인하고,
     통과 기록도 현재 문항으로 재판정해 손상된 상태의 진행 건너뛰기를 막습니다. */
  function restore(raw) {
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !screens.includes(s.screen) || !Array.isArray(s.progress) || s.progress.length !== C.stages.length) throw new Error('저장 형식 오류');
    // 이전 시제품의 저장 키·문항 구조를 유지하고 새 UI 상태만 기본값으로 보완합니다.
    if (s.stageIntroIndex === undefined) s.stageIntroIndex = 0;
    if (s.sound === undefined) s.sound = true;
    if (!Number.isInteger(s.stageIntroIndex) || s.stageIntroIndex < 0 || s.stageIntroIndex >= 3 || typeof s.sound !== 'boolean') throw new Error('새 화면 설정 오류');
    if (s.name !== '' && (!validateName(s.name).ok || validateName(s.name).name !== s.name)) throw new Error('이름 오류');
    if (s.screen !== 'welcome' && !s.name) throw new Error('이름 없음');
    if (!screens.includes(s.resumeScreen)) throw new Error('이어하기 위치 오류');
    if (s.name && !C.epithets.includes(s.epithet)) throw new Error('수식어 오류');
    if (!Number.isInteger(s.stage) || s.stage < 0 || s.stage >= C.stages.length) throw new Error('스테이지 오류');
    if (!Number.isInteger(s.introIndex) || s.introIndex < 0 || s.introIndex >= C.intro.length || !Number.isInteger(s.endingIndex) || s.endingIndex < 0 || s.endingIndex >= C.ending.length || typeof s.ended !== 'boolean') throw new Error('대화 위치 오류');
    s.progress.forEach((p, i) => {
      const tasks = C.stages[i].tasks;
      if (p && p.introSeen === undefined) p.introSeen = !!(p.complete || p.task > 0 || p.mode === 'challenge' || (Array.isArray(p.steps) && p.steps.some(v => v && (v.checked || v.choice !== null || v.reason || (Array.isArray(v.answers) && v.answers.some(Boolean))))));
      if (!p || typeof p.introSeen !== 'boolean' || typeof p.complete !== 'boolean' || !['lesson','challenge','complete'].includes(p.mode) || !Number.isInteger(p.task) || p.task < 0 || p.task >= tasks.length || !Array.isArray(p.steps) || p.steps.length !== tasks.length) throw new Error('활동 오류');
      p.steps.forEach((v, j) => {
        const t = tasks[j];
        if (!v || !Array.isArray(v.answers) || typeof v.reason !== 'string' || v.reason.length > 1000 || typeof v.checked !== 'boolean' || typeof v.passed !== 'boolean') throw new Error('답안 오류');
        if (t.type === 'cloze' || t.type === 'category') {
          const allowed = t.words || t.groups;
          if (v.answers.length !== t.correct.length || v.answers.some(a => a !== null && !allowed.includes(a))) throw new Error('배치 오류');
          if (t.type === 'cloze' && new Set(v.answers.filter(Boolean)).size !== v.answers.filter(Boolean).length) throw new Error('중복 단어');
        } else if (v.choice !== null && (!Number.isInteger(v.choice) || v.choice < 0 || v.choice >= (t.options || C.tools).length)) throw new Error('선택 오류');
        if (v.passed && (!v.checked || !grade(t, v).ok)) throw new Error('통과 오류');
        if (j < p.task && !v.passed) throw new Error('이전 활동 미완료');
      });
      if (p.complete && !p.steps.every(v => v.passed)) throw new Error('완료 오류');
      if (p.mode === 'complete' && !p.complete) throw new Error('완료 화면 오류');
      if (i > 0 && p.complete && !s.progress[i - 1].complete) throw new Error('순서 오류');
    });
    if (['stage','stage-intro'].includes(s.screen) && !unlocked(s, s.stage)) throw new Error('잠긴 단계');
    if (s.screen === 'welcome' && ['stage','stage-intro'].includes(s.resumeScreen) && !unlocked(s,s.stage)) throw new Error('잠긴 이어하기');
    if (['ending','finished'].includes(s.screen) && !allComplete(s)) throw new Error('월드 미완료');
    return s;
  }
  function load(storage) {
    try { const raw = storage.getItem(KEY); return {state: raw ? restore(raw) : fresh(), notice: ''}; }
    catch (_) {return {state: fresh(), notice: '저장 기록을 불러오지 못했어요. 저장이 차단됐거나 기록이 손상되었을 수 있어요. 새 모험으로 진행할 수 있습니다.'};}
  }
  function save(state, storage) {
    try {storage.setItem(KEY, JSON.stringify(state)); return true;} catch (_) {return false;}
  }
  window.GDragonCore = {KEY, units, validateName, fresh, grade, unlocked, allComplete, restore, load, save};
}());
