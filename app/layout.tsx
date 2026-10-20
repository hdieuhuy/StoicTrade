import type { Metadata } from 'next';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import './globals.css';
export const metadata: Metadata = { title: 'StoicTrade — Hành trình của bạn', description: 'Ghi lại giao dịch. Rèn luyện kỷ luật. Hiểu chính mình.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="vi"><body>{children}</body></html>; }
