// Plausible (self-hosted at analytics.holstjensen.eu). Cookieless, and every URL
// is stripped of share ids and upload tokens before it is sent (see _document).
export const PLAUSIBLE_SCRIPT =
  "https://analytics.holstjensen.eu/js/pa-fhTSFkLPm_UcxwZspfZVy.js";

// Replaces secret path segments with fixed names and drops the query string.
export const PLAUSIBLE_INIT = `
window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
(function(){
  function clean(u){
    try{
      var x=new URL(u);
      var p=x.pathname
        .replace(/^\\/upload\\/[^/]+/,"/upload-link")
        .replace(/^\\/(s|share)\\/[^/]+\\/edit/,"/share/edit")
        .replace(/^\\/(s|share)\\/[^/]+/,"/share")
        .replace(/^\\/auth\\/(resetPassword|totp|verify)\\/[^/]+/,"/auth/$1");
      return x.origin+p;
    }catch(e){return u}
  }
  plausible.init({transformRequest:function(p){
    p.u=clean(p.u);
    if(p.r&&p.r.indexOf(location.origin)===0)p.r=clean(p.r);
    return p;
  }});
})();
`;

type PlausibleWindow = Window & {
  plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
};

// Never send ids, file names or tokens as props.
export const track = (event: string, props?: Record<string, string>) => {
  if (typeof window === "undefined") return;
  (window as PlausibleWindow).plausible?.(event, props ? { props } : undefined);
};
