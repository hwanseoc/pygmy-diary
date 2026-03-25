// ===== 피그미 다이어리 앱 =====

(() => {
  'use strict';

  // --- 상수 ---
  const STORAGE_KEY = 'pygmy_diary_entries';

  // --- 상태 ---
  let entries = [];
  let currentPhotos = [];      // 새 글 작성 시 임시 사진 저장
  let selectedTags = [];       // 새 글 작성 시 선택된 태그
  let selectedMood = '';       // 선택된 기분
  let currentDetailId = null;  // 현재 상세 보기 중인 글 ID
  let activeFilter = 'all';    // 현재 활성 필터 태그
  let activeMonth = '';        // 현재 활성 월 필터

  // --- DOM 요소 ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const diaryList = $('#diaryList');
  const emptyState = $('#emptyState');
  const modalOverlay = $('#modalOverlay');
  const detailOverlay = $('#detailOverlay');
  const entryForm = $('#entryForm');
  const photoInput = $('#photoInput');
  const photoUploadArea = $('#photoUploadArea');
  const photoPlaceholder = $('#photoPlaceholder');
  const photoPreviewList = $('#photoPreviewList');
  const selectedTagsEl = $('#selectedTags');
  const filterTagsEl = $('#filterTags');
  const filterMonth = $('#filterMonth');
  const customTagInput = $('#customTagInput');

  // --- 유틸 ---
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[d.getDay()];
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
  }

  function formatMonth(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  }

  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // --- 샘플 일러스트 생성 ---
  function makeSvg(bg, emoji, label, accent) {
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bg}"/>
          <stop offset="100%" style="stop-color:${accent}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" rx="12" fill="url(#bg)"/>
      <text x="200" y="130" text-anchor="middle" font-size="80">${emoji}</text>
      <text x="200" y="210" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#fff" opacity="0.9">${label}</text>
      <circle cx="60" cy="50" r="20" fill="#fff" opacity="0.1"/>
      <circle cx="340" cy="250" r="30" fill="#fff" opacity="0.08"/>
      <circle cx="320" cy="60" r="15" fill="#fff" opacity="0.12"/>
    </svg>`)}`;
  }

  function makeSvg2(bg, emoji1, emoji2, label, accent) {
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bg}"/>
          <stop offset="100%" style="stop-color:${accent}"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" rx="12" fill="url(#bg)"/>
      <text x="160" y="130" text-anchor="middle" font-size="72">${emoji1}</text>
      <text x="260" y="140" text-anchor="middle" font-size="48">${emoji2}</text>
      <text x="200" y="215" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#fff" opacity="0.9">${label}</text>
      <circle cx="50" cy="40" r="18" fill="#fff" opacity="0.1"/>
      <circle cx="350" cy="260" r="25" fill="#fff" opacity="0.08"/>
    </svg>`)}`;
  }

  // --- 샘플 데이터 ---
  function getSampleEntries() {
    // 샘플 일러스트 이미지
    const img = {
      sleeping1: makeSvg('#6c5ce7', '\u{1F43E}', '새근새근 잠든 피그미', '#a29bfe'),
      sleeping2: makeSvg2('#2d3436', '\u{1F319}', '\u2728', '달빛 아래 꿈나라', '#636e72'),
      apple1: makeSvg('#e17055', '\u{1F34E}', '첫 사과 도전!', '#fab1a0'),
      apple2: makeSvg2('#fdcb6e', '\u{1F60B}', '\u{1F34F}', '아삭아삭 맛있다!', '#ffeaa7'),
      wheel1: makeSvg('#00b894', '\u{1F3C3}', '전력질주 중!', '#55efc4'),
      wheel2: makeSvg2('#0984e3', '\u26A1', '\u{1F4A8}', '쳇바퀴 폭주 모드', '#74b9ff'),
      bath1: makeSvg('#74b9ff', '\u{1F6C1}', '첫 목욕 시간!', '#a29bfe'),
      bath2: makeSvg2('#81ecec', '\u{1F9FC}', '\u{1FAE7}', '뽀송뽀송 피그미', '#dfe6e9'),
      hospital1: makeSvg('#00cec9', '\u{1FA7A}', '건강검진 완료!', '#55efc4'),
      hospital2: makeSvg('#55efc4', '\u2764\uFE0F', '\u{1F4AA}', '아주 건강해요!', '#00b894'),
      explore1: makeSvg('#e84393', '\u{1F50D}', '탐험 시작!', '#fd79a8'),
      explore2: makeSvg2('#636e72', '\u{1F463}', '\u2753', '어디 숨었지...?', '#b2bec3'),
      food1: makeSvg('#d63031', '\u{1F60B}', '밀웜 먹방 시작!', '#ff7675'),
      food2: makeSvg2('#e17055', '\u{1F924}', '\u{1F372}', '오늘도 완식!', '#fab1a0'),
    };

    return [
      {
        id: 'sample01',
        date: '2026-03-25',
        title: '오늘 피그미가 손 위에서 잠들었다',
        content: '저녁에 소파에서 같이 있었는데 피그미가 내 손바닥 위에 올라오더니 그대로 꾸벅꾸벅 졸기 시작했다. 너무 작고 따뜻해서 손을 움직일 수가 없었다... 30분 동안 화장실도 못 갔다 ㅋㅋ\n\n숨소리가 너무 작아서 가끔 괜찮은지 확인했는데, 볼 때마다 코가 실룩실룩 움직이고 있어서 안심했다. 세상에서 제일 귀여운 생명체...',
        photos: [img.sleeping1, img.sleeping2],
        tags: ['귀여움', '낮잠'],
        mood: 'love',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000
      },
      {
        id: 'sample02',
        date: '2026-03-24',
        title: '간식 시간! 사과를 처음 줘봤다',
        content: '오늘 처음으로 사과 작은 조각을 줘봤다. 처음에는 냄새만 맡고 관심 없는 척 하더니, 살짝 핥아본 뒤 눈이 커지면서 아삭아삭 먹기 시작! 🍎\n\n양 볼이 빵빵해질 때까지 물고 있는 게 너무 웃겼다. 앞으로 사과는 고정 간식 확정!',
        photos: [img.apple1, img.apple2],
        tags: ['먹방', '귀여움'],
        mood: 'happy',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000
      },
      {
        id: 'sample03',
        date: '2026-03-24',
        title: '쳇바퀴 폭주 모드 ON',
        content: '밤 11시쯤 갑자기 쳇바퀴 소리가 엄청 크게 들리길래 봤더니 피그미가 전력 질주 중이었다. 다리가 안 보일 정도로 빠르게 달리는데 표정은 너무 진지함 ㅋㅋㅋ\n\n한 20분 쉬지 않고 달리다가 갑자기 멈추고 물 마시더니 다시 달림... 운동 선수인가?',
        photos: [img.wheel1, img.wheel2],
        tags: ['놀이', '장난'],
        mood: 'playful',
        createdAt: Date.now() - 86400000 + 5000,
        updatedAt: Date.now() - 86400000 + 5000
      },
      {
        id: 'sample04',
        date: '2026-03-23',
        title: '첫 목욕 대성공!',
        content: '미지근한 물에 살짝 담갔는데 처음에는 버둥버둥 하다가 금방 적응! 물 위에 동동 뜨면서 편안한 표정 짓는 거 실화...?\n\n수건으로 감싸서 말려줬는데 수건 속에서 코만 쏙 내밀고 있는 모습이 정말 심장이 녹을 뻔 했다. 목욕 후 간식도 잘 먹고 기분 좋아 보였다 💕',
        photos: [img.bath1, img.bath2],
        tags: ['목욕', '귀여움'],
        mood: 'love',
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 172800000
      },
      {
        id: 'sample05',
        date: '2026-03-22',
        title: '건강검진 다녀왔어요',
        content: '3개월 정기 검진! 수의사 선생님이 아주 건강하다고 하셨다 🎉\n\n체중 측정할 때 저울 위에서 가만히 앉아있는 모습이 너무 착해서 선생님도 귀엽다고 하심 ㅎㅎ 몸무게는 살짝 늘었는데 정상 범위라고 해서 안심!\n\n돌아오는 길에 이동장 안에서 코 골면서 자고 있었다. 병원 갔다 온 것도 모르는 듯...',
        photos: [img.hospital1, img.hospital2],
        tags: ['병원'],
        mood: 'happy',
        createdAt: Date.now() - 259200000,
        updatedAt: Date.now() - 259200000
      },
      {
        id: 'sample06',
        date: '2026-03-21',
        title: '방 탐험하다가 숨어버림',
        content: '오늘 처음으로 방에 풀어놨는데 처음엔 조심조심 돌아다니더니 점점 대담해짐. 소파 밑, 책상 밑, 옷장 틈새까지 안 들어가는 데가 없었다.\n\n근데 어느 순간 사라져서 20분 동안 찾았는데... 신발장 뒤에 숨어서 동그랗게 말려 자고 있었다 😂\n\n심장 떨어지는 줄 알았다 제발...',
        photos: [img.explore1, img.explore2],
        tags: ['산책', '장난'],
        mood: 'playful',
        createdAt: Date.now() - 345600000,
        updatedAt: Date.now() - 345600000
      },
      {
        id: 'sample07',
        date: '2026-03-20',
        title: '밀웜 먹방 ASMR',
        content: '밀웜 5마리 줬는데 하나도 안 남기고 싹 먹어치움. 오독오독 씹는 소리가 생각보다 크다 ㅋㅋ\n\n다 먹고 나서 손에 묻은 냄새 맡으면서 더 없냐는 듯이 쳐다보는 눈빛... 못 이기는 척 2마리 더 줌. 나는 호구다.',
        photos: [img.food1, img.food2],
        tags: ['먹방'],
        mood: 'hungry',
        createdAt: Date.now() - 432000000,
        updatedAt: Date.now() - 432000000
      }
    ];
  }

  // --- 데이터 저장/불러오기 ---
  const SAMPLE_VERSION_KEY = 'pygmy_diary_sample_v';
  const CURRENT_SAMPLE_VERSION = 2; // 버전 올리면 샘플 데이터 재생성

  function loadEntries() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const sampleVer = parseInt(localStorage.getItem(SAMPLE_VERSION_KEY) || '0');

      if (data && sampleVer >= CURRENT_SAMPLE_VERSION) {
        entries = JSON.parse(data);
      } else {
        // 처음 방문 또는 샘플 버전 업데이트 시 재생성
        entries = getSampleEntries();
        saveEntries();
        localStorage.setItem(SAMPLE_VERSION_KEY, String(CURRENT_SAMPLE_VERSION));
      }
    } catch {
      entries = [];
    }
  }

  function saveEntries() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  // --- 모든 태그 수집 ---
  function getAllTags() {
    const tagSet = new Set();
    entries.forEach(e => {
      if (e.tags) e.tags.forEach(t => tagSet.add(t));
    });
    return [...tagSet].sort();
  }

  // --- 필터 태그 렌더링 ---
  function renderFilterTags() {
    const tags = getAllTags();
    filterTagsEl.innerHTML = '<button class="tag-filter' + (activeFilter === 'all' ? ' active' : '') + '" data-tag="all">전체</button>';
    tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'tag-filter' + (activeFilter === tag ? ' active' : '');
      btn.dataset.tag = tag;
      btn.textContent = tag;
      filterTagsEl.appendChild(btn);
    });
  }

  // --- 다이어리 목록 렌더링 ---
  function renderDiary() {
    // 필터링
    let filtered = [...entries];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(e => e.tags && e.tags.includes(activeFilter));
    }

    if (activeMonth) {
      filtered = filtered.filter(e => e.date && e.date.startsWith(activeMonth));
    }

    // 날짜 내림차순 정렬
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 비우기 (emptyState 제외)
    diaryList.querySelectorAll('.date-divider, .diary-card').forEach(el => el.remove());

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    let lastDate = '';
    const fragment = document.createDocumentFragment();

    filtered.forEach(entry => {
      // 날짜 구분선
      if (entry.date !== lastDate) {
        lastDate = entry.date;
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.innerHTML = `<span>${formatDate(entry.date)}</span>`;
        fragment.appendChild(divider);
      }

      // 카드
      const card = document.createElement('div');
      card.className = 'diary-card';
      card.dataset.id = entry.id;

      let photosHTML = '';
      if (entry.photos && entry.photos.length > 0) {
        const photoItems = entry.photos.slice(0, 4).map(p =>
          `<img src="${p}" class="card-photo" alt="사진">`
        ).join('');
        photosHTML = `<div class="card-photos">${photoItems}</div>`;
      }

      let tagsHTML = '';
      if (entry.tags && entry.tags.length > 0) {
        tagsHTML = '<div class="card-tags">' +
          entry.tags.map(t => `<span class="card-tag">${t}</span>`).join('') +
          '</div>';
      }

      const moodMap = {
        happy: '😊', love: '😍', sleepy: '😴',
        playful: '🤪', hungry: '🤤', sick: '🤒'
      };

      card.innerHTML = `
        <div class="card-header">
          <span class="card-title">${escapeHtml(entry.title)}</span>
          <span class="card-mood">${moodMap[entry.mood] || ''}</span>
        </div>
        <div class="card-date">${formatDate(entry.date)}</div>
        ${entry.content ? `<div class="card-content">${escapeHtml(entry.content)}</div>` : ''}
        ${photosHTML}
        ${tagsHTML}
      `;

      card.addEventListener('click', () => openDetail(entry.id));
      fragment.appendChild(card);
    });

    diaryList.appendChild(fragment);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- 모달 열기/닫기 ---
  function openModal(isEdit = false) {
    if (!isEdit) {
      $('#modalTitle').textContent = '새 일기 쓰기';
      entryForm.reset();
      $('#entryId').value = '';
      $('#entryDate').value = new Date().toISOString().split('T')[0];
      currentPhotos = [];
      selectedTags = [];
      selectedMood = '';
      photoPreviewList.innerHTML = '';
      photoPlaceholder.style.display = 'flex';
      selectedTagsEl.innerHTML = '';
      $$('.tag-suggestion').forEach(b => b.classList.remove('selected'));
      $$('.mood-btn').forEach(b => b.classList.remove('selected'));
    }
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openDetail(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    currentDetailId = id;

    const moodMap = {
      happy: '😊', love: '😍', sleepy: '😴',
      playful: '🤪', hungry: '🤤', sick: '🤒'
    };

    $('#detailTitle').textContent = entry.title;

    let html = `
      <div class="detail-date">${formatDate(entry.date)}</div>
      ${entry.mood ? `<div class="detail-mood">${moodMap[entry.mood] || ''}</div>` : ''}
      ${entry.content ? `<div class="detail-text">${escapeHtml(entry.content)}</div>` : ''}
    `;

    if (entry.photos && entry.photos.length > 0) {
      html += '<div class="detail-photos">';
      entry.photos.forEach(p => {
        html += `<img src="${p}" class="detail-photo" alt="사진">`;
      });
      html += '</div>';
    }

    if (entry.tags && entry.tags.length > 0) {
      html += '<div class="detail-tags">';
      entry.tags.forEach(t => {
        html += `<span class="card-tag">${escapeHtml(t)}</span>`;
      });
      html += '</div>';
    }

    $('#detailContent').innerHTML = html;

    // 사진 클릭 시 풀스크린
    $('#detailContent').querySelectorAll('.detail-photo').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        showFullscreen(img.src);
      });
    });

    detailOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    detailOverlay.classList.remove('open');
    document.body.style.overflow = '';
    currentDetailId = null;
  }

  function showFullscreen(src) {
    const overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    overlay.innerHTML = `<img src="${src}" alt="사진">`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  // --- 사진 처리 ---
  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        // 이미지 리사이즈 (localStorage 용량 절약)
        resizeImage(e.target.result, 800, (resized) => {
          currentPhotos.push(resized);
          renderPhotoPreview();
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function resizeImage(dataUrl, maxWidth, callback) {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;

      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  }

  function renderPhotoPreview() {
    photoPreviewList.innerHTML = '';
    if (currentPhotos.length === 0) {
      photoPlaceholder.style.display = 'flex';
      return;
    }
    photoPlaceholder.style.display = 'none';

    currentPhotos.forEach((photo, idx) => {
      const item = document.createElement('div');
      item.className = 'photo-preview-item';
      item.innerHTML = `
        <img src="${photo}" alt="미리보기">
        <button class="photo-remove" data-idx="${idx}">&times;</button>
      `;
      photoPreviewList.appendChild(item);
    });
  }

  // --- 태그 처리 ---
  function addTag(tag) {
    tag = tag.trim();
    if (!tag || selectedTags.includes(tag)) return;
    selectedTags.push(tag);
    renderSelectedTags();
  }

  function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderSelectedTags();
    // 프리셋 태그 선택 해제
    $$('.tag-suggestion').forEach(b => {
      if (b.dataset.tag === tag) b.classList.remove('selected');
    });
  }

  function renderSelectedTags() {
    selectedTagsEl.innerHTML = '';
    selectedTags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'selected-tag';
      el.innerHTML = `${escapeHtml(tag)} <button data-tag="${escapeHtml(tag)}">&times;</button>`;
      selectedTagsEl.appendChild(el);
    });
  }

  // --- 글 저장 ---
  function saveEntry(e) {
    e.preventDefault();

    const id = $('#entryId').value || generateId();
    const isEdit = !!$('#entryId').value;
    const date = $('#entryDate').value;
    const title = $('#entryTitle').value.trim();
    const content = $('#entryContent').value.trim();

    if (!date || !title) {
      showToast('날짜와 제목을 입력해주세요!');
      return;
    }

    const entry = {
      id,
      date,
      title,
      content,
      photos: currentPhotos,
      tags: [...selectedTags],
      mood: selectedMood,
      createdAt: isEdit ? (entries.find(e => e.id === id)?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    if (isEdit) {
      const idx = entries.findIndex(e => e.id === id);
      if (idx >= 0) entries[idx] = entry;
    } else {
      entries.push(entry);
    }

    saveEntries();
    renderFilterTags();
    renderDiary();
    closeModal();
    showToast(isEdit ? '수정 완료! ✨' : '새 일기가 저장되었어요! 🎉');
  }

  // --- 글 삭제 ---
  function deleteEntry(id) {
    if (!confirm('정말 이 일기를 삭제할까요? 😢')) return;
    entries = entries.filter(e => e.id !== id);
    saveEntries();
    renderFilterTags();
    renderDiary();
    closeDetail();
    showToast('일기가 삭제되었어요 🗑️');
  }

  // --- 글 수정 ---
  function editEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    closeDetail();

    $('#modalTitle').textContent = '일기 수정하기';
    $('#entryId').value = entry.id;
    $('#entryDate').value = entry.date;
    $('#entryTitle').value = entry.title;
    $('#entryContent').value = entry.content || '';

    currentPhotos = entry.photos ? [...entry.photos] : [];
    selectedTags = entry.tags ? [...entry.tags] : [];
    selectedMood = entry.mood || '';

    renderPhotoPreview();
    renderSelectedTags();

    // 프리셋 태그 상태 반영
    $$('.tag-suggestion').forEach(b => {
      b.classList.toggle('selected', selectedTags.includes(b.dataset.tag));
    });

    // 기분 상태 반영
    $$('.mood-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.mood === selectedMood);
    });

    openModal(true);
  }

  // --- 이벤트 리스너 ---
  function initEvents() {
    // 새 글 버튼
    $('#btnNewEntry').addEventListener('click', () => openModal());

    // 모달 닫기
    $('#btnCloseModal').addEventListener('click', closeModal);
    $('#btnCancel').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // 상세 모달 닫기
    $('#btnCloseDetail').addEventListener('click', closeDetail);
    detailOverlay.addEventListener('click', (e) => {
      if (e.target === detailOverlay) closeDetail();
    });

    // 폼 저장
    entryForm.addEventListener('submit', saveEntry);

    // 수정/삭제
    $('#btnEdit').addEventListener('click', () => {
      if (currentDetailId) editEntry(currentDetailId);
    });
    $('#btnDelete').addEventListener('click', () => {
      if (currentDetailId) deleteEntry(currentDetailId);
    });

    // 사진 업로드
    photoUploadArea.addEventListener('click', (e) => {
      if (e.target.closest('.photo-remove')) return;
      photoInput.click();
    });

    photoInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      photoInput.value = '';
    });

    // 드래그 앤 드롭
    photoUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      photoUploadArea.classList.add('dragover');
    });
    photoUploadArea.addEventListener('dragleave', () => {
      photoUploadArea.classList.remove('dragover');
    });
    photoUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      photoUploadArea.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    // 사진 삭제
    photoPreviewList.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.photo-remove');
      if (removeBtn) {
        e.stopPropagation();
        const idx = parseInt(removeBtn.dataset.idx);
        currentPhotos.splice(idx, 1);
        renderPhotoPreview();
      }
    });

    // 프리셋 태그 선택
    $$('.tag-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        if (selectedTags.includes(tag)) {
          removeTag(tag);
          btn.classList.remove('selected');
        } else {
          addTag(tag);
          btn.classList.add('selected');
        }
      });
    });

    // 커스텀 태그
    $('#btnAddTag').addEventListener('click', () => {
      addTag(customTagInput.value);
      customTagInput.value = '';
    });
    customTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag(customTagInput.value);
        customTagInput.value = '';
      }
    });

    // 태그 삭제 (selected-tags 영역)
    selectedTagsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tag]');
      if (btn) removeTag(btn.dataset.tag);
    });

    // 기분 선택
    $$('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.mood-btn').forEach(b => b.classList.remove('selected'));
        if (selectedMood === btn.dataset.mood) {
          selectedMood = '';
        } else {
          selectedMood = btn.dataset.mood;
          btn.classList.add('selected');
        }
      });
    });

    // 필터 태그 클릭
    filterTagsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.tag-filter');
      if (!btn) return;
      activeFilter = btn.dataset.tag;
      renderFilterTags();
      renderDiary();
    });

    // 월 필터
    filterMonth.addEventListener('change', () => {
      activeMonth = filterMonth.value; // "YYYY-MM" or ""
      renderDiary();
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (document.querySelector('.fullscreen-overlay')) {
          document.querySelector('.fullscreen-overlay').remove();
        } else if (detailOverlay.classList.contains('open')) {
          closeDetail();
        } else if (modalOverlay.classList.contains('open')) {
          closeModal();
        }
      }
    });
  }

  // --- 초기화 ---
  function init() {
    loadEntries();
    renderFilterTags();
    renderDiary();
    initEvents();

    // 월 필터는 비워둬서 전체 기간 보이게
    filterMonth.value = '';
  }

  // DOM 로드 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
