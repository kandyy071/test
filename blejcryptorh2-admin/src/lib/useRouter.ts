import { useState, useEffect, useCallback } from 'react';

export type Route = '/' | '/llogaritesi' | '/swap' | '/sherbimet' | '/besimi' | '/faq' | '/kontakt';

const VALID_ROUTES: Route[] = ['/', '/llogaritesi', '/swap', '/sherbimet', '/besimi', '/faq', '/kontakt'];

const ROUTE_TITLES: Record<Route, string> = {
  '/': 'BlejCryptorh.com — Shkëmbim Kriptomonedhash në Rahovec | Crypto për Para në Dorë',
  '/llogaritesi': 'Llogaritësi i Kriptomonedhave — BlejCryptorh.com | Rahovec',
  '/swap': 'Crypto Swap — Shkëmbim Kripto me Kripto | BlejCryptorh.com',
  '/sherbimet': 'Shërbimet — BlejCryptorh.com | Shkëmbim Crypto në Rahovec',
  '/besimi': 'Besimi dhe Siguria — BlejCryptorh.com | Rahovec',
  '/faq': 'Pyetjet e Shpeshta — BlejCryptorh.com | Rahovec',
  '/kontakt': 'Kontakt — BlejCryptorh.com | Rahovec',
};

const ROUTE_DESCRIPTIONS: Record<Route, string> = {
  '/': 'Blini dhe shisni kriptomonedha për para në dorë në Rahovec. USDT, Bitcoin, Ethereum, Litecoin, Solana, XRP. Takim në person, tarifa transparente, çmime live.',
  '/llogaritesi': 'Llogaritësi i kriptomonedhave për Rahovec. Shihni sa para jepni dhe sa crypto merrni me çmime live dhe tarifa transparente. Rezervoni takim në person.',
  '/swap': 'Shkëmbeni një kriptomonedhë me një tjetër shpejt dhe sigurt. Crypto swap me çmime live dhe tarifa të përfshira në Rahovec.',
  '/sherbimet': 'Shërbime shkëmbimi kriptomonedhash në Rahovec. Bli dhe shit USDT, BTC, ETH, LTC, SOL, XRP për para në dorë. Takim në person, i sigurt.',
  '/besimi': 'Besimi dhe siguria te BlejCryptorh.com. Çdo shkëmbim bëhet ballë për ballë në Rahovec. Privatësi, verifikim në blockchain, transaksione transparente.',
  '/faq': 'Pyetjet e shpeshta për shkëmbim kriptomonedhash në Rahovec. Përgjigje për tarifa, siguri, kriptomonedhat e mbështetura dhe mënyrën e punës.',
  '/kontakt': 'Kontaktoni BlejCryptorh.com në Rahovec, Kosovë. Email, Facebook, Instagram. Rezervoni takim për shkëmbim kriptomonedhash në person.',
};

const BASE_URL = 'https://blejcryptorh.com';

function updateMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let tag = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function updateCanonical(path: Route) {
  const url = `${BASE_URL}${path === '/' ? '' : path}`;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

function getRouteFromPath(path: string): Route {
  const normalized = path === '' ? '/' : path;
  return (VALID_ROUTES.includes(normalized as Route) ? normalized : '/') as Route;
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => getRouteFromPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => {
      setRoute(getRouteFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = ROUTE_TITLES[route] ?? ROUTE_TITLES['/'];
    const description = ROUTE_DESCRIPTIONS[route] ?? ROUTE_DESCRIPTIONS['/'];
    updateMetaTag('description', description);
    updateMetaTag('og:title', ROUTE_TITLES[route] ?? ROUTE_TITLES['/'], 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:url', `${BASE_URL}${route === '/' ? '' : route}`, 'property');
    updateMetaTag('twitter:title', ROUTE_TITLES[route] ?? ROUTE_TITLES['/']);
    updateMetaTag('twitter:description', description);
    updateCanonical(route);
  }, [route]);

  const navigate = useCallback((to: Route) => {
    if (to === window.location.pathname) {
      setRoute(to);
      return;
    }
    window.history.pushState({}, '', to);
    setRoute(to);
  }, []);

  return { route, navigate };
}
