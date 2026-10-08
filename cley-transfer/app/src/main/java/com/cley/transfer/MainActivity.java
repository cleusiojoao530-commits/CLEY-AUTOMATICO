package com.cley.transfer;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.*;
import android.telephony.*;
import android.view.Gravity;
import android.widget.*;
import java.util.*;

public class MainActivity extends Activity {
    Spinner sims; TextView result; final Handler handler=new Handler(Looper.getMainLooper());
    public void onCreate(Bundle b){super.onCreate(b); ui(); if(checkSelfPermission(Manifest.permission.CALL_PHONE)!=PackageManager.PERMISSION_GRANTED||checkSelfPermission(Manifest.permission.READ_PHONE_STATE)!=PackageManager.PERMISSION_GRANTED) requestPermissions(new String[]{Manifest.permission.CALL_PHONE,Manifest.permission.READ_PHONE_STATE},10); else loadSims();}
    void ui(){
        LinearLayout r=new LinearLayout(this); r.setOrientation(LinearLayout.VERTICAL); r.setPadding(32,40,32,32);
        TextView t=new TextView(this); t.setText("CLEY Transfer\nTeste USSD"); t.setTextSize(24); t.setGravity(Gravity.CENTER); r.addView(t);
        TextView i=new TextView(this); i.setText("Escolhe a SIM Vodacom e testa *162#.\nEste primeiro teste não transfere MB."); i.setTextSize(16); i.setPadding(0,24,0,16); r.addView(i);
        sims=new Spinner(this); r.addView(sims);
        Button b=new Button(this); b.setText("Testar *162#"); b.setOnClickListener(v->ussd("*162#")); r.addView(b);
        result=new TextView(this); result.setText("Aguardando teste..."); result.setTextSize(16); result.setPadding(0,24,0,0); r.addView(result); setContentView(r);
    }
    void loadSims(){try{SubscriptionManager sm=getSystemService(SubscriptionManager.class); List<SubscriptionInfo> l=sm.getActiveSubscriptionInfoList(); ArrayList<String>a=new ArrayList<>(); if(l!=null)for(SubscriptionInfo s:l)a.add((s.getCarrierName()==null?"SIM":s.getCarrierName())+" — SIM "+s.getSimSlotIndex()); if(a.isEmpty())a.add("Nenhuma SIM detectada"); sims.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,a));}catch(Exception e){result.setText("Erro ao ler SIMs: "+e.getMessage());}}
    void ussd(String code){try{SubscriptionManager sm=getSystemService(SubscriptionManager.class); List<SubscriptionInfo> l=sm.getActiveSubscriptionInfoList(); if(l==null||l.isEmpty()){result.setText("Nenhuma SIM disponível.");return;} int p=sims.getSelectedItemPosition(); if(p<0||p>=l.size())p=0; TelephonyManager tm=getSystemService(TelephonyManager.class).createForSubscriptionId(l.get(p).getSubscriptionId()); result.setText("A enviar "+code+"..."); tm.sendUssdRequest(code,new TelephonyManager.UssdResponseCallback(){public void onReceiveUssdResponse(TelephonyManager t,String q,CharSequence x){runOnUiThread(()->result.setText("Resposta USSD:\n\n"+x));} public void onReceiveUssdResponseFailed(TelephonyManager t,String q,int f){runOnUiThread(()->result.setText("Falhou. Código Android: "+f));}},handler);}catch(Exception e){result.setText("Erro: "+e.getMessage());}}
    public void onRequestPermissionsResult(int r,String[]p,int[]g){super.onRequestPermissionsResult(r,p,g);if(r==10)loadSims();}
}
