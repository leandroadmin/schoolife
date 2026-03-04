import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    page.on('console', msg => fs.appendFileSync('console.log', `[${msg.type()}] ${msg.text()}\n`));
    page.on('pageerror', error => fs.appendFileSync('console.log', `[PAGE ERROR] ${error.message}\n${error.stack}\n`));

    await page.goto('http://localhost:5173/student/login');

    await page.evaluate(() => {
        localStorage.setItem('student_id', '1da94afe-0b1c-4628-90c8-0eaa4ec2634b');
    });

    await page.goto('http://localhost:5173/student/calendar');

    await page.waitForTimeout(3000);

    await browser.close();
    console.log('Done capturing errors.');
})();
