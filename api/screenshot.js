import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
const timeOut = 60;

export const maxDuration = timeOut;
export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  let browser = null;

  try {
    console.time('screenshot');

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=medium',
        '--force-color-profile=srgb',
        '--lang=zh-CN,zh'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: ["networkidle0"],
      timeout: timeOut * 1000
    });

    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC&display=swap');
        body,div,span,p,h1,h2,h3,h4,h5,h6{
          font-family: 'Noto Sans SC'!important;
        }
      `;
      document.head.appendChild(style);
    });

    await page.waitForFunction(() => document.fonts.ready);

    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: 100
    });

    console.timeEnd('screenshot');

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    res.send(screenshot);
  } catch (error) {

    res.status(500).json({
      error: "Error generating screenshot",
      message: error.message
    });

  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}

