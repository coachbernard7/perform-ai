import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en-GB">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#050811" />
        <meta name="description" content="Private rehearsal tools for speeches, presentations, and scripts." />
        <meta name="application-name" content="PERFORM AI" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/app/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/app/assets/icon-192.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: "html,body,#root{height:100%}body{margin:0;background:#050811;overflow:hidden}" }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/app/service-worker.js',{scope:'/app/'}).catch(function(){})})}" }} />
      </body>
    </html>
  );
}
