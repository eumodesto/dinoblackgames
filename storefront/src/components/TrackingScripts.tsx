"use client";

import Script from "next/script";
import { setTrackingConfig } from "@/lib/tracking-client";
import type { PublicTracking } from "@/lib/tracking-config";

/**
 * Carrega as tags de GA4, Google Ads, Meta Pixel e Clarity, só as que estão ativas no admin.
 * Os IDs já chegam validados (formato oficial de cada serviço) e vão para os scripts via JSON.
 */
export function TrackingScripts({ config }: { config: PublicTracking }) {
  setTrackingConfig(config);
  const { ga4Id, adsId, pixelId, clarityId } = config;
  const googleId = ga4Id ?? adsId;

  const gtagInit = googleId
    ? `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());` +
      (ga4Id ? `gtag('config',${JSON.stringify(ga4Id)},{send_page_view:false});` : "") +
      (adsId ? `gtag('config',${JSON.stringify(adsId)}${config.adsEnhanced ? ",{allow_enhanced_conversions:true}" : ""});` : "")
    : "";

  const metaInit = pixelId
    ? `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixelId)});`
    : "";

  const clarityInit = clarityId
    ? `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(clarityId)});`
    : "";

  return (
    <>
      {googleId && <Script id="gtag-src" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`} strategy="afterInteractive" />}
      {gtagInit && <Script id="gtag-init" strategy="afterInteractive">{gtagInit}</Script>}
      {metaInit && <Script id="meta-pixel" strategy="afterInteractive">{metaInit}</Script>}
      {clarityInit && <Script id="clarity" strategy="afterInteractive">{clarityInit}</Script>}
    </>
  );
}
