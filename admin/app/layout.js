import './globals.css';

export const metadata = { title: 'Kobo Admin', description: 'Panel admin Kobo' };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
