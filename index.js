require('dotenv').config();
const fs=require('fs');const path=require('path');const express=require('express');const pino=require('pino');
const QRCode=require('qrcode');
const {default:makeWASocket,useMultiFileAuthState,DisconnectReason,fetchLatestBaileysVersion,makeCacheableSignalKeyStore}=require('@whiskeysockets/baileys');

const PORT=Number(process.env.PORT||3000);const PREFIX=process.env.PREFIX||'.';const OWNER=String(process.env.OWNER_NUMBER||'').replace(/\D/g,'');
const DB_FILE=path.join(__dirname,'database.json');const MENU_IMAGE=path.join(__dirname,'media','menu.png');const logger=pino({level:'info'});

function loadDB(){try{return JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}catch{return {settings:{autoReply:true,prefix:PREFIX},owner:OWNER,groups:{},global:{blockedGroups:[],admins:[]}};}}
let db=loadDB();if(!db.groups)db.groups={};if(!db.global)db.global={blockedGroups:[],admins:[]};function saveDB(){fs.writeFileSync(DB_FILE,JSON.stringify(db,null,2));}

// TABELA NOVA QUE VOCE MANDOU - ANTIGA REMOVIDA
const DEFAULT_TABLE = `◈━📅 PACOTES DIÁRIOS ━━◈
┣🛒 10 MT ➝ 500 MB 📲
┣🛒 15 MT ➝ 750 MB 📲
┣🛒 20 MT ➝ 1.024 MB 📲
┣🛒 25 MT ➝ 1.250 MB 📲
┣🛒 30 MT ➝ 1.500 MB 📲
┣🛒 35 MT ➝ 1.750 MB 📲
┣🛒 40 MT ➝ 2.048 MB 📲
┣🛒 45 MT ➝ 2.250 MB 📲
┣🛒 50 MT ➝ 2.500 MB 📲
┣🛒 55 MT ➝ 2.750 MB 📲
┣🛒 60 MT ➝ 3.072 MB 📲
┣🛒 65 MT ➝ 3.250 MB 📲
┣🛒 70 MT ➝ 3.500 MB 📲
┣🛒 75 MT ➝ 3.750 MB 📲
┣🛒 80 MT ➝ 4.096 MB 📲
┣🛒 85 MT ➝ 4.250 MB 📲
┣🛒 90 MT ➝ 4.500 MB 📲
┣🛒 95 MT ➝ 4.750 MB 📲
┣🛒 100 MT ➝ 5.120 MB 📲

• + de 100 MT TÊM.

𝗡𝗕: 𝗧𝗔𝗕𝗘𝗟𝗔:
"𝗦𝗘𝗠𝗔𝗡𝗔𝗟" & "𝗠𝗘𝗡𝗦𝗔𝗟"
𝗗𝗜𝗚𝗜𝗧𝗔: "𝗣𝗔𝗖𝗢𝗧𝗘𝗦"

╭━━━┛ ✨ PACOTES ESPECIAIS
┃ 😈 230 MT ➝ 10.240 MB / 24H
╰━━━━━━━━━━━━━━━━╯`;

function groupDefault(){return {table:DEFAULT_TABLE,pagamentos:{mpesa:{numero:'856622085',nome:'SUZANA'},emola:[]},ativo:true};}
function ensureGroup(jid){if(!db.groups[jid])db.groups[jid]=groupDefault();return db.groups[jid];}

const app=express();app.use(express.json());

// VARIAVEIS DO QR CODE
let qrCodeData=null;
let isConnected=false;

// ROTA COM QR CODE
app.get('/',async(req,res)=>{
 if(isConnected){
   res.send('<h1>✅ CLEY CONECTADO!</h1><p>Bot online</p>');
 } else if(qrCodeData){
   try{
     const qrImage=await QRCode.toDataURL(qrCodeData);
     res.send(`<div style="text-align:center;font-family:sans-serif"><h1>CLEY AUTOMATICO - QR CODE</h1><img src="${qrImage}" width="330" style="border:8px solid black;border-radius:12px"><br><br><p>WhatsApp > Aparelhos > Conectar</p><p>QR expira em 30s - recarrega</p><script>setTimeout(()=>location.reload(),25000)</script></div>`);
   }catch(e){res.send('Gerando QR...');}
 } else {
   res.send('<h1>Gerando QR... recarregue em 5s</h1><script>setTimeout(()=>location.reload(),5000)</script>');
 }
});

async function startBot(){
 const {state,saveCreds}=await useMultiFileAuthState('./auth');
 const {version}=await fetchLatestBaileysVersion();
 const sock=makeWASocket({version,auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,logger)},logger,printQRInTerminal:false,browser:['CLEY-AUTOMATICO','Chrome','1.0']});
 sock.ev.on('creds.update',saveCreds);
 sock.ev.on('connection.update',async(u)=>{
  const {connection,lastDisconnect,qr}=u;
  if(qr){qrCodeData=qr;isConnected=false;console.log('QR GERADO');}
  if(connection==='close'){isConnected=false;qrCodeData=null;const rec=lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut;if(rec)startBot();}
  if(connection==='open'){isConnected=true;qrCodeData=null;console.log('✅ CONECTADO!');}
 });
 sock.ev.on('messages.upsert',async m=>{
  const msg=m.messages[0];if(!msg.message||msg.key.fromMe)return;
  const from=msg.key.remoteJid;const body=msg.message.conversation||msg.message.extendedTextMessage?.text||'';
  if(!body.startsWith(PREFIX))return;
  const args=body.slice(PREFIX.length).trim().split(/ +/);const cmd=args.shift().toLowerCase();
  const group=from.endsWith('@g.us')?ensureGroup(from):null;
  if(cmd==='menu'||cmd==='tabela'){await sock.sendMessage(from,{text:group?group.table:DEFAULT_TABLE});}
  if(cmd==='pacotes'){await sock.sendMessage(from,{text:'Digite o valor que deseja, ex: 100 para 5GB'});}
  saveDB();
 });
}
app.listen(PORT,()=>{console.log('Rodando '+PORT);startBot();});
