/**
 * HANA — 韓國女團分享交流平台
 * script.js
 *
 * 架構說明：
 * 1. localStorage 鍵值：
 *    - "hana_users"   : Array<User>   — 所有已註冊使用者
 *    - "hana_posts"   : Array<Post>   — 所有貼文
 *    - "hana_session" : string | null — 目前登入的使用者 ID
 *
 * 2. 頁面切換（SPA 模式）：
 *    - 最外層有 3 個 .view：#view-auth、#view-app、#view-guest
 *    - #view-app 內部有 3 個 .sub-view：#sub-profile、#sub-create、#sub-feed
 *    - 透過 showView() / showSubView() 控制 .active 切換
 */

/* ============================================================
   SECTION 1：LocalStorage 存取工具
   ============================================================ */

/** 讀取所有使用者 @returns {Array} */
function getUsers() {
  return JSON.parse(localStorage.getItem('hana_users') || '[]');
}

/** 儲存使用者陣列 */
function saveUsers(users) {
  localStorage.setItem('hana_users', JSON.stringify(users));
}

/** 讀取所有貼文 @returns {Array} */
function getPosts() {
  return JSON.parse(localStorage.getItem('hana_posts') || '[]');
}

/** 儲存貼文陣列 */
function savePosts(posts) {
  localStorage.setItem('hana_posts', JSON.stringify(posts));
}

/** 取得目前登入的使用者物件，若未登入回傳 null */
function getCurrentUser() {
  const sessionId = localStorage.getItem('hana_session');
  if (!sessionId) return null;
  return getUsers().find(u => u.id === sessionId) || null;
}

/** 設定登入 session */
function setSession(userId) {
  localStorage.setItem('hana_session', userId);
}

/** 清除 session（登出） */
function clearSession() {
  localStorage.removeItem('hana_session');
}

/* ============================================================
   SECTION 2：頁面切換邏輯（SPA Router）
   ============================================================ */

/**
 * 切換最外層 view（auth / app / guest）
 * @param {'auth'|'app'|'guest'} name
 */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
}

/**
 * 切換 #view-app 內部的 sub-view（profile / create / feed）
 * @param {'profile'|'create'|'feed'} name
 */
function showSubView(name) {
  document.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
  document.getElementById(`sub-${name}`).classList.add('active');

  // 更新導覽列 active 狀態（create 不在導覽列上）
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  if (name === 'profile') document.getElementById('nav-profile').classList.add('active');
  if (name === 'feed')    document.getElementById('nav-feed').classList.add('active');
}

/* ============================================================
   SECTION 3：Auth 功能（登入 / 註冊）
   ============================================================ */

let regAvatarBase64 = ''; // 暫存註冊頭貼 Base64

/** 切換登入 / 註冊 tab */
function initAuthTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });
}

/** 密碼顯示/隱藏切換（眼睛 icon） */
function initPasswordToggles() {
  document.querySelectorAll('.btn-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.querySelector('.eye-off').style.display = isHidden ? 'none'  : '';
      btn.querySelector('.eye-on').style.display  = isHidden ? ''      : 'none';
    });
  });
}

/** 頭貼上傳：讀取圖片檔並轉為 Base64 */
function initAvatarUpload() {
  const input = document.getElementById('reg-avatar-input');
  const preview = document.getElementById('reg-avatar-preview');

  // 點擊預覽區觸發檔案選擇
  preview.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      regAvatarBase64 = e.target.result; // Base64 字串
      preview.innerHTML = `<img src="${regAvatarBase64}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    };
    reader.readAsDataURL(file);
  });
}

/** 執行註冊 */
function doRegister() {
  const id   = document.getElementById('reg-id').value.trim();
  const name = document.getElementById('reg-name').value.trim();
  const pw   = document.getElementById('reg-pw').value;
  const errEl = document.getElementById('reg-error');

  errEl.textContent = '';

  if (!id || !name || !pw) { errEl.textContent = '請填寫所有必要欄位。'; return; }
  if (id.length < 3) { errEl.textContent = 'ID 至少需要 3 個字元。'; return; }
  if (pw.length < 6) { errEl.textContent = '密碼至少需要 6 個字元。'; return; }

  const users = getUsers();
  if (users.find(u => u.id === id)) { errEl.textContent = '此 ID 已被使用，請換一個。'; return; }

  // 建立新使用者物件並儲存
  const newUser = {
    id,
    name,
    password: pw,   // 注意：真實場景應雜湊處理，此為示範
    avatar: regAvatarBase64,
    createdAt: Date.now()
  };
  users.push(newUser);
  saveUsers(users);

  // 自動登入
  setSession(id);
  enterApp();
}

/** 執行登入 */
function doLogin() {
  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-error');

  errEl.textContent = '';

  if (!id || !pw) { errEl.textContent = '請輸入 ID 與密碼。'; return; }

  const users = getUsers();
  const user = users.find(u => u.id === id && u.password === pw);

  if (!user) { errEl.textContent = 'ID 或密碼不正確。'; return; }

  pendingLoginUserId = id;
  showCaptchaModal();
}

let pendingLoginUserId = null;

function showCaptchaModal() {
  document.getElementById('modal-2fa').classList.remove('hidden');
  document.getElementById('captcha-error').textContent = '';
  
  const grid = document.getElementById('captcha-grid');
  grid.innerHTML = '';
  
  const images = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  images.forEach(num => {
    const img = document.createElement('img');
    img.src = `${num}.png`;
    img.className = 'captcha-img';
    img.dataset.val = num;
    img.alt = `Captcha Option ${num}`;
    img.addEventListener('click', () => handleCaptchaClick(num));
    grid.appendChild(img);
  });
}

function hideCaptchaModal() {
  const el = document.getElementById('modal-2fa');
  if (el) el.classList.add('hidden');
  pendingLoginUserId = null;
}

function handleCaptchaClick(num) {
  const errEl = document.getElementById('captcha-error');
  if (num === 8) {
    setSession(pendingLoginUserId);
    hideCaptchaModal();
    enterApp();
  } else {
    errEl.textContent = '驗證失敗，請重新選取。';
  }
}

/* ============================================================
   SECTION 4：進入 App（登入後初始化）
   ============================================================ */

function enterApp() {
  const user = getCurrentUser();
  if (!user) { showView('auth'); return; }

  showView('app');
  renderNavUser(user);
  renderProfileView(user);
  showSubView('profile');
}

/** 渲染導覽列右方的使用者資訊 */
function renderNavUser(user) {
  const el = document.getElementById('nav-user-info');
  if (user.avatar) {
    el.innerHTML = `<img src="${user.avatar}" alt="${user.name}" /><span>${user.name}</span>`;
  } else {
    el.innerHTML = `<div class="nav-avatar-fallback">${user.name.charAt(0)}</div><span>${user.name}</span>`;
  }
}

/* ============================================================
   SECTION 5：個人首頁（Profile View）
   ============================================================ */

function renderProfileView(targetUser, context = 'app') {
  const currentUser = getCurrentUser();
  const isMe = context === 'app' && currentUser && currentUser.id === targetUser.id;

  if (context === 'app') {
    const wrap = document.getElementById('profile-avatar-wrap');
    if (targetUser.avatar) {
      wrap.innerHTML = `<img id="profile-avatar" src="${targetUser.avatar}" alt="avatar" class="profile-avatar" />`;
    } else {
      wrap.innerHTML = `<div class="profile-avatar fallback-avatar">${targetUser.name.charAt(0)}</div>`;
    }

    document.getElementById('profile-name').textContent = targetUser.name;
    document.getElementById('profile-id-display').textContent = `@${targetUser.id}`;

    const btnCreate = document.getElementById('btn-go-create');
    if (btnCreate) btnCreate.style.display = isMe ? 'inline-block' : 'none';

    const backWrap = document.getElementById('profile-back-wrap');
    if (backWrap) backWrap.style.display = isMe ? 'none' : 'block';

    const titleEl = document.getElementById('profile-section-title');
    if (titleEl) titleEl.textContent = isMe ? '我的貼文' : `${targetUser.name} 的貼文`;

    renderUserPosts(targetUser, 'my-posts-list', currentUser, 'profile');
  } else if (context === 'guest') {
    const wrap = document.getElementById('guest-profile-avatar-wrap');
    if (targetUser.avatar) {
      wrap.innerHTML = `<img src="${targetUser.avatar}" alt="avatar" class="profile-avatar" />`;
    } else {
      wrap.innerHTML = `<div class="profile-avatar fallback-avatar">${targetUser.name.charAt(0)}</div>`;
    }
    document.getElementById('guest-profile-name').textContent = targetUser.name;
    document.getElementById('guest-profile-id-display').textContent = `@${targetUser.id}`;
    
    const titleEl = document.getElementById('guest-profile-section-title');
    if (titleEl) titleEl.textContent = `${targetUser.name} 的貼文`;

    renderUserPosts(targetUser, 'guest-user-posts-list', null, 'guest');
  }
}

/** 渲染特定使用者的歷史貼文 */
function renderUserPosts(targetUser, containerId, currentUser, context) {
  const container = document.getElementById(containerId);
  const posts = getPosts().filter(p => p.authorId === targetUser.id)
                          .sort((a, b) => b.createdAt - a.createdAt);

  if (posts.length === 0) {
    container.innerHTML = '<p class="empty-hint">此使用者尚未發佈任何貼文。</p>';
    return;
  }

  container.innerHTML = posts.map(post => renderPostCardHTML(post, currentUser, context)).join('');
  bindPostCardEvents(container, currentUser);
}

/* ============================================================
   SECTION 6：發文功能（Create Post View）
   ============================================================ */

let postImageBase64 = ''; // 暫存貼文圖片 Base64

function initCreatePost() {
  const imgArea  = document.getElementById('img-upload-area');
  const imgInput = document.getElementById('post-img-input');
  const imgPreview = document.getElementById('post-img-preview');

  // 點擊上傳區觸發
  imgArea.addEventListener('click', () => imgInput.click());

  // 支援拖曳
  imgArea.addEventListener('dragover', e => { e.preventDefault(); imgArea.style.background = '#f7eef0'; });
  imgArea.addEventListener('dragleave', () => { imgArea.style.background = ''; });
  imgArea.addEventListener('drop', e => {
    e.preventDefault();
    imgArea.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadPostImage(file, imgPreview);
  });

  imgInput.addEventListener('change', () => {
    const file = imgInput.files[0];
    if (file) loadPostImage(file, imgPreview);
  });

  document.getElementById('btn-publish').addEventListener('click', doPublishPost);
}

function loadPostImage(file, previewEl) {
  const reader = new FileReader();
  reader.onload = e => {
    postImageBase64 = e.target.result;
    previewEl.src = postImageBase64;
    previewEl.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

/** 顯示發文頁，並帶入作者資訊 */
function goToCreate() {
  const user = getCurrentUser();
  const authorEl = document.getElementById('create-author-info');

  if (user.avatar) {
    authorEl.innerHTML = `<img src="${user.avatar}" alt="${user.name}" /><span>以 <strong>${user.name}</strong> 身份發文</span>`;
  } else {
    authorEl.innerHTML = `<div class="create-author-fallback">${user.name.charAt(0)}</div><span>以 <strong>${user.name}</strong> 身份發文</span>`;
  }

  // 清空表單
  document.getElementById('post-subject').value = '';
  document.getElementById('post-content').value = '';
  document.getElementById('post-img-preview').classList.add('hidden');
  document.getElementById('post-error').textContent = '';
  postImageBase64 = '';

  showSubView('create');
}

/** 執行發文 */
function doPublishPost() {
  const subject = document.getElementById('post-subject').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const errEl   = document.getElementById('post-error');
  const user    = getCurrentUser();

  errEl.textContent = '';

  if (!subject) { errEl.textContent = '請輸入發布主題。'; return; }
  if (!content) { errEl.textContent = '請輸入發布內容。'; return; }

  // 建立貼文物件
  const newPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    authorId:   user.id,
    authorName: user.name,
    authorAvatar: user.avatar || '',
    subject,
    content,
    image: postImageBase64,
    createdAt: Date.now(),
    likes: [],      // 存放按讚的使用者 id 陣列
    comments: []    // 存放留言物件
  };

  // 推入 localStorage
  const posts = getPosts();
  posts.push(newPost);
  savePosts(posts);

  // 發布成功後跳至分享區
  renderFeedView();
  showSubView('feed');

  // 同步更新個人首頁（在背景更新，不影響當前視圖）
  renderUserPosts(user, 'my-posts-list', user, 'profile');
}

/* ============================================================
   SECTION 7：分享區（Public Feed View）
   ============================================================ */

function renderFeedView() {
  const user = getCurrentUser(); // 可能為 null（訪客）
  const container = document.getElementById('feed-post-list');
  const posts = getPosts().sort((a, b) => b.createdAt - a.createdAt); // 最新在上

  if (posts.length === 0) {
    container.innerHTML = '<p class="empty-hint">目前還沒有任何貼文，成為第一個發文的人吧！</p>';
    return;
  }

  container.innerHTML = posts.map(post => renderPostCardHTML(post, user, 'feed')).join('');
  bindPostCardEvents(container, user);
}

/** 渲染訪客分享區 */
function renderGuestFeedView() {
  const container = document.getElementById('guest-feed-post-list');
  const posts = getPosts().sort((a, b) => b.createdAt - a.createdAt);

  if (posts.length === 0) {
    container.innerHTML = '<p class="empty-hint">目前還沒有任何貼文。</p>';
    return;
  }

  container.innerHTML = posts.map(post => renderPostCardHTML(post, null, 'guest')).join('');
  bindPostCardEvents(container, null);
}

/* ============================================================
   SECTION 8：貼文卡片 HTML 渲染
   ============================================================ */

/** 格式化時間戳記 */
function formatTime(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000)  return '剛剛';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
}

/**
 * 產生單張貼文卡片的 HTML 字串
 * @param {Object} post    - 貼文物件
 * @param {Object|null} currentUser - 當前登入使用者（訪客為 null）
 * @param {string} context - 'feed' | 'profile' | 'guest'
 */
function renderPostCardHTML(post, currentUser, context) {
  const isLoggedIn = !!currentUser;
  const hasLiked = isLoggedIn && (post.likes || []).includes(currentUser.id);
  const isAuthor = isLoggedIn && currentUser.id === post.authorId;

  // 作者頭貼
  const avatarHTML = post.authorAvatar
    ? `<img src="${post.authorAvatar}" alt="${post.authorName}" class="post-avatar user-link" data-user-id="${post.authorId}" style="cursor:pointer;" />`
    : `<div class="post-avatar-fallback user-link" data-user-id="${post.authorId}" style="cursor:pointer;">${post.authorName.charAt(0)}</div>`;

  // 貼文圖片（若有）
  const imageHTML = post.image
    ? `<img src="${post.image}" alt="post image" class="post-image" />`
    : '';

  // 按讚數
  const likeCount = (post.likes || []).length;

  // 留言區段
  const commentsHTML = renderCommentsHTML(post, currentUser);

  return `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-meta">
        ${avatarHTML}
        <div class="post-meta-info user-link" data-user-id="${post.authorId}" style="cursor:pointer;">
          <span class="post-author-name">${escapeHTML(post.authorName)}</span>
          <span class="post-author-id">@${escapeHTML(post.authorId)}</span>
        </div>
        <span class="post-time">${formatTime(post.createdAt)}</span>
      </div>
      <div class="post-subject">${escapeHTML(post.subject)}</div>
      <div class="post-body">${escapeHTML(post.content)}</div>
      ${imageHTML}
      <div class="post-actions">
        <button class="action-btn btn-like ${hasLiked ? 'liked' : ''}" data-post-id="${post.id}">
          ${hasLiked ? heartFilledSVG() : heartSVG()}
          <span class="like-count">${likeCount > 0 ? likeCount : ''}</span>
        </button>
        <button class="action-btn btn-comment-toggle" data-post-id="${post.id}">
          ${commentSVG()}
          <span>${(post.comments || []).length > 0 ? (post.comments || []).length : ''} 留言</span>
        </button>
        ${isAuthor ? `
        <button class="action-btn btn-delete-post" style="margin-left:auto;color:#c0392b;" data-post-id="${post.id}" aria-label="刪除貼文" title="刪除貼文">
          ${trashSVG()}
        </button>
        ` : ''}
      </div>
      <div class="comments-section" id="comments-${post.id}" style="display:none;">
        ${commentsHTML}
      </div>
    </div>
  `;
}

/** 產生留言區 HTML */
function renderCommentsHTML(post, currentUser) {
  const isLoggedIn = !!currentUser;
  const comments = post.comments || [];

  const commentsListHTML = comments.length === 0
    ? '<p style="font-size:0.82rem;color:var(--c-text-hint);margin-bottom:0.75rem;">尚無留言，搶先留言吧！</p>'
    : comments.map(c => {
        const avatarHTML = c.authorAvatar
          ? `<img src="${c.authorAvatar}" alt="${c.authorName}" class="comment-avatar user-link" data-user-id="${c.authorId}" style="cursor:pointer;" />`
          : `<div class="comment-avatar-fallback user-link" data-user-id="${c.authorId}" style="cursor:pointer;">${c.authorName.charAt(0)}</div>`;
        return `
          <div class="comment-item">
            ${avatarHTML}
            <div class="comment-bubble">
              <div class="comment-author user-link" data-user-id="${c.authorId}" style="cursor:pointer;display:inline-block;">${escapeHTML(c.authorName)} <span style="font-weight:400;color:var(--c-text-hint);font-size:0.72rem;">· ${formatTime(c.createdAt)}</span></div>
              <div class="comment-text">${escapeHTML(c.text)}</div>
            </div>
          </div>
        `;
      }).join('');

  // 已登入：顯示輸入框與送出按鈕
  const inputHTML = isLoggedIn
    ? `<div class="comment-input-row">
        <input type="text" class="comment-input" placeholder="留下你的想法..." data-post-id="${post.id}" maxlength="200" />
        <button class="btn-send btn-send-comment" data-post-id="${post.id}" aria-label="送出留言">
          ${sendSVG()}
        </button>
      </div>`
    : '';

  return `
    <div class="comment-list">${commentsListHTML}</div>
    ${inputHTML}
  `;
}

/* ============================================================
   SECTION 9：貼文卡片事件綁定
   ============================================================ */

/**
 * 綁定貼文容器內的互動事件
 * 使用事件委派（event delegation）提升效能
 */
function bindPostCardEvents(container, currentUser) {
  container.addEventListener('click', e => {
    const isLoggedIn = !!currentUser;

    // ── 點擊使用者 (查看個人頁面)
    const userLink = e.target.closest('.user-link');
    if (userLink) {
      const targetId = userLink.dataset.userId;
      const allUsers = getUsers();
      const targetUser = allUsers.find(u => u.id === targetId);
      if (targetUser) {
        if (isLoggedIn) {
          renderProfileView(targetUser, 'app');
          showSubView('profile');
        } else {
          renderProfileView(targetUser, 'guest');
          showSubView('guest-profile');
        }
      }
      return;
    }

    // ── 刪除貼文
    const deleteBtn = e.target.closest('.btn-delete-post');
    if (deleteBtn) {
      if (!isLoggedIn) return;
      const postId = deleteBtn.dataset.postId;
      if (confirm('確定要刪除這則貼文嗎？')) {
        deletePost(postId, container);
      }
      return;
    }

    // ── 按讚
    const likeBtn = e.target.closest('.btn-like');
    if (likeBtn) {
      if (!isLoggedIn) { showGuestModal(); return; }
      const postId = likeBtn.dataset.postId;
      toggleLike(postId, currentUser, container);
      return;
    }

    // ── 展開 / 收起留言
    const commentToggle = e.target.closest('.btn-comment-toggle');
    if (commentToggle) {
      const postId = commentToggle.dataset.postId;
      const section = container.querySelector(`#comments-${postId}`);
      if (!section) return;

      if (!isLoggedIn) {
        // 訪客：可以看留言，但不能互動
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
        return;
      }
      section.style.display = section.style.display === 'none' ? 'block' : 'none';
      if (section.style.display === 'block') {
        const input = section.querySelector('.comment-input');
        if (input) input.focus();
      }
      return;
    }

    // ── 留言輸入框 focus（訪客拒絕）
    const commentInput = e.target.closest('.comment-input');
    if (commentInput && !currentUser) {
      showGuestModal();
      return;
    }

    // ── 送出留言
    const sendBtn = e.target.closest('.btn-send-comment');
    if (sendBtn) {
      if (!isLoggedIn) { showGuestModal(); return; }
      const postId = sendBtn.dataset.postId;
      const input  = container.querySelector(`.comment-input[data-post-id="${postId}"]`);
      submitComment(postId, input, currentUser, container);
      return;
    }
  });

  // 按 Enter 送出留言
  container.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList.contains('comment-input')) {
      const postId = e.target.dataset.postId;
      submitComment(postId, e.target, currentUser, container);
    }
  });
}

/* ============================================================
   SECTION 10：按讚 / 留言 / 刪除 功能
   ============================================================ */

/** 刪除貼文 */
function deletePost(postId, container) {
  let posts = getPosts();
  posts = posts.filter(p => p.id !== postId);
  savePosts(posts);

  document.querySelectorAll(`.post-card[data-post-id="${postId}"]`).forEach(el => el.remove());

  if (container.querySelectorAll('.post-card').length === 0) {
    if (container.id === 'my-posts-list') {
      container.innerHTML = '<p class="empty-hint">尚未發佈任何貼文。</p>';
    } else if (container.id === 'feed-post-list') {
      container.innerHTML = '<p class="empty-hint">目前還沒有任何貼文，成為第一個發文的人吧！</p>';
    }
  }
}

/** 切換按讚狀態 */
function toggleLike(postId, user, container) {
  const posts = getPosts();
  const post  = posts.find(p => p.id === postId);
  if (!post) return;

  post.likes = post.likes || [];
  const idx = post.likes.indexOf(user.id);
  if (idx === -1) {
    post.likes.push(user.id);
  } else {
    post.likes.splice(idx, 1);
  }
  savePosts(posts);

  // 局部更新按讚按鈕 UI（不整頁重渲）
  const btn = container.querySelector(`.btn-like[data-post-id="${postId}"]`);
  if (!btn) return;
  const hasLiked = post.likes.includes(user.id);
  btn.innerHTML = `${hasLiked ? heartFilledSVG() : heartSVG()} <span class="like-count">${post.likes.length > 0 ? post.likes.length : ''}</span>`;
  btn.classList.toggle('liked', hasLiked);
}

/** 送出留言並即時更新 UI */
function submitComment(postId, inputEl, user, container) {
  const text = (inputEl.value || '').trim();
  if (!text) return;

  const posts = getPosts();
  const post  = posts.find(p => p.id === postId);
  if (!post) return;

  post.comments = post.comments || [];
  post.comments.push({
    id:          `c_${Date.now()}`,
    authorId:    user.id,
    authorName:  user.name,
    authorAvatar: user.avatar || '',
    text,
    createdAt: Date.now()
  });
  savePosts(posts);

  // 清空輸入框
  inputEl.value = '';

  // 即時更新留言列表（局部重渲）
  const section = container.querySelector(`#comments-${postId}`);
  if (section) {
    section.innerHTML = renderCommentsHTML(post, user);
    // 重新綁定新輸入框的 Enter 事件（事件委派已處理，不需額外綁定）
    // 保持展開狀態
    section.style.display = 'block';
  }

  // 更新留言數徽章
  const toggle = container.querySelector(`.btn-comment-toggle[data-post-id="${postId}"] span`);
  if (toggle) toggle.textContent = `${post.comments.length} 留言`;

  // 同步更新個人首頁（若已渲染）
  const myPostsContainer = document.getElementById('my-posts-list');
  if (myPostsContainer && myPostsContainer.querySelector(`[data-post-id="${postId}"]`)) {
    const mSection = myPostsContainer.querySelector(`#comments-${postId}`);
    if (mSection) {
      mSection.innerHTML = renderCommentsHTML(post, user);
    }
  }
}

/* ============================================================
   SECTION 11：訪客提示 Modal
   ============================================================ */

function showGuestModal() {
  document.getElementById('modal-guest').classList.remove('hidden');
}
function hideGuestModal() {
  document.getElementById('modal-guest').classList.add('hidden');
}

/* ============================================================
   SECTION 12：SVG 圖示（純 inline，無外部依賴）
   ============================================================ */

function heartSVG() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
}
function heartFilledSVG() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
}
function commentSVG() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
}
function sendSVG() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
}
function trashSVG() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
}

/* ============================================================
   SECTION 13：防 XSS 工具
   ============================================================ */

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   SECTION 14：初始化（DOMContentLoaded）
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth 初始化
  initAuthTabs();
  initAvatarUpload();
  initCreatePost();
  initPasswordToggles();

  // ── 登入按鈕
  document.getElementById('btn-login').addEventListener('click', doLogin);

  // ── Enter 鍵送出登入
  ['login-id','login-pw'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  });

  // ── 註冊按鈕
  document.getElementById('btn-register').addEventListener('click', doRegister);

  // ── 訪客瀏覽按鈕
  document.getElementById('btn-guest').addEventListener('click', () => {
    renderGuestFeedView();
    showView('guest');
    showSubView('guest-feed');
  });

  // ── 訪客頁面：登入 / 註冊按鈕
  document.getElementById('btn-guest-login').addEventListener('click', () => {
    showView('auth');
  });

  // ── 登出 → 直接進登入頁面
  document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession();
    
    // 清空登入欄位
    document.getElementById('login-id').value = '';
    document.getElementById('login-pw').value = '';
    document.getElementById('login-error').textContent = '';

    // 切換回登入分頁
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="login"]').classList.add('active');
    document.getElementById('tab-login').classList.add('active');

    showView('auth');
  });

  // ── 導覽列：個人主頁
  document.getElementById('nav-profile').addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user) return;
    renderProfileView(user);
    showSubView('profile');
  });

  // ── 導覽列：分享區
  document.getElementById('nav-feed').addEventListener('click', () => {
    renderFeedView();
    showSubView('feed');
  });

  // ── 新增貼文按鈕（個人首頁）
  document.getElementById('btn-go-create').addEventListener('click', goToCreate);

  // ── 返回按鈕（發文頁）
  document.getElementById('btn-back-from-create').addEventListener('click', () => {
    const user = getCurrentUser();
    if (user) renderProfileView(user);
    showSubView('profile');
  });

  // ── 返回按鈕（他人頁面 -> 分享區）
  const btnBackToFeed = document.getElementById('btn-back-to-feed');
  if (btnBackToFeed) {
    btnBackToFeed.addEventListener('click', () => {
      renderFeedView();
      showSubView('feed');
    });
  }

  // ── 返回按鈕（訪客他人頁面 -> 訪客分享區）
  const btnGuestBackToFeed = document.getElementById('btn-guest-back-to-feed');
  if (btnGuestBackToFeed) {
    btnGuestBackToFeed.addEventListener('click', () => {
      renderGuestFeedView();
      showSubView('guest-feed');
    });
  }

  // ── Modal：登入 / 註冊 / 取消
  const cancel2faBtn = document.getElementById('modal-2fa-cancel');
  if (cancel2faBtn) cancel2faBtn.addEventListener('click', hideCaptchaModal);

  document.getElementById('modal-go-login').addEventListener('click', () => {
    hideGuestModal();
    // 切到登入 tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="login"]').classList.add('active');
    document.getElementById('tab-login').classList.add('active');
    showView('auth');
  });
  document.getElementById('modal-go-register').addEventListener('click', () => {
    hideGuestModal();
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="register"]').classList.add('active');
    document.getElementById('tab-register').classList.add('active');
    showView('auth');
  });
  document.getElementById('modal-cancel').addEventListener('click', hideGuestModal);

  // 點擊 Modal 背景關閉
  document.getElementById('modal-guest').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-guest')) hideGuestModal();
  });

  // ── 啟動邏輯：檢查是否有 session
  const user = getCurrentUser();
  if (user) {
    enterApp();
  } else {
    showView('auth');
  }
});
