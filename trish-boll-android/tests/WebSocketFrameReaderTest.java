package com.trishboll.arena;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
public class WebSocketFrameReaderTest {
  static void ok(boolean condition,String msg){if(!condition)throw new AssertionError(msg);}
  static byte[] b(String s){return s.getBytes(StandardCharsets.UTF_8);}
  static byte[] frame(int op,boolean fin,byte[] data){
    ByteArrayOutputStream o=new ByteArrayOutputStream();
    o.write(op|(fin?128:0));
    if(data.length<126){o.write(data.length);}
    else if(data.length<65536){o.write(126);o.write(data.length>>8);o.write(data.length);}
    else {o.write(127);long n=data.length;for(int i=7;i>=0;i--)o.write((int)(n>>(8*i))&255);}
    o.write(data,0,data.length);
    return o.toByteArray();
  }
  static byte[] join(byte[]... frames){ByteArrayOutputStream o=new ByteArrayOutputStream();for(byte[] f:frames)o.write(f,0,f.length);return o.toByteArray();}
  static WebSocketFrameReader reader(byte[] f){return new WebSocketFrameReader(new ByteArrayInputStream(f),null);}
  public static void main(String[] args)throws Exception{
    WebSocketFrameReader r=reader(join(frame(1,false,b("A")),frame(0,false,b("B")),frame(0,true,b("C"))));
    ok(r.next()==null,"first fragment");ok(r.next()==null,"second fragment");
    ok(Arrays.equals(r.next().data,b("ABC")),"reassembly");
    r=reader(join(frame(1,false,b("hello ")),frame(9,true,b("ping")),frame(0,true,b("world"))));
    ok(r.next()==null,"fragment pending");ok(r.next().opcode==9,"interleaved ping");
    ok(Arrays.equals(r.next().data,b("hello world")),"continuation following ping");
    byte[] big=new byte[70000];Arrays.fill(big,(byte)42);
    ok(Arrays.equals(reader(frame(1,true,big)).next().data,big),"64 bit payload");
    byte[] medium=new byte[10000];Arrays.fill(medium,(byte)88);
    ok(Arrays.equals(reader(frame(2,true,medium)).next().data,medium),"16 bit payload");
    try{reader(frame(0,true,b("stray"))).next();throw new AssertionError("must reject stray continuation");}
    catch(IOException expected){ok(true,"reject invalid continuation");}
    System.out.println("TRISH_BOLL_WEBSOCKET_FRAGMENT_TEST_PASS");
  }
}
