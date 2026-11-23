package com.trishboll.arena;
import android.content.Context;
import android.media.AudioManager;
import android.media.ToneGenerator;

/** Optional lightweight native audio; failures never interrupt the game. */
public final class GameSound {
    public static final int SELECT=0, START=1, FOOD=2, KILL=3, LOSE=4;
    private ToneGenerator synth;
    public GameSound(Context context) {
        try { synth=new ToneGenerator(AudioManager.STREAM_MUSIC,40); }
        catch(Throwable e){android.util.Log.w("TRISH_BOLL_NATIVE","Audio unavailable",e);synth=null;}
    }
    public void play(int effect) {
        try {
            if(synth==null)return;
            switch(effect){
                case SELECT:synth.startTone(ToneGenerator.TONE_PROP_BEEP,65);break;
                case START:synth.startTone(ToneGenerator.TONE_DTMF_6,140);break;
                case FOOD:synth.startTone(ToneGenerator.TONE_DTMF_8,45);break;
                case KILL:synth.startTone(ToneGenerator.TONE_DTMF_5,110);break;
                case LOSE:synth.startTone(ToneGenerator.TONE_CDMA_CALLDROP_LITE,260);break;
            }
        }catch(Throwable error){android.util.Log.w("TRISH_BOLL_NATIVE","Sound error",error);}
    }
    public void close(){try{if(synth!=null)synth.release();}catch(Throwable ignored){}synth=null;}
}
