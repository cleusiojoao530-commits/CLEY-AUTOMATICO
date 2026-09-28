require('dotenv').config();
const fs=require('fs');const path=require('path');const express=require('express');const pino=require('pino');
const {default:makeWASocket,useMultiFileAuthState,DisconnectReason,fetchLatestBaileysVersion,makeCacheableSignalKeyStore}=require('@whiskeysockets/baileys');
const PORT=Number(process.env.PORT||3000);const PREFIX=process.env.PREFIX||'.';const OWNER=String(process.env.OWNER_NUMBER||'').replace(/\D/g,'');const PHONE=String(process.env.PHONE_NUMBER||'').replace(/\D/g,'');
const DB_FILE=path.join(__dirname,'database.json');const MENU_IMAGE=path.join(__dirname,'media','menu.png');const logger=pino({level:'info'});
function loadDB(){try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}catch{return {settings:{autoReply:true,prefix:PREFIX},owner:OWNER,groups:{},global:{blockedGroups:[],admins:[]}};}}
let db=loadDB();if(!db.groups)db.groups={};if(!db.global)db.global={blockedGroups:[],admins:[]};function saveDB(){fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));}
const DEFAULT_TABLE=`◈━📅 PACOTES C.D VODANET ━━◈\n\n┣🛒 10 MT ➝ 500 MB 📲\n┣🛒 15 MT ➝ 750 MB 📲\n┣🛒 20 MT ➝ 1.024 MB 📲\n┣🛒 25 MT ➝ 1.250 MB 📲\n┣🛒 30 MT ➝ 1.500 MB 📲\n┣🛒 35 MT ➝ 1.750 MB 📲\n┣🛒 40 MT ➝ 2.048 MB 📲\n┣🛒 45 MT ➝ 2.250 MB 📲\n┣🛒 50 MT ➝ 2.500 MB 📲\n┣🛒 55 MT ➝ 2.750 MB 📲\n┣🛒 60 MT ➝ 3.072 MB 📲\n━━━━━━━━━━━━\n⚡ Ativação rápida | ⏰ 24h | 🤖 C.D VODANET`;
function groupDefault(){return {table:DEFAULT_TABLE,pagamentos:{mpesa:[{number:'856662085',name:'SUZANA'}],emola:[]},nanos:{},purchases:{},pending:{},members:{},stats:{sales:0}};}
function ensureGroup(jid){if(!db.groups[jid])db.groups[jid]=groupDefault();return db.groups[jid];}
async function callMacroDroid(numero,quantidade){const url=process.env.MACRODROID_WEBHOOK_M1||process.env.MACRODROID_WEBHOOK_URL;if(!url)return {ok:false};try{const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({numero:String(numero).replace(/\D/g,''),quantidade:String(quantidade)})});const txt=await res.text();return {ok:res.ok,txt};}catch(e){return {ok:false,err:e.message};}}
const app=express();app.use(express.json());app.get('/',(req,res)=>res.send('CLEY AUTOMATICO ONLINE - CODIGO ATIVO'));app.listen(PORT,()=>logger.info('Web ON '+PORT));
async function startBot(){
const {state,saveCreds}=await useMultiFileAuthState('./auth');
const {version}=await fetchLatestBaileysVersion();
const sock=makeWASocket({version,auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:'silent'}))},logger:pino({level:'silent'}),printQRInTerminal:false,browser:["C.D VODANET","Chrome","1.0"]});
if(!sock.authState.creds.registered){
 setTimeout(async()=>{
  try{const code=await sock.requestPairingCode(PHONE);
   console.log('=================================');
   console.log(' SEU CODIGO CLEY: '+code);
   console.log('=================================');
  }catch(e){console.log('Erro codigo:',e.message)}
 },3000);
}
sock.ev.on('creds.update',saveCreds);
sock.ev.on('connection.update',u=>{const {connection,lastDisconnect}=u;if(connection==='close'){const should=lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut;if(should)startBot();}if(connection==='open')logger.info('CLEY CONECTADO COM CODIGO');});
sock.ev.on('messages.upsert',async m=>{const msg=m.messages[0];if(!msg.message||msg.key.fromMe)return;const from=msg.key.remoteJid;const g=ensureGroup(from);const text=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';const lower=text.toLowerCase();if(lower.includes('tabela')||lower.includes('quero megas')||lower.includes('pacote')){if(fs.existsSync(MENU_IMAGE))await sock.sendMessage(from,{image:fs.readFileSync(MENU_IMAGE),caption:g.table+'\n\n💳 M-PESA: 856662085 - SUZANA'});else await sock.sendMessage(from,{text:g.table});return;}if(!text.startsWith(PREFIX))return;const args=text.slice(1).trim().split(/\s+/);const cmd=args[0].toLowerCase();if(cmd==='menu'){if(fs.existsSync(MENU_IMAGE))await sock.sendMessage(from,{image:fs.readFileSync(MENU_IMAGE),caption:'🤖 CLEY AUTOMATICO\nC.D VODANET'});else await sock.sendMessage(from,{text:'🤖 CLEY AUTOMATICO'});return;}if(cmd==='tabela')await sock.sendMessage(from,{text:g.table});else if(cmd==='compra'){const v=parseInt(args[1]);const map={10:500,15:750,20:1024,25:1250,30:1500,35:1750,40:2048,45:2250,50:2500,55:2750,60:3072};if(!map[v]){await sock.sendMessage(from,{text:'Pacote inválido'});return;}db.groups[from].pending[Date.now()]={valor:v,mb:map[v],cliente:msg.pushName};saveDB();await sock.sendMessage(from,{text:`🛒 PEDIDO: ${v}MT -> ${map[v]}MB\n💳 856662085 SUZANA\nDepois:.confirmar 84xxxxxxx`});}else if(cmd==='confirmar'){let num=args[1]?.replace(/\D/g,'');const keys=Object.keys(g.pending);if(!keys.length){await sock.sendMessage(from,{text:'Sem pendentes'});return;}const lastKey=keys[keys.length-1];const p=g.pending[lastKey];await sock.sendMessage(from,{text:`🚀 Enviando ${p.mb}MB para ${num}...`});const r=await callMacroDroid(num,p.mb);if(r.ok){await sock.sendMessage(from,{text:`✅ ${p.mb}MB ENVIADO PARA ${num}`});delete g.pending[lastKey];saveDB();}else await sock.sendMessage(from,{text:'⚠️ Configure MACRODROID no Render'});}else if(cmd==='bot')await sock.sendMessage(from,{text:'🤖 CLEY ONLINE - CODIGO ATIVO'});});}startBot();
