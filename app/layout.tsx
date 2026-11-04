import type { Metadata } from "next";
import "./globals.css";
/* removed comment */
import BaseContainer from "./components/BaseContainer";

export const metadata: Metadata = {
  title: "Weather App",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
13 |       <body>
14 |         <BaseContainer>{children}</BaseContainer>
      </body>
    </html>
  );
}