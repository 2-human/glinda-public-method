// public/method/linkedin-insight.js
//
// LinkedIn Insight Tag — loaded on every page of engage.glindagroup.com
// so LinkedIn ad measurement, retargeting audiences, and conversion
// tracking work site-wide.
//
// Conversion event (defined in LinkedIn Campaign Manager) uses trigger
// "URL contains /thanks/" so only successful form submissions count as
// conversions. Page views on other URLs are recorded as site visits and
// fold into the matched-audience pool LinkedIn uses for retargeting.
//
// Partner ID: 10432217 (Glinda Group account)
//
// Safe to load multiple times — the partner-id push is deduped so
// concurrent inclusion via different paths won't double-count.
(function () {
  var pid = '10432217';
  window._linkedin_partner_id = pid;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  if (window._linkedin_data_partner_ids.indexOf(pid) === -1) {
    window._linkedin_data_partner_ids.push(pid);
  }
  if (!window.lintrk) {
    window.lintrk = function (a, b) {
      (window.lintrk.q = window.lintrk.q || []).push([a, b]);
    };
    window.lintrk.q = [];
  }
  if (document.querySelector('script[data-licdn-insight]')) return;
  var s = document.getElementsByTagName('script')[0];
  var b = document.createElement('script');
  b.type = 'text/javascript';
  b.async = true;
  b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
  b.setAttribute('data-licdn-insight', '');
  s.parentNode.insertBefore(b, s);
})();
