const https = require('https');

async function testLive() {
  console.log("1. Logging in with password to Vercel...");
  
  const loginBody = JSON.stringify({ password: "tafadmin2026" });
  
  const loginRes = await new Promise((resolve, reject) => {
    const req = https.request("https://taf-fuel-station-fuel-locator.vercel.app/api/auth/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(loginBody),
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.write(loginBody);
    req.end();
  });

  console.log("Login Status:", loginRes.status);
  console.log("Login Body:", loginRes.body);
  const setCookie = loginRes.headers['set-cookie'];
  console.log("Set-Cookie:", setCookie);

  let token = null;
  try {
    const parsed = JSON.parse(loginRes.body);
    token = parsed.token;
  } catch (e) {}

  console.log("Token in body:", token ? "YES (length " + token.length + ")" : "NO");

  const cookieHeader = setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : '';

  console.log("\n2. Calling /api/admin/overview with Cookie and Bearer...");
  const overviewRes = await new Promise((resolve, reject) => {
    const headers = {
      ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
    console.log("Request headers sent:", headers);

    const req = https.request("https://taf-fuel-station-fuel-locator.vercel.app/api/admin/overview", {
      method: "GET",
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });

  console.log("Overview Status:", overviewRes.status);
  console.log("Overview Body preview:", overviewRes.body.slice(0, 500));
}

testLive().catch(console.error);
