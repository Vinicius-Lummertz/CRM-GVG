import './globals.css';

export const metadata = {
  title: 'CRM Leads | Modern Dashboard',
  description: 'Manage leads from Whatsapp OTP and Free Text easily',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
