import type { Metadata, Viewport } from 'next';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import 'react-day-picker/style.css';
import './globals.css';
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://127.0.0.1:3000');
const title = 'StoicTrade — Hành trình trading của bạn';
const description = 'Nhật ký giao dịch cá nhân: theo dõi P&L, quản lý thử thách Prop Firm, phân tích hiệu suất và rèn luyện kỷ luật cùng StoicTrade.';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: '%s | StoicTrade' },
  description,
  applicationName: 'StoicTrade',
  category: 'productivity',
  keywords: ['StoicTrade', 'trading journal', 'nhật ký giao dịch', 'Prop Firm', 'quản lý rủi ro', 'kỷ luật giao dịch'],
  openGraph: { type: 'website', locale: 'vi_VN', siteName: 'StoicTrade', title, description, images: [{ url: '/og-stoictrade.png', width: 1200, height: 630, alt: 'StoicTrade — Nhật ký giao dịch và hành trình rèn luyện kỷ luật' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-stoictrade.png'] },
  formatDetection: { email: false, address: false, telephone: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#10172d', colorScheme: 'dark' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="vi"><body>{children}</body></html>; }
