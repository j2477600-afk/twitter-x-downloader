# Twitter / X Video Downloader for Blogger

## इसमें क्या है
- `blogger-page.html`: Blogger पेज का पूरा premium frontend.
- `server.js`: Node.js backend API.
- `Dockerfile`: yt-dlp + FFmpeg सहित backend container.
- `package.json`: Node dependencies.

## 1) Backend deploy करें
इस फोल्डर को GitHub repository में upload करें और Dockerfile-supported hosting/VPS पर deploy करें.
ऐसी hosting चुनें जो Docker, FFmpeg और yt-dlp चलाने दे. केवल static hosting पर्याप्त नहीं है.

Environment variables:
- `PORT`: hosting द्वारा दिया गया port (आमतौर पर अपने आप मिलता है).
- `ALLOWED_ORIGINS`: Blogger domain, उदाहरण `https://www.example.blogspot.com,https://example.com`.
  परीक्षण के लिए `*` रखा जा सकता है, production में अपना Blogger domain दें.
- `YTDLP_PATH`: वैकल्पिक; default `yt-dlp`.

Deploy होने के बाद `https://YOUR-BACKEND-DOMAIN/health` खोलें. जवाब `{"ok":true}` होना चाहिए.

## 2) Blogger में लगाएँ
1. Blogger Dashboard > Pages > New Page.
2. HTML view चुनें.
3. `blogger-page.html` का पूरा code paste करें.
4. इस पंक्ति में `https://YOUR-BACKEND-DOMAIN` को अपने deployed backend URL से बदलें:
   `const BACKEND_URL = "https://YOUR-BACKEND-DOMAIN";`
5. पेज Publish करें.

## महत्वपूर्ण सीमाएँ
- यह केवल सार्वजनिक X/Twitter status URLs के लिए बनाया गया है.
- Private/protected/login-only posts समर्थित नहीं हैं.
- X की उपलब्धता और yt-dlp compatibility बदल सकती है; backend को अपडेट रखना पड़ सकता है.
- Hosting provider की CPU, memory, bandwidth और execution-time सीमाएँ लागू होंगी.
- वीडियो केवल तभी डाउनलोड करें जब आप उसके मालिक हों या आपके पास स्पष्ट अनुमति/अधिकार हो. X की Terms, copyright और स्थानीय कानूनों का पालन करें.
- यह unofficial tool है; X/Twitter से संबद्ध या endorsed नहीं है.
