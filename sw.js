if(!self.define){let e,r={};const i=(i,n)=>(i=new URL(i+".js",n).href,r[i]||new Promise((r=>{if("document"in self){const e=document.createElement("script");e.src=i,e.onload=r,document.head.appendChild(e)}else e=i,importScripts(i),r()})).then((()=>{let e=r[i];if(!e)throw new Error(`Module ${i} didn’t register its module`);return e})));self.define=(n,s)=>{const l=e||("document"in self?document.currentScript.src:"")||location.href;if(r[l])return;let o={};const t=e=>i(e,l),c={module:{uri:l},exports:o,require:t};r[l]=Promise.all(n.map((e=>c[e]||t(e)))).then((e=>(s(...e),o)))}}define(["./workbox-06233651"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"electron/main.js",revision:"79f3bbfb05e945b35c338b1d717f0adf"},{url:"index.html",revision:"b28a48b8ffe5b69883a39b2ba2f14e18"},{url:"leaflet-src.esm.13473dcf.js",revision:null},{url:"marker-icon-2x.68378269.js",revision:null},{url:"marker-icon.753d5637.js",revision:null},{url:"marker-shadow.40fd21b3.js",revision:null},{url:"registerSW.js",revision:"402b66900e731ca748771b6fc5e7a068"},{url:"style.f7b8ff03.css",revision:null},{url:"webfontloader.3696e2c4.js",revision:null},{url:"favicon.ico",revision:"b54531a824aa22f592590e347be8347c"},{url:"apple-touch-icon.png",revision:"4d6428d260d0f769a26ed6ce0387d0c1"},{url:"manifest.webmanifest",revision:"a28c2c0a5d92b960e17dd3757933e534"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))}));
