import Script from 'next/script';

/**
 * Matomo Tag Manager. Контејнерот се вчитува дури по хидратацијата, за да не
 * го одложи приказот на страницата; самата аналитика е поставена без
 * колачиња (cookieless) во Matomo, па овде нема што да се конфигурира.
 */
export function Analytics() {
  return (
    <Script id="matomo-tag-manager" strategy="afterInteractive">
      {`var _mtm = window._mtm = window._mtm || [];
_mtm.push({ 'mtm.startTime': new Date().getTime(), event: 'mtm.Start' });
(function () {
  var d = document;
  var g = d.createElement('script');
  var s = d.getElementsByTagName('script')[0];
  g.async = true;
  g.src = 'https://analytics.gocemitevski.com/js/container_9r49yf96.js';
  s.parentNode.insertBefore(g, s);
})();`}
    </Script>
  );
}
