import type { Metadata } from 'next';
import './globals.css';
import BaseContainer from '@/components/BaseContainer';

export const metadata: Metadata = {
  title: 'Weather App',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BaseContainer>{children}</BaseContainer>
      </body>
    </html>
  );
}
