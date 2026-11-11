// Firebase 初期化 + 動画視聴イベント送信 + アカウント連携（Millipro-Chronicle 連携）
// 詳細は「連携ハンドオフ.md」§2・§3 参照。config 未設定なら何もしない（エラーも出さない）。

var firebaseReady = false

function getFirebaseConfig() {
  if (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG) return FIREBASE_CONFIG
  if (typeof firebaseConfig !== 'undefined' && firebaseConfig) return firebaseConfig
  return null
}

function initFirebase() {
  if (firebaseReady || typeof firebase === 'undefined') return
  var cfg = getFirebaseConfig()
  if (!cfg || !cfg.apiKey || !cfg.databaseURL) return
  firebase.initializeApp(cfg)
  firebaseReady = true
}

function firebaseAvailable() {
  return firebaseReady && typeof firebase !== 'undefined'
}

// 本アプリが発行する playerId（localStorage.millipro_userdata）を読む
function getMilliproPlayerId() {
  try {
    var ud = JSON.parse(localStorage.getItem('millipro_userdata'))
    return ud && ud.playerId ? ud.playerId : null
  } catch (e) { return null }
}

// 連携IDの手動設定（ログイン不要フォールバック用。§1-4）
function setMilliproPlayerId(id) {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  if (!ud || typeof ud !== 'object') ud = { createdAt: Date.now() }
  ud.playerId = String(id)
  ud.updatedAt = Date.now()
  localStorage.setItem('millipro_userdata', JSON.stringify(ud))
  return ud
}

// 視聴完了イベント送信（応援ボタン押下時。1動画1日1回。set の上書きで重複防止）
function recordWatch(videoId, durationSec) {
  initFirebase()
  var pid = getMilliproPlayerId()
  if (!firebaseReady || !pid || !videoId) return
  var date = new Date()
  var mm = String(date.getMonth() + 1).padStart(2, '0')
  var dd = String(date.getDate()).padStart(2, '0')
  var dateKey = date.getFullYear() + '-' + mm + '-' + dd
  firebase.database().ref('millipro/watchEvents/' + pid + '/' + videoId + '/' + dateKey)
    .set({ watchedAt: Date.now(), durationSec: durationSec || 0 })
    .catch(function (e) { console.warn('watchEvent write failed', e) })
}

// ---------- アカウント連携（Firebase Auth・§2-4） ----------

function isAuthAvailable() {
  return firebaseAvailable() && typeof firebase.auth === 'function'
}

function getMilliproUid() {
  if (!isAuthAvailable()) return null
  var u = firebase.auth().currentUser
  return u ? u.uid : null
}

// ログイン状態の変化を監視（未ログイン/未設定なら null を渡す）
var _mpAuthResolved = false

function onMilliproAuth(cb) {
  if (!isAuthAvailable()) { cb(null); return }
  firebase.auth().onAuthStateChanged(function (user) {
    _mpAuthResolved = true
    cb(user ? user.uid : null)
  })
}

// Firebase のログイン復元が終わるまで待ってからモーダルを開く。
// 復元前に開くと、ログイン済みでもログイン画面が一瞬表示されるため。
function mpAuthReady(cb) {
  if (!isAuthAvailable() || _mpAuthResolved) { cb(); return }
  var done = false
  var unsub = null
  var finish = function () {
    if (done) return
    done = true
    _mpAuthResolved = true
    if (typeof unsub === 'function') unsub()
    cb()
  }
  unsub = firebase.auth().onAuthStateChanged(function () { finish() })
  setTimeout(finish, 1500)
}

function milliproLogin(email, password) {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  return firebase.auth().signInWithEmailAndPassword(email, password)
}

function milliproSignup(email, password) {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  return firebase.auth().createUserWithEmailAndPassword(email, password)
}

function milliproLogout() {
  if (!isAuthAvailable()) return Promise.resolve()
  return firebase.auth().signOut()
}

// ---------- OAuth（Google / X） ----------
function oauthUserAgent() {
  return (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : ''
}

function isOAuthInAppBrowser() {
  var ua = oauthUserAgent()
  return /Twitter|Line|Instagram|FBAN|FBAV|FB_IAB|FBAN\/Messenger|MicroMessenger|KAKAOTALK|NAVER|Snapchat|Pinterest|; wv\)|WebView/i.test(ua)
}

function isOAuthMobileBrowser() {
  var ua = oauthUserAgent()
  var iPadOS = /Macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1
  return iPadOS || /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
}

function isOAuthStandalone() {
  try {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.standalone === true) return true
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true
  } catch (e) {}
  return false
}

function signInWithOAuthProvider(provider) {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  // モバイル・アプリ内ブラウザ・ホーム画面アプリでは、ポップアップのストレージ分離や
  // ポップアップブロックでログイン状態が引き継がれないことがあるためリダイレクトを使う。
  if (isOAuthInAppBrowser() || isOAuthMobileBrowser() || isOAuthStandalone()) {
    return firebase.auth().signInWithRedirect(provider)
  }
  return firebase.auth().signInWithPopup(provider).catch(function (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
      return firebase.auth().signInWithRedirect(provider)
    }
    return Promise.reject(e)
  })
}

function milliproLoginWithGoogle() {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  var provider = new firebase.auth.GoogleAuthProvider()
  try { provider.setCustomParameters({ prompt: 'select_account' }) } catch (e) {}
  return signInWithOAuthProvider(provider)
}

function milliproLoginWithTwitter() {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  var provider = new firebase.auth.TwitterAuthProvider()
  return signInWithOAuthProvider(provider)
}

function consumeMilliproRedirectResult() {
  if (!isAuthAvailable() || typeof firebase.auth().getRedirectResult !== 'function') return Promise.resolve(null)
  return firebase.auth().getRedirectResult().catch(function (e) { return Promise.reject(e) })
}

function oauthErrorMessage(e) {
  if (!e || !e.code) return (e && e.message) || 'エラーが発生しました。'
  if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return 'ログインがキャンセルされました。'
  if (e.code === 'auth/popup-blocked') return 'ポップアップがブロックされました。リダイレクトで再試行しています...'
  if (e.code === 'auth/account-exists-with-different-credential') return 'このメールアドレスは既に別のログイン方法（メール/ Google / X）で登録されています。元の方法でログインした後、マイページで紐付けてください。'
  if (e.code === 'auth/credential-already-in-use') return 'この Google/X アカウントは既に別のアカウントに紐付けられています。'
  if (e.code === 'auth/requires-recent-login') return 'セキュリティのため再ログインが必要です。一度ログアウトして再ログインしてください。'
  if (e.code === 'auth/network-request-failed') return '通信エラーです。接続を確認してください。'
  if (e.code === 'auth/user-disabled') return 'このアカウントは無効化されています。'
  if (e.code === 'auth/operation-not-allowed') return 'このログイン方法は現在無効です。管理者にお問い合わせください。'
  if (e.code === 'auth/unauthorized-domain') return 'このドメインはFirebase Authenticationの承認済みドメインに登録されていません。管理者に連絡してください。'
  if (e.code === 'auth/operation-not-supported-in-this-environment') return 'このブラウザではログイン用のポップアップを開けません。別のブラウザでお試しください。'
  if (e.code === 'auth/web-storage-unsupported') return 'ブラウザのCookie/サイトデータが無効になっています。設定を確認して再試行してください。'
  if (e.code === 'auth/redirect-cancelled-by-user') return 'ログインがキャンセルされました。'
  return e.message || 'エラーが発生しました。'
}

function getLinkedProviders() {
  if (!isAuthAvailable()) return []
  var u = firebase.auth().currentUser
  if (!u || !u.providerData) return []
  return u.providerData.map(function (p) { return p.providerId })
}

function linkWithOAuthProvider(provider) {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  var user = firebase.auth().currentUser
  if (!user) return Promise.reject(new Error('not logged in'))
  // ログインと同様、モバイル・アプリ内ブラウザ・ホーム画面アプリではリダイレクトを使う。
  if (isOAuthInAppBrowser() || isOAuthMobileBrowser() || isOAuthStandalone()) {
    return user.linkWithRedirect(provider)
  }
  return user.linkWithPopup(provider).catch(function (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
      return user.linkWithRedirect(provider)
    }
    return Promise.reject(e)
  })
}

function milliproLinkWithGoogle() {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  var provider = new firebase.auth.GoogleAuthProvider()
  try { provider.setCustomParameters({ prompt: 'select_account' }) } catch (e) {}
  return linkWithOAuthProvider(provider)
}

function milliproLinkWithTwitter() {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  var provider = new firebase.auth.TwitterAuthProvider()
  return linkWithOAuthProvider(provider)
}

function newPlayerIdFallback() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'P' + Date.now()
}

// ---------- 最推し / 推しの共有（全サイト共通 ID） ----------
// 詳細は「連携ハンドオフ.md」の「最推し/推しの共有」参照。ID は他のサイトと同一。

var MILLIPRO_TALENTS = {
  konomi: { name: '甘狼このみ' },
  nono: { name: '音ノ乃のの' },
  akubi: { name: 'あくび・でもんすぺーど' },
  rako: { name: '音ノ瀬らこ' },
  yura: { name: 'ゆらぎゆら' },
  rizu: { name: '雨夜リズ' },
  tsukuri: { name: '眠雲ツクリ' },
  nuhu: { name: '虹深°ぬふ' },
  rei: { name: '夕霧レイ' },
  koma: { name: '小廻こま' },
  mahoro: { name: '鹿乃まほろ' },
};

// 旧表記 tukuri との互換エイリアス（正式は tsukuri）。
// 異なる表記の ID が混在しても正規化して重複を防ぐ。
var MP_TALENT_ALIAS = { tukuri: 'tsukuri' }
function mpTalentId(id) { return (id && MP_TALENT_ALIAS[id]) ? MP_TALENT_ALIAS[id] : id }
function mpNormalizeTalentIds(ids) {
  if (!Array.isArray(ids)) return []
  var seen = {}
  var out = []
  for (var i = 0; i < ids.length; i++) {
    var id = mpTalentId(ids[i])
    if (!id || seen[id] || !MILLIPRO_TALENTS[id]) continue
    seen[id] = true
    out.push(id)
  }
  return out.slice(0, 10)
}

// 最推し/推しをローカルから読み出す（ログイン中は completeMilliproLogin 経由でクラウドが反映済み）
function getMilliproOshi() {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  return {
    ultimateOshi: ud && MILLIPRO_TALENTS[mpTalentId(ud.ultimateOshi)] ? mpTalentId(ud.ultimateOshi) : null,
    favorites: mpNormalizeTalentIds(ud && ud.favorites),
  }
}

// 最推し/推しを保存（不正ID除去・最大10人）。ログイン中はクラウド（profile）にも保存。
// 戻り値: Promise<boolean> — true ならクラウド保存済み。未ログインでもローカルには保存される。
function updateMilliproOshi(ultimateId, favIds) {
  var ult = MILLIPRO_TALENTS[mpTalentId(ultimateId)] ? mpTalentId(ultimateId) : null
  var favs = mpNormalizeTalentIds(favIds)
  if (ult && favs.indexOf(ult) < 0) favs.push(ult)
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  if (!ud || typeof ud !== 'object') ud = { createdAt: Date.now() }
  ud.ultimateOshi = ult
  ud.favorites = favs
  ud.updatedAt = Date.now()
  localStorage.setItem('millipro_userdata', JSON.stringify(ud))
  var uid = getMilliproUid()
  if (!uid) return Promise.resolve(false)
  return updateMilliproProfile({ ultimateOshi: ult, favorites: favs })
}

// プロフィールの一部をクラウドに保存（ログイン中のみ。未ログインなら何もしない）
// patch 例: { icon: '😊' } や { playerName: '...' } や { ultimateOshi: 'konomi', favorites: [...] }
// 戻り値: Promise<boolean>（保存できたか）
function updateMilliproProfile(patch) {
  if (!isAuthAvailable()) return Promise.resolve(false)
  var uid = getMilliproUid()
  if (!uid) return Promise.resolve(false)
  if (!patch || typeof patch !== 'object') return Promise.resolve(false)
  patch.updatedAt = Date.now()
  var ref = firebase.database().ref('millipro/users/' + uid + '/profile')
  return ref.once('value').then(function (snap) {
    var p = snap.val()
    if (p && typeof p === 'object') return ref.update(patch)
    return ref.set(patch)
  }).then(function () { return true }).catch(function (e) {
    console.warn('profile update failed:', e)
    return false
  })
}

// パスワード再設定メールを送信（全サイト共通アカウント）
function milliproResetPassword(email) {
  if (!isAuthAvailable()) return Promise.reject(new Error('auth unavailable'))
  return firebase.auth().sendPasswordResetEmail(String(email).trim(), {
    url: (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin + '/' : '',
    handleCodeInApp: false,
  })
}

// プロフィールを保証する（無ければローカルの playerId / 名前 / アイコン / 一言 / 最推し / 推しで作成）→ Promise<profile>
function ensureMilliproProfile(uid) {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  var localId = ud && ud.playerId
  var localName = ud && ud.playerName
  var localIcon = ud && (ud.icon || ud.playerIcon)
  var localComment = ud && (ud.comment || ud.playerMessage)
  var localUltimateOshi = ud && MILLIPRO_TALENTS[mpTalentId(ud.ultimateOshi)] ? mpTalentId(ud.ultimateOshi) : null
  var localFavorites = mpNormalizeTalentIds(ud && ud.favorites)

  return firebase.database().ref('millipro/users/' + uid + '/profile').once('value').then(function (snap) {
    var p = snap.val()
    var now = Date.now()
    if (p && typeof p === 'object') {
      var changed = false
      if (!p.playerId) { p.playerId = localId || newPlayerIdFallback(); changed = true }
      if (!p.playerName && localName) { p.playerName = localName; changed = true }
      if (!p.icon && (p.playerIcon || localIcon)) { p.icon = p.playerIcon || localIcon; changed = true }
      if (!p.comment && (p.playerMessage || localComment)) { p.comment = p.playerMessage || localComment; changed = true }
      if (!p.ultimateOshi && localUltimateOshi) { p.ultimateOshi = localUltimateOshi; changed = true }
      if (!p.favorites && localFavorites.length) { p.favorites = localFavorites; changed = true }
      if (changed) firebase.database().ref('millipro/users/' + uid + '/profile').set(p)
      return p
    }
    var np = {
      playerId: localId || newPlayerIdFallback(),
      playerName: localName || '',
      icon: localIcon || '',
      comment: localComment || '',
      ultimateOshi: localUltimateOshi,
      favorites: localFavorites,
      updatedAt: now,
    }
    firebase.database().ref('millipro/users/' + uid + '/profile').set(np)
    return np
  })
}

// profile の playerId / playerName / icon / comment / 最推し / 推し をこの端末の localStorage に反映（他項目は保持）
function applyMilliproProfile(profile) {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  if (!ud || typeof ud !== 'object') ud = { createdAt: Date.now() }
  ud.playerId = profile.playerId
  if (profile.playerName) ud.playerName = profile.playerName
  if (profile.icon) { ud.icon = profile.icon; delete ud.playerIcon }
  else if (profile.playerIcon) ud.icon = profile.playerIcon
  if (profile.comment) { ud.comment = profile.comment; delete ud.playerMessage }
  else if (profile.playerMessage) ud.comment = profile.playerMessage
  if (profile.ultimateOshi && MILLIPRO_TALENTS[mpTalentId(profile.ultimateOshi)]) ud.ultimateOshi = mpTalentId(profile.ultimateOshi)
  if (Array.isArray(profile.favorites)) {
    ud.favorites = mpNormalizeTalentIds(profile.favorites)
  }
  ud.updatedAt = Date.now()
  try { localStorage.setItem('millipro_userdata', JSON.stringify(ud)) } catch (e) {}
  return ud
}

// ログイン時にまとめて実行（Unishare / Games 版。gamedata 同期は本アプリのみの仕事）
var _mpProfile = null
function completeMilliproLogin(uid) {
  return ensureMilliproProfile(uid).then(function (profile) {
    _mpProfile = profile
    applyMilliproProfile(profile)
    return profile
  })
}

// ---------- サイト別データ同期（unishare 専用パス。gamedata は本アプリ専用なので触れない） ----------
// millipro/users/{uid}/unishare/{favs|cheers|notif}

function mpCloudPath(uid, sub) {
  return 'millipro/users/' + uid + '/unishare' + (sub ? '/' + sub : '')
}

function mpReadCloud(uid, sub) {
  if (!uid || !firebaseAvailable()) return Promise.resolve(null)
  return firebase.database().ref(mpCloudPath(uid, sub)).once('value').then(function (snap) {
    return snap.val()
  }).catch(function () { return null })
}

function mpWriteCloud(uid, sub, val) {
  if (!uid || !firebaseAvailable()) return Promise.resolve()
  return firebase.database().ref(mpCloudPath(uid, sub)).set(val).catch(function (e) {
    console.warn('cloud write failed:', sub, e && e.message)
  })
}

function mpPushFavs(favs) {
  return mpWriteCloud(getMilliproUid(), 'favs', Array.isArray(favs) ? favs : [])
}

function mpPushNotif(settings) {
  return mpWriteCloud(getMilliproUid(), 'notif', settings || null)
}

function mpPushCheer(videoId) {
  var uid = getMilliproUid()
  if (!uid || !videoId || !firebaseAvailable()) return Promise.resolve()
  var ref = firebase.database().ref(mpCloudPath(uid, 'cheers/' + videoId))
  return ref.once('value').then(function (snap) {
    var c = snap.val() || { count: 0 }
    c.count = (c.count || 0) + 1
    c.lastAt = Date.now()
    return ref.set(c)
  }).catch(function (e) { console.warn('cheer push failed:', e && e.message) })
}

// ログイン後に各サイト側でデータを同期するためのフック（video.js が mpSetAfterLogin で登録）
var _mpAfterLogin = null
function mpSetAfterLogin(cb) { _mpAfterLogin = cb }

// プロフィール情報（localStorage + ログイン中はメール）をまとめて返す
function mpProfileInfo() {
  var ud = null
  try { ud = JSON.parse(localStorage.getItem('millipro_userdata')) } catch (e) {}
  var pid = ud && ud.playerId ? ud.playerId : ''
  var name = ud && ud.playerName ? ud.playerName : ''
  var icon = ud && ud.icon ? ud.icon : ''
  var comment = ud && ud.comment ? ud.comment : ''
  var email = ''
  try {
    if (isAuthAvailable() && firebase.auth().currentUser) email = firebase.auth().currentUser.email || ''
  } catch (e) {}
  return { pid: pid, name: name, icon: icon, comment: comment, email: email }
}

// アイコン（画像URL / dataURL）を表示。未設定なら名前の頭文字 or デフォルト
function renderUserIcon(el, user) {
  if (!el) return
  var icon = user && user.icon
  if (typeof icon === 'string' && /^(https?:\/\/|data:image\/)/i.test(icon)) {
    el.innerHTML = '<img src="' + icon + '" alt="icon">'
  } else if (icon) {
    el.textContent = icon
  } else if (user && user.playerName) {
    el.textContent = user.playerName.charAt(0)
  } else {
    el.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  }
}

// UI（ホーム画面のアカウントカード等）を再描画するためのフック（video.js が mpSetOnUI で登録）
var _mpOnUI = null
function mpSetOnUI(cb) { _mpOnUI = cb }
function mpNotifyUI() {
  if (typeof _mpOnUI === 'function') { try { _mpOnUI() } catch (e) {} }
}

// ---------- アカウント連携UI ----------

function mp_show(id) {
  var m = document.getElementById(id)
  if (m) m.classList.add('open')
}

function mp_hide(id) {
  var m = document.getElementById(id)
  if (m) m.classList.remove('open')
}

function mpRender(uid) {
  var hb = document.getElementById('acctBtn')
  if (hb) {
    var info = uid ? mpProfileInfo() : { pid: '', name: '', icon: '', comment: '', email: '' }
    // ヘッダーのプロフィール丸アイコン (#profile-header-icon) も同様に未ログイン時はデフォルト表示
    var headerIcon = document.getElementById('profile-header-icon')
    if (headerIcon) {
      if (uid && info.icon) renderUserIcon(headerIcon, info)
      else if (uid && info.name) headerIcon.textContent = info.name.charAt(0)
      else headerIcon.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    }
    hb.textContent = ''
    var ico = document.createElement('span')
    ico.className = 'acct-btn-ico'
    if (uid) renderUserIcon(ico, info)
    else ico.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    var nm = document.createElement('span')
    nm.className = 'acct-btn-name'
    nm.textContent = uid ? (info.name || (info.pid ? '連携済み' : '')) : ''
    hb.appendChild(ico)
    if (nm.textContent) hb.appendChild(nm)
    hb.dataset.logged = uid ? '1' : '0'
    hb.title = uid && info.pid ? ('連携ID: ' + info.pid) : 'アカウント連携'
  }
  var guest = document.getElementById('mp-account-guest')
  var ok = document.getElementById('mp-account-ok')
  if (!guest || !ok) { mpNotifyUI(); return }
  if (uid) {
    guest.style.display = 'none'
    ok.style.display = 'block'
    document.getElementById('mp-pid').textContent = getMilliproPlayerId() || uid
    mpLoadProfile(uid)
  } else {
    guest.style.display = 'block'
    ok.style.display = 'none'
  }
  mpNotifyUI()
}

// Firebase の profile（名前・アイコン・一言）をアカウント表示に反映
function mpLoadProfile(uid) {
  var nameEl = document.getElementById('mp-profile-name')
  if (!nameEl) return
  var render = function (p) {
    _mpProfile = p
    nameEl.textContent = p.playerName || '名無し'
    var msgEl = document.getElementById('mp-profile-msg')
    if (msgEl) msgEl.textContent = p.comment || p.playerMessage || ''
    var iconEl = document.getElementById('mp-profile-icon')
    if (iconEl) {
      var ic = p.icon || p.playerIcon || ''
      renderUserIcon(iconEl, { icon: ic, playerName: p.playerName || '' })
    }
  }
  if (_mpProfile) { render(_mpProfile); return }
  if (!uid || !firebaseAvailable()) return
  firebase.database().ref('millipro/users/' + uid + '/profile').once('value').then(function (snap) {
    var p = snap.val()
    if (p && typeof p === 'object') render(p)
  }).catch(function () {})
}

// プロフィール編集画面へ
function mpStartEdit() {
  var p = _mpProfile || {}
  var nameEl = document.getElementById('mp-pname')
  var iconEl = document.getElementById('mp-picon')
  var msgEl = document.getElementById('mp-pmsg')
  if (!nameEl || !iconEl || !msgEl) return
  nameEl.value = p.playerName || ''
  iconEl.value = ''
  msgEl.value = p.comment || p.playerMessage || ''
  var preview = document.getElementById('mp-picon-preview')
  if (preview) renderUserIcon(preview, { icon: p.icon || p.playerIcon || p.playerName || '', playerName: p.playerName || '' })
  var edit = document.getElementById('mp-account-edit')
  var ok = document.getElementById('mp-account-ok')
  if (edit) edit.style.display = 'block'
  if (ok) ok.style.display = 'none'
}

// アイコン入力欄のプレビューを更新（編集画面）
function mpUpdatePiconPreview() {
  var preview = document.getElementById('mp-picon-preview')
  if (!preview) return
  var v = document.getElementById('mp-picon').value.trim()
  renderUserIcon(preview, { icon: v, playerName: '' })
}

function mpCancelEdit() {
  var edit = document.getElementById('mp-account-edit')
  var ok = document.getElementById('mp-account-ok')
  if (edit) edit.style.display = 'none'
  if (ok) ok.style.display = 'block'
}

function mpSaveProfile() {
  var uid = getMilliproUid()
  if (!uid) { alert('ログインが必要です'); return }
  var name = document.getElementById('mp-pname').value.trim()
  var icon = document.getElementById('mp-picon').value.trim()
  var msg = document.getElementById('mp-pmsg').value.trim()
  var p = _mpProfile || { playerId: getMilliproPlayerId() || '' }
  p.playerName = name
  if (icon) p.icon = icon
  p.comment = msg
  p.updatedAt = Date.now()
  _mpProfile = p
  firebase.database().ref('millipro/users/' + uid + '/profile').set(p)
    .then(function () {
      applyMilliproProfile(p)
      mpRender(uid)
      mpCancelEdit()
      alert('プロフィールを保存しました')
    })
    .catch(function (e) { console.warn('profile save failed', e) })
}

// アカウント連携ポップアップ — Milli Unishare 参考: 4モーダル構成 (acct/login/signup/mypage)
function mpOpen() {
  var uid = getMilliproUid()
  // ログイン復元中に開かれた場合は、復元結果を待ってから表示を決める
  if (!uid && isAuthAvailable() && !_mpAuthResolved) {
    mpAuthReady(function () { mpOpen() })
    return
  }
  // 未ログイン時はログインポップアップを最優先表示（ユーザ要望: ログインが最初）
  if (uid) mp_show('acctModal')
  else mp_show('loginModal')
  mpRender(uid)
}
function mpOpenLinkId() {
  mpClose()
  mp_show('acctModal')
  mpRender(getMilliproUid())
  // 連携ID入力欄にフォーカス
  setTimeout(function(){ var el=document.getElementById('mp-id'); if(el) el.focus() }, 300)
}

// 全ポップアップを閉じる（Unishare と同機構: 4モーダル + 旧 login-popup 互換 + パスワードリセット）
function mpClose() {
  mp_hide('acctModal')
  mp_hide('loginModal')
  mp_hide('signupModal')
  mp_hide('mypageModal')
  mp_hide('login-popup')
  var pr = document.getElementById('password-reset-dialog')
  if (pr) { pr.classList.add('hidden'); pr.classList.remove('open') }
}

function mpToggle() {
  var ids = ['acctModal','loginModal','signupModal','mypageModal','login-popup']
  for (var i=0;i<ids.length;i++) {
    var m=document.getElementById(ids[i])
    if (m && m.classList.contains('open')) { mpClose(); return }
  }
  mpOpen()
}

// ログイン / 新規登録 / マイページ を別ポップアップで開く（Unishare と同一API）
function mpOpenLogin() {
  mpClose()
  mp_show('loginModal')
  // 旧 login-popup 互換: タブがある場合はログイン側を表示
  var t = document.getElementById('mp-tab-login'); if (t && typeof mpTab === 'function') mpTab('login')
}

function mpOpenSignup() {
  mpClose()
  mp_show('signupModal')
  var t = document.getElementById('mp-tab-signup'); if (t && typeof mpTab === 'function') mpTab('signup')
}

function mpOpenMypage() {
  mpClose()
  // 本ポータルでは mypage は account.html（Unishare は mypage.html）
  location.href = 'account.html'
}

function mpTogglePw(id) {
  var inp = document.getElementById(id)
  if (!inp) return
  var btn = document.querySelector('[data-pw="' + id + '"]')
  var isPw = inp.type === 'password'
  inp.type = isPw ? 'text' : 'password'
  if (btn) btn.innerHTML = isPw
    ? '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" x2="23" y1="1" y2="23"/></svg>'
    : '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
}

function mpAuthMsg(e) {
  var j = e && e.code ? e.code : String(e)
  if (j.indexOf('email-already-in-use') >= 0) return 'そのメールは既に登録されています。ログインしてください'
  if (j.indexOf('wrong-password') >= 0 || j.indexOf('user-not-found') >= 0) return 'メールまたはパスワードが違います'
  if (j.indexOf('weak-password') >= 0) return 'パスワードは6文字以上にしてください'
  if (j.indexOf('invalid-email') >= 0) return 'メールアドレスの形式が正しくありません'
  return 'エラー: ' + j
}

function mpSubmitLogin() {
  var emailEl = document.getElementById('mp-email')
  var passEl = document.getElementById('mp-pass')
  // 互換: 旧ID mp2-email ではなく mp-email を使うが、フォールバックも
  var email = emailEl ? emailEl.value.trim() : ''
  var pass = passEl ? passEl.value : ''
  var msg = document.getElementById('mp-msg-login') || document.getElementById('mp-msg')
  var msg2 = document.getElementById('mp-msg')
  if (!email || !pass) { if (msg) msg.textContent = 'メールとパスワードを入力してください'; if (msg2 && msg2!==msg) msg2.textContent = 'メールとパスワードを入力してください'; return }
  milliproLogin(email, pass).then(function () {
    if (msg) msg.textContent = 'ログインしました...'
    if (msg2 && msg2!==msg) msg2.textContent = 'ログインしました...'
  }).catch(function (e) {
    var t = mpAuthMsg(e)
    if (msg) msg.textContent = t
    if (msg2 && msg2!==msg) msg2.textContent = t
  })
}

function mpSubmitSignup() {
  var emailEl = document.getElementById('mp-semail') || document.getElementById('mp2-email')
  var p1El = document.getElementById('mp-spass1') || document.getElementById('mp2-pass')
  var p2El = document.getElementById('mp-spass2') || document.getElementById('mp2-pass2')
  var email = emailEl ? emailEl.value.trim() : ''
  var p1 = p1El ? p1El.value : ''
  var p2 = p2El ? p2El.value : ''
  var msg = document.getElementById('mp-msg-signup') || document.getElementById('mp2-msg') || document.getElementById('mp-msg')
  var msg2 = document.getElementById('mp-msg')
  if (!email || !p1) { if (msg) msg.textContent = 'メールとパスワードを入力してください'; return }
  if (p1.length < 6) { if (msg) msg.textContent = 'パスワードは6文字以上にしてください'; return }
  if (p1 !== p2) { if (msg) msg.textContent = 'パスワードが一致しません'; return }
  milliproSignup(email, p1).then(function () {
    if (msg) msg.textContent = 'アカウントを作成しました...'
    if (msg2 && msg2!==msg) msg2.textContent = 'アカウントを作成しました...'
  }).catch(function (e) {
    var t = mpAuthMsg(e)
    if (msg) msg.textContent = t
    if (msg2 && msg2!==msg) msg2.textContent = t
  })
}

function mpLogout() {
  milliproLogout().then(function () {
    _mpProfile = null
    mpRender(getMilliproUid())
    mpRefreshBanner()
  })
}

function mpCopyId() {
  var pid = getMilliproPlayerId()
  if (!pid) { alert('連携IDが未設定です'); return }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(pid).then(function () { alert('コピーしました: ' + pid) })
  } else {
    var t = document.createElement('textarea')
    t.value = pid
    document.body.appendChild(t)
    t.select()
    document.execCommand('copy')
    t.remove()
    alert('コピーしました: ' + pid)
  }
}

function mpSetId() {
  var v = document.getElementById('mp-id').value.trim()
  if (!v) return
  setMilliproPlayerId(v)
  mpRender(getMilliproUid())
  mpClose()
  mpRefreshBanner()
  alert('連携IDを保存しました: ' + v)
}

// 連携案内バナー（ログイン任意・§2-4）
// 表示条件: ログイン済み または 連携ID設定済み なら非表示
function mpRefreshBanner() {
  var b = document.getElementById('mp-banner')
  if (!b) return
  var connected = (isAuthAvailable() && getMilliproUid()) || !!getMilliproPlayerId()
  b.style.display = connected ? 'none' : 'flex'
}

function mpHideBanner() {
  var b = document.getElementById('mp-banner')
  if (b) b.style.display = 'none'
}

// 「連携する」→ アカウント連携ポップアップを開く
function mpOpenAccount() {
  mpOpen()
}

// ---------- OAuth ポップアップ連携（Milli Orbisアカウント） — Unishare 参考 ----------
function mpSetAuthMessage(text) {
  var ids = ["mp-msg-login", "mp-msg-signup", "mp-msg"]
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i])
    if (el) el.textContent = text || ""
  }
}

function mpOAuthLogin(provider) {
  mpSetAuthMessage("処理中…")
  var p = null;
  if (provider === "google" && typeof milliproLoginWithGoogle === "function") p = milliproLoginWithGoogle();
  else if (provider === "twitter" && typeof milliproLoginWithTwitter === "function") p = milliproLoginWithTwitter();
  else { mpSetAuthMessage("未対応のプロバイダです"); return; }
  p.then(function (result) {
    var uid = (typeof getMilliproUid === "function" ? getMilliproUid() : null) || (result && result.user ? result.user.uid : null);
    // リダイレクト方式ではこの Promise は遷移開始時に解決し、user はまだ存在しない。
    // ログイン完了と誤表示せず、遷移中であることを案内する。
    if (!uid) { mpSetAuthMessage(result && result.user ? "Milli Orbisアカウントにログインしました" : "ログイン画面に移動しています…"); return; }
    if (typeof completeMilliproLogin === "function") {
      return completeMilliproLogin(uid).then(function () {
        mpSetAuthMessage("Milli Orbisアカウントにログインしました");
        if (typeof mpRender === "function") mpRender(uid);
        mpRefreshBanner();
        // ニックネーム未設定なら編集を促す（Unishare と同機構）
        var prof = _mpProfile || {}
        if (!prof.playerName) setTimeout(function(){ try{ mpOpen(); mpStartEdit(); }catch(e){} }, 400)
      });
    } else {
      mpSetAuthMessage("Milli Orbisアカウントにログインしました");
    }
  }).catch(function (e) {
    var friendly = (typeof oauthErrorMessage === "function" ? oauthErrorMessage(e) : null);
    mpSetAuthMessage(friendly || (e && e.message ? e.message : "ログインに失敗しました"));
  });
}

function mpRenderLinkProviders() {
  var container = document.getElementById("mp-link-providers");
  var msgEl = document.getElementById("mp-link-msg");
  if (!container) return;
  var uid = (typeof getMilliproUid === "function" ? getMilliproUid() : null);
  if (!uid) { container.innerHTML = ""; return; }
  var linked = (typeof getLinkedProviders === "function" ? getLinkedProviders() : []);
  var hasPassword = linked.indexOf("password") >= 0;
  var hasGoogle = linked.indexOf("google.com") >= 0;
  var hasTwitter = linked.indexOf("twitter.com") >= 0;
  var canUnlink = linked.length > 1;
  var html = '<div class="mp-link-title">🔗 ' + (window.T ? T("login.title") : "Milli Orbisアカウント") + ' 紐付け</div>';
  html += '<div class="mp-link-desc">' + (window.T ? T("login.linkDesc") : "別の方法を紐付けると、どちらでも同じデータでログインできます。") + '</div>';
  html += '<div class="mp-provider-row"><span>📧 ' + (window.T ? T("login.providerMail") : "メール") + '</span>' + (hasPassword ? '<span class="mp-badge on">' + (window.T ? T("login.linked") : "連携済み") + '</span>' + (canUnlink ? '<button type="button" class="mp-unlink-btn" onclick="mpUnlinkProvider(\'password\')">' + (window.T ? T("login.unlink") : "解除") + '</button>' : '') : '<span class="mp-badge">' + (window.T ? T("login.notLinked") : "未連携") + '</span>') + '</div>';
  html += '<div class="mp-provider-row"><span>G Google</span>' + (hasGoogle ? '<span class="mp-badge on">' + (window.T ? T("login.linked") : "連携済み") + '</span>' + (canUnlink ? '<button type="button" class="mp-unlink-btn" onclick="mpUnlinkProvider(\'google\')">' + (window.T ? T("login.unlink") : "解除") + '</button>' : '') : '<button type="button" class="mp-link-btn" onclick="mpLinkProvider(\'google\')">' + (window.T ? T("login.link") : "紐付ける") + '</button>') + '</div>';
  html += '<div class="mp-provider-row"><span>𝕏 X</span>' + (hasTwitter ? '<span class="mp-badge on">' + (window.T ? T("login.linked") : "連携済み") + '</span>' + (canUnlink ? '<button type="button" class="mp-unlink-btn" onclick="mpUnlinkProvider(\'twitter\')">' + (window.T ? T("login.unlink") : "解除") + '</button>' : '') : '<button type="button" class="mp-link-btn" onclick="mpLinkProvider(\'twitter\')">' + (window.T ? T("login.link") : "紐付ける") + '</button>') + '</div>';
  container.innerHTML = html;
  if (msgEl) msgEl.textContent = "";
}

function mpLinkProvider(provider) {
  var msgEl = document.getElementById("mp-link-msg");
  if (msgEl) msgEl.textContent = "処理中…";
  var p = null;
  if (provider === "google" && typeof milliproLinkWithGoogle === "function") p = milliproLinkWithGoogle();
  else if (provider === "twitter" && typeof milliproLinkWithTwitter === "function") p = milliproLinkWithTwitter();
  else { if (msgEl) msgEl.textContent = "未対応のプロバイダです"; return; }
  p.then(function () {
    if (msgEl) msgEl.textContent = "✓ 紐付けました";
    mpRenderLinkProviders();
  }).catch(function (e) {
    var friendly = (typeof oauthErrorMessage === "function" ? oauthErrorMessage(e) : null);
    if (msgEl) msgEl.textContent = friendly || (e && e.message ? e.message : "紐付けに失敗しました");
  });
}

function mpUnlinkProvider(provider) {
  var msgEl = document.getElementById("mp-link-msg");
  if (!msgEl) return;
  var confirmMsg = provider === "password" ? "メールの紐付けを解除しますか？（少なくとも1つのログイン方法が必要です）" : provider === "google" ? "Google の紐付けを解除しますか？" : "X の紐付けを解除しますか？";
  if (!confirm(confirmMsg)) return;
  msgEl.textContent = "処理中…";
  var user = (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser : null;
  if (!user) { msgEl.textContent = "ログインしていません"; return; }
  var pid = provider === "google" ? "google.com" : provider === "twitter" ? "twitter.com" : "password";
  user.unlink(pid).then(function () {
    msgEl.textContent = "✓ 解除しました";
    mpRenderLinkProviders();
  }).catch(function (e) {
    var friendly = (typeof oauthErrorMessage === "function" ? oauthErrorMessage(e) : null);
    msgEl.textContent = friendly || (e && e.message ? e.message : "解除に失敗しました");
  });
}

// 既存 mpRender をラップして紐付けUIも更新
(function () {
  var _origMpRender = mpRender;
  window.mpRender = function (uid) {
    _origMpRender(uid);
    try { mpRenderLinkProviders(); } catch (e) {}
  };
})();

// ---------- Milli Unishare 参考: ニックネーム/アイコン登録ヘルパー（旧ポータル互換 + 新モーダル） ----------
var _pendingIconDataUrl = null
function mpPickEmoji(emoji) {
  var picon = document.getElementById('mp-picon')
  var editIcon = document.getElementById('mp-edit-icon-preview')
  if (picon) { picon.value = emoji; _pendingIconDataUrl = null }
  // 旧ID互換
  var oldName = document.getElementById('mp-edit-name')
  var pname = document.getElementById('mp-pname')
  if (oldName && pname) oldName.value = pname.value
  mpUpdatePiconPreview()
  // プレビューに即反映（emoji は文字として）
  var preview = document.getElementById('mp-picon-preview') || document.getElementById('mp-edit-icon-preview')
  if (preview) renderUserIcon(preview, { icon: emoji, playerName: '' })
}
function mpPickIconFile(input) {
  if (!input || !input.files || !input.files[0]) return
  var file = input.files[0]
  if (file.size > 2 * 1024 * 1024) { alert('画像は2MB以内にしてください'); return }
  var reader = new FileReader()
  reader.onload = function (e) {
    _pendingIconDataUrl = e.target.result
    var picon = document.getElementById('mp-picon')
    if (picon) picon.value = _pendingIconDataUrl
    var preview = document.getElementById('mp-picon-preview') || document.getElementById('mp-edit-icon-preview')
    if (preview) renderUserIcon(preview, { icon: _pendingIconDataUrl, playerName: '' })
  }
  reader.readAsDataURL(file)
}
// 旧タブ切替互換（login-popup 内の mp-tab）
function mpTab(which) {
  var l = document.getElementById('mp-tab-login')
  var s = document.getElementById('mp-tab-signup')
  var pl = document.getElementById('mp-panel-login')
  var ps = document.getElementById('mp-panel-signup')
  if (l) l.classList.toggle('active', which === 'login')
  if (s) s.classList.toggle('active', which === 'signup')
  if (pl) pl.style.display = which === 'login' ? '' : 'none'
  if (ps) ps.style.display = which === 'signup' ? '' : 'none'
}
// 旧 mpToggle('mp-pass','mp-pass-eye') 互換
function mpToggle(a, b) {
  var id = a || b
  // mpTogglePw は data-pw 属性方式だが、旧呼び出しは 2引数なので id を解決
  if (typeof mpTogglePw === 'function') {
    // 旧: mpToggle('mp-pass','mp-pass-eye') → 新: mpTogglePw('mp-pass')
    // 新: mpTogglePw('mp-pass') でも動く
    return mpTogglePw(id)
  }
  // フォールバック
  var inp = document.getElementById(id)
  if (!inp) return
  inp.type = inp.type === 'password' ? 'text' : 'password'
}
function mpSubmit(isSignup) {
  if (isSignup) return mpSubmitSignup()
  return mpSubmitLogin()
}
function mpOpenReset() {
  var d = document.getElementById('password-reset-dialog')
  if (!d) return
  d.classList.remove('hidden')
  d.classList.add('open')
  d.setAttribute('aria-hidden', 'false')
  var email = document.getElementById('mp-email') || document.getElementById('mp-semail')
  var re = document.getElementById('reset-email')
  if (re && email) re.value = email.value.trim()
}
function mpCloseReset() {
  var d = document.getElementById('password-reset-dialog')
  if (!d) return
  d.classList.add('hidden')
  d.classList.remove('open')
  d.setAttribute('aria-hidden', 'true')
}
function mpResetSubmit() {
  var emailEl = document.getElementById('reset-email')
  var msgEl = document.getElementById('reset-msg')
  var email = emailEl ? emailEl.value.trim() : ''
  if (!email) { if (msgEl) msgEl.textContent = 'メールアドレスを入力してください'; return }
  if (msgEl) msgEl.textContent = '送信中…'
  milliproResetPassword(email).then(function () {
    if (msgEl) { msgEl.textContent = '再設定メールを送信しました。メールをご確認ください。'; msgEl.classList.add('ok') }
  }).catch(function (e) {
    if (msgEl) msgEl.textContent = oauthErrorMessage(e) || (e && e.message) || '送信に失敗しました'
  })
}

// プロフィール保存時に _pendingIconDataUrl があれば優先（画像アップロード対応）
(function(){
  window.mpSaveProfile = function(){
    var uid = getMilliproUid()
    if (!uid) { alert('ログインが必要です。ログイン後に再度お試しください。'); return }
    // 新IDと旧IDの両方から値を取得
    var nameEl = document.getElementById('mp-pname') || document.getElementById('mp-edit-name')
    var iconEl = document.getElementById('mp-picon')
    var msgEl = document.getElementById('mp-pmsg')
    var name = nameEl ? nameEl.value.trim() : ''
    var icon = _pendingIconDataUrl || (iconEl ? iconEl.value.trim() : '')
    var msg = msgEl ? msgEl.value.trim() : ''
    var note = document.getElementById('mp-edit-note')
    if (note) { note.textContent = '保存中…'; note.classList.remove('ok') }

    var ref = firebase.database().ref('millipro/users/' + uid + '/profile')
    // 既存プロフィールを読んでから更新する。set() で favorites / 最推しを消さないため。
    ref.once('value').then(function (snap) {
      var p = snap.val()
      if (!p || typeof p !== 'object') p = _mpProfile || { playerId: getMilliproPlayerId() || '' }
      var update = { playerName: name, comment: msg, updatedAt: Date.now() }
      if (icon) update.icon = icon
      if (!p.playerId) update.playerId = getMilliproPlayerId() || newPlayerIdFallback()
      return ref.update(update).then(function () {
        p.playerName = name
        p.comment = msg
        if (icon) p.icon = icon
        if (update.playerId) p.playerId = update.playerId
        p.updatedAt = update.updatedAt
        _mpProfile = p
        _pendingIconDataUrl = null
        applyMilliproProfile(p)
        mpRender(uid)
        mpCancelEdit()
        if (note) { note.textContent = ''; note.classList.remove('ok') }
        alert('プロフィールを保存しました')
        // ニックネーム未設定だった場合の初回登録完了トースト
        if (name) {
          try { localStorage.setItem('milli-nickname-set', '1') } catch(e){}
        }
      })
    }).catch(function (e) {
      console.warn('profile save failed', e)
      var t = (typeof oauthErrorMessage === 'function' ? oauthErrorMessage(e) : null) || '保存に失敗しました'
      if (note) note.textContent = t
      alert(t)
    })
  }
})()

initFirebase()

// ポップアップの閉じる挙動（Unishare 参考: 4モーダル + 旧 login-popup 互換）
;(function(){
  function bindPopupClose(){
    var ids = ['acctModal','loginModal','signupModal','mypageModal','login-popup']
    ids.forEach(function(id){
      var el = document.getElementById(id)
      if(!el) return
      // × ボタン（data-close 属性または #mp-popup-close 互換）
      var closes = el.querySelectorAll('[data-close="'+id+'"], #mp-popup-close, .acct-close')
      closes.forEach(function(btn){
        btn.addEventListener('click', function(){ mpClose(); })
      })
      el.addEventListener('click', function(e){ if(e.target===el) mpClose(); })
    })
    // パスワードリセットは別ID
    var pr = document.getElementById('password-reset-dialog')
    if(pr){
      var prClose = pr.querySelector('#reset-close-btn, [data-close="password-reset-dialog"]')
      if(prClose) prClose.addEventListener('click', function(){ mpClose(); })
      pr.addEventListener('click', function(e){ if(e.target===pr) mpClose(); })
    }
    document.addEventListener('keydown', function(e){
      if(e.key==='Escape'){
        for(var i=0;i<ids.length;i++){
          var p=document.getElementById(ids[i])
          if(p && p.classList.contains('open')){ mpClose(); break; }
        }
        var pr2=document.getElementById('password-reset-dialog')
        if(pr2 && (pr2.classList.contains('open') || !pr2.classList.contains('hidden'))) mpClose()
      }
    })
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindPopupClose);
  else bindPopupClose();
})();

onMilliproAuth(function (uid) {
  if (uid) {
    completeMilliproLogin(uid).then(function (profile) {
      mpRender(uid)
      // ログイン/新規登録モーダルだけ閉じる。アカウントモーダルで編集中なら閉じない。
      mp_hide('loginModal')
      mp_hide('signupModal')
      mpRefreshBanner()
      // ニックネーム未登録なら登録を促す（Unishare 同様: 初回ログイン時に編集を開く）
      var needsNickname = !profile || !profile.playerName
      if (needsNickname) {
        var seen = false
        try { seen = localStorage.getItem('milli-nickname-prompted') === '1' } catch(e){}
        // 初回のみ自動で編集を開く（2回目以降は手動）
        if (!seen) {
          try { localStorage.setItem('milli-nickname-prompted','1') } catch(e){}
          setTimeout(function(){ try{ mpOpen(); mpStartEdit(); var n=document.getElementById('mp-edit-note')||document.getElementById('mp-picon-preview'); if(n && n.parentElement) { var hint=document.getElementById('mp-edit-note'); if(hint) hint.textContent='ニックネームを登録してください（全サイトで共有されます）'; } }catch(e){} }, 600)
        }
      }
    }).catch(function () {
      mpRender(uid)
      mpRefreshBanner()
    }).then(function () {
      if (typeof _mpAfterLogin === 'function') _mpAfterLogin(uid)
    })
  } else {
    mpRender(null)
    mpRefreshBanner()
  }
})

if (typeof consumeMilliproRedirectResult === "function") {
  consumeMilliproRedirectResult().then(function (result) {
    if (result && result.user) {
      var uid = result.user.uid;
      if (uid && typeof completeMilliproLogin === "function") {
        completeMilliproLogin(uid).then(function () {
          if (typeof mpRender === "function") mpRender(uid);
          mpRefreshBanner();
        });
      }
    }
  }).catch(function (e) {
    var msg = (typeof oauthErrorMessage === "function" ? oauthErrorMessage(e) : null) || (e && e.message ? e.message : "エラーが発生しました");
    if (typeof mpSetAuthMessage === "function") mpSetAuthMessage(msg);
    // リダイレクト復帰時のエラーは画面にモーダルがないと見えないため、ログイン画面を開いて表示する
    var login = document.getElementById("loginModal");
    if (login && !login.classList.contains("open") && typeof mpOpenLogin === "function") {
      mpOpenLogin();
      if (typeof mpSetAuthMessage === "function") mpSetAuthMessage(msg);
    }
  });
}