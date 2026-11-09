import AsyncStorage from '@react-native-async-storage/async-storage';
import {isMemory,Memory} from '../model';
const KEY='@makom-lizkor/v1';
export async function loadMemories():Promise<Memory[]>{const raw=await AsyncStorage.getItem(KEY);if(!raw)return [];const data:unknown=JSON.parse(raw);if(!Array.isArray(data)||!data.every(isMemory))throw new Error('Invalid stored records');return data;}
export async function saveMemories(items:Memory[]):Promise<void>{await AsyncStorage.setItem(KEY,JSON.stringify(items));}
