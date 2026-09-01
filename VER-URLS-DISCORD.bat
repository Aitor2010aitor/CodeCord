@echo off
chcp 65001 >nul
node -e "const fs=require('fs'); let url=''; try { const env=fs.readFileSync('.env','utf8'); const m=env.match(/^PANEL_URL=(.*)$/m); if(m) url=m[1].trim(); } catch(e){} if(!url) { const lines=fs.readFileSync('WEB/admin-panel.js','utf8').split('\n'); const l=lines[14]||''; const m=l.match(/'([^']+)'/); if(m) url=m[1]; } if(!url) url='localhost:22550'; if(!url.startsWith('http')) url='http://'+url; console.log('\n============================================================\n  URLs para Discord Developer Portal > OAuth2 > Redirects\n============================================================\n\n  1)  '+url+'/callback\n\n  2)  '+url+'/verify-callback\n\n============================================================\n');"
pause
