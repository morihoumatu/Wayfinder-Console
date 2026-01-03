/**
 * Webフォントの遅延読み込みを行う。
 * @file Webフォントの遅延読み込みを行う。
 */
// FONT_STYLESHEETの定数を定義する。
const FONT_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Kaisei+Tokumin:wght@500;700&family=" +
  "Zen+Kaku+Gothic+New:wght@400;500;700&display=swap";

/**
 * Webフォントのスタイルを読み込む。
 */
function loadFonts() {
  if (document.querySelector(`link[href="${FONT_STYLESHEET}"]`)) {
    return;
  }
  // DOM要素を生成する。
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONT_STYLESHEET;
  link.media = "print";
  link.addEventListener(
    "load",
    () => {
      link.media = "all";
    },
    { once: true }
  );
  document.head.appendChild(link);
}

/**
 * Webフォントの読み込みを遅延スケジュールする。
 */
function scheduleFontLoad() {
  // idleCallbackを用意する。
  const idleCallback =
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback
      : null;
  /**
   * 遅延実行のスケジューラを定義する。
   * @type {(callback: () => void) => void}
   */
  const schedule = idleCallback
    ? (callback) => idleCallback(callback, { timeout: 800 })
    : (callback) => window.setTimeout(callback, 120);
  schedule(loadFonts);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", scheduleFontLoad, { once: true });
} else {
  scheduleFontLoad();
}
