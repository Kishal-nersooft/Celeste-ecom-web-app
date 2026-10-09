export const INTRO_SEEN_KEY = "celeste-intro-seen";
export const INTRO_LOGIN_KEY = "celeste-intro-after-login";
export const INTRO_EVENT = "celeste-intro-play";
export const INTRO_HTML_CLASS = "celeste-intro";
export const INTRO_COVER_ID = "celeste-intro-cover";

/** Runs before paint so the first visit does not flash the page under the intro. */
export const INTRO_BOOT_SCRIPT = `try{var seen=localStorage.getItem(${JSON.stringify(INTRO_SEEN_KEY)});var afterLogin=sessionStorage.getItem(${JSON.stringify(INTRO_LOGIN_KEY)});if(!seen||afterLogin==="1"){var root=document.documentElement;root.classList.add(${JSON.stringify(INTRO_HTML_CLASS)});root.style.background="#000";root.style.overflow="hidden";var cover=document.createElement("div");cover.id=${JSON.stringify(INTRO_COVER_ID)};cover.setAttribute("aria-hidden","true");cover.style.cssText="position:fixed;inset:0;z-index:10040;background:#000";root.appendChild(cover);}}catch(e){}`;

export function introShouldPlay(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const firstVisit = !localStorage.getItem(INTRO_SEEN_KEY);
    const afterLogin = sessionStorage.getItem(INTRO_LOGIN_KEY) === "1";
    return firstVisit || afterLogin;
  } catch {
    return false;
  }
}

/** Play the intro once on the next paint. Used after a completed sign-in. */
export function queueIntroAfterLogin() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INTRO_LOGIN_KEY, "1");
  } catch {
    // Private mode can block storage; the event still starts the intro in this tab.
  }
  window.dispatchEvent(new Event(INTRO_EVENT));
}

export function clearIntroBootChrome() {
  if (typeof document === "undefined") return;
  document.getElementById(INTRO_COVER_ID)?.remove();
  document.documentElement.classList.remove(INTRO_HTML_CLASS);
  document.documentElement.style.overflow = "";
  document.documentElement.style.background = "";
}
