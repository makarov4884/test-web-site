const urls = [
    "https://www.sooplive.co.kr/station/doon98/board/117297789",
    "https://www.sooplive.co.kr/station/wlls232/board/112576901",
    "https://www.sooplive.co.kr/station/wlls232/board/112334885"
];

async function checkUrls() {
    for (const url of urls) {
        try {
            const res = await fetch(url);
            console.log(`URL: ${url} -> Status: ${res.status} ${res.statusText}, Redirected: ${res.redirected}`);
        } catch (e) {
            console.log(`URL: ${url} -> Error: ${e.message}`);
        }
    }
}

checkUrls();
