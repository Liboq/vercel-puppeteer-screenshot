import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
const timeOut = 60;

//  https://vercel.com/docs/functions/configuring-functions/duration
// available in  Next.js (>= 13.5 or higher), SvelteKit, Astro, Nuxt, and Remix
export const maxDuration = timeOut; // 纯vercel serverless不起作用
export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "Missing URL parameter" });
  }

  let browser = null;

  try {
    console.time("screenshot");

    // 更新 Chromium 配置
    chromium.setGraphicsMode = false; // 禁用图形模式
    
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu", // 禁用 GPU 加速
        "--disable-dev-shm-usage", // 禁用 /dev/shm 使用
        "--font-render-hinting=medium",
        "--force-color-profile=srgb",
        "--lang=zh-CN,zh",
      ],
      defaultViewport: {
        width: 1280,
        height: 720,
        deviceScaleFactor: 1,
      },
      executablePath: await chromium.executablePath(),
      headless: "new", // 使用新的 headless 模式
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: ["networkidle0"],
      timeout: timeOut * 1000,
    });

    await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC&display=swap');
        body,div,span,p,h1,h2,h3,h4,h5,h6{
          font-family: 'Noto Sans SC'!important;
        }
      `;
      document.head.appendChild(style);
    });

    await page.waitForFunction(() => document.fonts.ready);

    // 获取页面信息
    const title = (await page.title()) || "未知标题";
    const description = await page
      .$eval('meta[name="description"]', (element) =>
        element.getAttribute("content")
      )
      .catch(() => "暂无描述");
    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: 100,
      encoding: "base64",
    });

    console.timeEnd("screenshot");
    res.send({ screenshot, title, description });
  } catch (error) {
    res.status(500).json({
      error: "Error generating screenshot",
      message: error.message,
    });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
