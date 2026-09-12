// Arquivo externo para preservar o preload do LCP sem relaxar script-src na CSP.
if (window.location.pathname === '/') {
  const heroPreload = document.createElement('link');
  heroPreload.rel = 'preload';
  heroPreload.as = 'image';
  heroPreload.href = '/images/hero-gen-z-v2-828.webp';
  heroPreload.setAttribute('imagesrcset', '/images/hero-gen-z-v2-640.webp 640w, /images/hero-gen-z-v2-828.webp 828w, /images/hero-gen-z-v2-1024.webp 1024w, /images/hero-gen-z-v2.webp 1672w');
  heroPreload.setAttribute('imagesizes', '100vw');
  heroPreload.type = 'image/webp';
  heroPreload.setAttribute('fetchpriority', 'high');
  document.head.appendChild(heroPreload);
}
