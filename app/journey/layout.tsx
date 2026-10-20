import type {Metadata} from 'next';
export const metadata:Metadata={title:'Hành trình được chia sẻ',description:'Bản chụp hành trình trading được chia sẻ từ StoicTrade. Dữ liệu do người dùng tự ghi chép.',robots:{index:false,follow:false}};
export default function JourneyLayout({children}:{children:React.ReactNode}){return children;}
