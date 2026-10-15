/* 문항 표현은 화면 구조와 분리합니다. 월드·대화·마을은 screens.js가 담당합니다. */
(function () {
  'use strict';
  window.GDragonActivities = function (context) {
    const {state, C, K, esc, button, helpOpen, selected} = context;
  function lesson(t) {
    return `<div class="lesson-card"><span class="lesson-icon">✦</span><h3>먼저, 알아볼까요?</h3><p>${t.lesson}</p></div><div class="example-card"><strong>작은 예시</strong><p>${t.example}</p></div><p class="small">설명은 도전 중에도 언제든 다시 볼 수 있어요.</p><div class="actions">${button('challenge','직접 해보기 →')}${button('challenge','설명 건너뛰고 도전','text-button')}</div>`;
  }
  function stageComplete(s) {
    const last = state.stage === C.stages.length-1;
    return `<div class="celebration"><span class="completion-seal">✓</span><p class="eyebrow">하나의 배움이 모였어요</p><h2>${s.title}<br>완료했어요!</h2><p>${esc(state.name)} 님의 속도로 한 걸음 나아갔어요.<br>배운 내용은 언제든 다시 살펴볼 수 있어요.</p><div class="actions">${button('next-stage',last ? '나래를 만나러 가기 →' : '다음 스테이지 →')}${button('review','이번 스테이지 복습','secondary')}${button('map','마을 지도','text-button')}</div></div>`;
  }
  function challenge(t, step) {
    const result = step.checked ? K.grade(t,step) : null;
    let exercise = '';
    if (t.type === 'cloze') exercise = cloze(t,step,result);
    if (t.type === 'category') exercise = category(t,step,result);
    if (t.type === 'choice' || t.type === 'reason') {
      exercise = `<p class="question">${t.question}</p><div class="choices">${(t.options || C.tools).map((o,i) => `<button class="choice ${step.choice === i ? 'chosen' : ''}" aria-pressed="${step.choice === i}" data-action="choose" data-index="${i}"><span>${String.fromCharCode(65+i)}</span>${o}<span class="choice-check">${step.choice === i ? '✓' : ''}</span></button>`).join('')}</div>`;
      if (t.type === 'reason') exercise += `<div class="dummy-label">시제품용 예시 평가 · 실제 AI 채점 없음</div><label class="reason-label" for="reason">왜 이 도구가 적합할까요?</label><textarea id="reason" maxlength="1000" rows="4" placeholder="자료의 특징, 도구가 하는 일, 확인할 점을 떠올려 적어보세요.">${esc(step.reason)}</textarea><p class="small">선택과 이유 입력 여부를 확인하고 고정 예시 피드백을 보여줍니다. 이유의 의미는 자동 평가하지 않아요.</p>`;
    }
    const feedback = result ? `<div class="feedback ${result.ok ? 'success' : 'retry'}" role="status"><strong>${result.ok ? '✓ 배움을 확인했어요' : '한 번 더 생각해봐요'}</strong><p>${result.message}</p>${result.ok ? `<p>${t.explanation}</p>` : '<p class="small">맞게 놓은 내용은 유지해도 돼요. 힌트도 무료예요.</p>'}</div>` : '';
    return `<div class="activity-tools">${button('toggle-help','설명·예제 다시 보기','text-button',`aria-expanded="${helpOpen}"`)}${button('hint','✧ 고디의 힌트','text-button')}</div>
      ${helpOpen ? `<div class="example-card"><strong>설명</strong><p>${t.lesson}</p><strong>예시</strong><p>${t.example}</p></div>` : ''}<div id="hint-box" class="hint-box" hidden role="status">${t.hint}</div>
      ${exercise}${feedback}<div class="exercise-actions">${result && result.ok ? button('advance',state.progress[state.stage].task === C.stages[state.stage].tasks.length-1 ? '스테이지 마무리 →' : '다음 활동 →') : button('check','확인하기 →')}${button('clear','이 활동 다시 풀기','text-button')}</div>`;
  }
  function cloze(t,step,result) {
    const sentence = t.parts.map((part,i) => esc(part) + (i < t.correct.length ? `<button class="blank ${result && result.wrong.includes(i) ? 'incorrect' : ''} ${step.answers[i] ? 'filled' : ''}" data-action="place-word" data-index="${i}" data-drop="blank" aria-label="${i+1}번 빈칸 ${esc(step.answers[i] || '비어 있음')}">${esc(step.answers[i] || `${i+1} · 빈칸`)}</button>` : '')).join('');
    return `<p class="interaction-guide">단어를 고른 뒤 빈칸을 누르거나, 단어를 끌어 놓으세요. 빈칸만 누르면 단어가 돌아와요.</p><div class="sentence">${sentence}</div><div class="word-bank" aria-label="후보 단어">${t.words.map(w => `<button draggable="true" class="word ${selected === w ? 'selected' : ''}" aria-pressed="${selected === w}" data-action="select-word" data-value="${esc(w)}" data-drag="word">${w}${step.answers.includes(w) ? '<small>배치됨</small>' : ''}</button>`).join('')}</div><p class="selection-status" role="status">${selected ? `선택한 단어: ${esc(selected)} · 넣을 빈칸을 눌러주세요.` : '후보 8개 중 4개를 골라주세요.'}</p>`;
  }
  function category(t,step,result) {
    const card = i => `<button draggable="true" class="sort-card ${selected === i ? 'selected' : ''} ${result && result.wrong.includes(i) ? 'incorrect' : ''}" data-action="select-card" data-index="${i}" data-drag="card" aria-pressed="${selected === i}"><span class="card-number">${i+1}</span>${t.cards[i]}</button>`;
    return `<p class="interaction-guide">카드를 누른 뒤 범주 버튼을 누르세요. 카드를 범주 안으로 끌어도 돼요.</p><div class="category-grid">${t.groups.map((g,i) => `<section class="category-bin" data-drop="category" data-group="${g}"><button class="category-title" data-action="place-card" data-group="${g}"><span>0${i+1}</span> ${g} <small>여기에 놓기 ↓</small></button><div class="bin-cards">${t.cards.map((_,j) => step.answers[j] === g ? card(j) : '').join('')}</div></section>`).join('')}</div><h3 class="bank-title">아직 분류하지 않은 카드</h3><div class="card-bank" data-drop="unassigned">${t.cards.map((_,i) => step.answers[i] === null ? card(i) : '').join('') || '<p class="small">모든 카드를 배치했어요. 확인하기를 눌러보세요.</p>'}</div>${button('unassign','선택한 카드 다시 꺼내기','text-button')}<p class="selection-status" role="status">${Number.isInteger(selected) ? `${selected+1}번 카드 선택 · 넣을 범주를 눌러주세요.` : '카드를 선택해 분류·예측·생성으로 옮겨주세요.'}</p>`;
  }
  function finished() {
    return `<section class="finish-panel"><div class="finish-art scene">${img('고디','celebrating')}<span class="chapter-chip">WORLD 01 · COMPLETE</span></div><div class="finish-copy"><p class="eyebrow">다음 모험을 향한 준비</p><h1>잘했어요,<br><span>${esc(state.name)} 님!</span></h1><p>고디와 함께 AI 첫걸음을 마쳤어요.<br>이곳에서 연습한 다섯 가지를 기억해보세요.</p><ul class="learning-list">${C.stages.map(s=>`<li><span>✓</span> ${s.title}</li>`).join('')}</ul><div class="next-world"><strong>다음 이야기 · 별꽃광장</strong><p>봄맞이축제 참가 가게들의 자료 정리가 기다려요.</p><span class="pill">월드 2는 준비 중입니다</span></div><div class="actions">${button('map','월드 1 복습하기 →')}${button('home','홈으로','secondary')}</div><p class="small">게임에서 연습한 영역의 기록입니다. 실제 직무역량의 정밀 평가나 공식 이수 증빙은 아닙니다.</p></div></section>`;
  }

    return {lesson, stageComplete, challenge};
  };
}());