import './globals.css';
import Script from 'next/script';
import ErrorBanner from '@/components/ErrorBanner';

export const metadata = {
  title: 'Kobo',
  description: 'Gagne des Kobo en ligne',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#0A1F44" />
      </head>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <ErrorBanner />
        {children}
      </body>
    </html>
  );
}
