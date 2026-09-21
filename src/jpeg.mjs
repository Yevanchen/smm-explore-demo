// Bounded structural validation, not proof of image authenticity or a full JPEG decoder.
export function jpegDimensions(base64){
  let b;try{b=Uint8Array.from(atob(base64),x=>x.charCodeAt(0));}catch{return null;}
  if(b.length<12||b[0]!==255||b[1]!==216||b.at(-2)!==255||b.at(-1)!==217)return null;
  let at=2,dimensions=null;
  while(at<b.length-2){
    if(b[at++]!==255)return null;
    while(b[at]===255)at++;
    const marker=b[at++];
    if(marker===0||marker===216||marker===217)return null;
    if(marker===1||(marker>=208&&marker<=215))continue;
    const size=(b[at]<<8)|b[at+1];
    if(size<2||at+size>b.length-2)return null;
    if([192,193,194].includes(marker)){
      if(size<8)return null;
      const height=(b[at+3]<<8)|b[at+4],width=(b[at+5]<<8)|b[at+6];
      if(!width||!height||width>2560||height>2560||width*height>4000000)return null;
      dimensions={width,height};
    }
    if(marker===218)return dimensions;
    at+=size;
  }
  return null;
}
