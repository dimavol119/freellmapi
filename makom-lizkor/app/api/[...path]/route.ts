import {env} from 'cloudflare:workers';
import {handleAccountApi} from '../../../lib/account-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleAccountApi(request,env)}
export async function POST(request:Request){return handleAccountApi(request,env)}
export async function PUT(request:Request){return handleAccountApi(request,env)}
