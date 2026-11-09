import type {Metadata} from 'next';
export const metadata:Metadata={title:'מקום לזכור',description:'תמונות, רעיונות ותזכורות במקום אישי אחד'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="he"><body style={{margin:0,background:'#111113'}}>{children}</body></html>}
