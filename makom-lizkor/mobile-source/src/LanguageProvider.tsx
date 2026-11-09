import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {isLanguage,Language,LOCALES,translate} from './i18n';
const LanguageContext=createContext({language:'he' as Language,locale:'he-IL',rtl:true,t:(text:string)=>text,setLanguage:(_language:Language)=>{}});
export function LanguageProvider({children}:{children:React.ReactNode}){
 const [language,changeLanguage]=useState<Language>('he');const userSelected=useRef(false);
 useEffect(()=>{let mounted=true;void AsyncStorage.getItem('@makom-lizkor/language').then(saved=>{if(mounted&&!userSelected.current&&isLanguage(saved))changeLanguage(saved)}).catch(()=>{});return()=>{mounted=false}},[]);
 useEffect(()=>{if(Platform.OS==='web'){document.documentElement.lang=language;document.documentElement.dir=language==='he'?'rtl':'ltr';document.title=translate('✳ מקום לזכור',language).replace('✳ ','')}},[language]);
 function setLanguage(next:Language){userSelected.current=true;changeLanguage(next);void AsyncStorage.setItem('@makom-lizkor/language',next).catch(()=>{});}
 return <LanguageContext.Provider value={{language,locale:LOCALES[language],rtl:language==='he',t:text=>translate(text,language),setLanguage}}>{children}</LanguageContext.Provider>
}
export const useI18n=()=>useContext(LanguageContext);
