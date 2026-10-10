const url = new URL('./', location.href); url.searchParams.set('from','nfc');
const field = document.getElementById('nfcUrl'),status = document.getElementById('nfcStatus'),writeButton = document.getElementById('writeNfc'),cancel = document.getElementById('cancelNfc');
field.value = url.href;
document.getElementById('copyNfc').onclick = async()=>{try{await navigator.clipboard.writeText(url.href);status.textContent='网址已复制。写卡时请选择 URL / 链接记录。';}catch{field.focus();field.select();status.textContent='已选中网址，请长按或使用 Ctrl+C 复制。';}};
let controller=null;
if(!('NDEFReader'in window)||!window.isSecureContext){writeButton.disabled=true;status.textContent='当前浏览器不支持网页写 NFC。请使用手机写卡工具；游戏和已写好的卡片仍可正常使用。';}
else status.textContent='准备一张可写 NFC 卡，点击按钮后按提示贴近手机。';
writeButton.onclick = async()=>{
  if(controller)return;
  controller = new AbortController();writeButton.disabled=true;cancel.hidden=false;status.textContent='请允许 NFC 权限，然后将卡片贴近手机，最多等待 30 秒。';
  const timer=setTimeout(()=>controller?.abort(),30000);
  try{const writer=new NDEFReader();await writer.write({records:[{recordType:'url',data:url.href}]},{signal:controller.signal,overwrite:document.getElementById('overwriteNfc').checked});status.textContent='写入成功！请用另一台手机碰一碰这张卡，测试游戏入口。';}
  catch(error){status.textContent=error.name==='AbortError'?'写入已取消或等待超时。':error.name==='NotAllowedError'?'权限未获允许，或卡片已有记录。请检查权限；需要覆盖时勾选覆盖选项。':'未能写入，请确认卡片可写、手机 NFC 已开启，并保持贴近。也可使用手机写卡工具。';}
  finally{clearTimeout(timer);controller=null;writeButton.disabled=false;cancel.hidden=true;}
};
cancel.onclick=()=>controller?.abort();
